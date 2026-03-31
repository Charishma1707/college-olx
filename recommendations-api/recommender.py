from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
from pymongo.database import Database


@dataclass
class ProductInfo:
    id: str
    name: str
    price: float
    image: str | None


class RecommendationEngine:
    """
    Item-based collaborative filtering using cosine similarity.

    - Build a user-product purchase matrix from orders
    - Compute product-product cosine similarity
    - Recommend based on items a user purchased
    - Fallback to bestsellers for cold-start users
    """

    def __init__(self, db: Database):
        self.db = db
        self._lock = threading.RLock()

        # cached artifacts
        self.product_ids: List[str] = []
        self.user_ids: List[str] = []
        self.product_index: Dict[str, int] = {}
        self.user_index: Dict[str, int] = {}
        self.similarity: np.ndarray | None = None
        self.bestsellers: List[ProductInfo] = []

    def refresh(self) -> None:
        """Rebuild similarity cache and bestseller list."""
        with self._lock:
            orders = list(
                self.db["orders"].find(
                    {}, {"userId": 1, "cartItems.productId": 1, "cartItems.quantity": 1}
                )
            )

            # Build user-product matrix from cartItems
            user_set = set()
            product_set = set()

            # We'll first collect interactions in a dict to aggregate duplicates
            interactions: Dict[Tuple[str, str], float] = {}
            for order in orders:
                uid = order.get("userId")
                if not uid:
                    continue
                items = order.get("cartItems") or []
                for it in items:
                    pid = it.get("productId")
                    qty = it.get("quantity") or 0
                    if not pid or qty <= 0:
                        continue
                    user_set.add(uid)
                    product_set.add(pid)
                    interactions[(uid, pid)] = interactions.get((uid, pid), 0.0) + float(qty)

            self.user_ids = sorted(user_set)
            self.product_ids = sorted(product_set)
            self.user_index = {u: i for i, u in enumerate(self.user_ids)}
            self.product_index = {p: i for i, p in enumerate(self.product_ids)}

            if not self.user_ids or not self.product_ids:
                self.similarity = None
                self.bestsellers = self._compute_bestsellers(limit=5)
                return

            # Dense matrix is fine for small/medium datasets (and avoids heavy deps)
            mat = np.zeros((len(self.user_ids), len(self.product_ids)), dtype=np.float32)
            for (uid, pid), qty in interactions.items():
                mat[self.user_index[uid], self.product_index[pid]] = qty

            # Item-item cosine similarity
            item_user = mat.T  # (n_products, n_users)
            norms = np.linalg.norm(item_user, axis=1, keepdims=True) + 1e-12
            item_user_norm = item_user / norms
            sim = item_user_norm @ item_user_norm.T
            np.fill_diagonal(sim, 0.0)
            self.similarity = sim.astype(np.float32)

            self.bestsellers = self._compute_bestsellers(limit=5)

    def recommend(self, user_id: str, limit: int = 5) -> Tuple[List[ProductInfo], str]:
        """Return list of recommended products for a user."""
        with self._lock:
            if self.similarity is None or user_id not in self.user_index:
                return self.bestsellers[:limit], "bestsellers"

            # Find products purchased by this user (from orders, to be safe)
            purchased = set()
            cursor = self.db["orders"].find(
                {"userId": user_id},
                {"cartItems.productId": 1},
            )
            for order in cursor:
                for it in order.get("cartItems") or []:
                    pid = it.get("productId")
                    if pid:
                        purchased.add(pid)

            if not purchased:
                return self.bestsellers[:limit], "bestsellers"

            purchased_idx = [self.product_index[p] for p in purchased if p in self.product_index]
            if not purchased_idx:
                return self.bestsellers[:limit], "bestsellers"

            # Score candidates by sum of similarities to purchased items
            scores = self.similarity[purchased_idx].sum(axis=0)
            for p in purchased:
                if p in self.product_index:
                    scores[self.product_index[p]] = -1e9  # exclude already purchased

            top_idx = np.argsort(-scores)[: limit * 3]
            candidate_ids = [self.product_ids[i] for i in top_idx if scores[i] > -1e8]

            # Fetch product docs
            products = self._fetch_products(candidate_ids, limit=limit)
            if not products:
                return self.bestsellers[:limit], "bestsellers"
            return products[:limit], "collab"

    def _fetch_products(self, ids: List[str], limit: int = 5) -> List[ProductInfo]:
        if not ids:
            return []

        obj_ids = [self._to_object_id(x) for x in ids]
        obj_ids = [x for x in obj_ids if x is not None]
        if not obj_ids:
            return []

        docs = list(
            self.db["products"].find(
                {"_id": {"$in": obj_ids}},
                {"title": 1, "price": 1, "salePrice": 1, "image": 1},
            )
        )

        # preserve requested order
        doc_map = {str(d["_id"]): d for d in docs if d.get("_id")}
        out: List[ProductInfo] = []
        for pid in ids:
            d = doc_map.get(pid)
            if not d:
                continue
            price = float(d.get("salePrice") or d.get("price") or 0.0)
            out.append(ProductInfo(id=pid, name=d.get("title") or "Product", price=price, image=d.get("image")))
            if len(out) >= limit:
                break
        return out

    def _compute_bestsellers(self, limit: int = 5) -> List[ProductInfo]:
        pipeline = [
            {"$unwind": "$cartItems"},
            {
                "$group": {
                    "_id": "$cartItems.productId",
                    "qty": {"$sum": "$cartItems.quantity"},
                }
            },
            {"$sort": {"qty": -1}},
            {"$limit": limit * 4},
        ]
        rows = list(self.db["orders"].aggregate(pipeline))
        ids = [r["_id"] for r in rows if r.get("_id")]
        return self._fetch_products(ids, limit=limit)

    def _to_object_id(self, value: str):
        # Orders store productId as string; products _id is ObjectId.
        from bson import ObjectId

        try:
            return ObjectId(value)
        except Exception:
            return None

