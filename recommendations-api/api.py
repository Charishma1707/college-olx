import asyncio
import json
import os
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pymongo import MongoClient
from sse_starlette.sse import EventSourceResponse

from models import RecommendationsRequest, RecommendationsResponse, ProductOut, SmartSuggestRequest, SmartSuggestResponse
from recommender import RecommendationEngine


load_dotenv()  # loads .env from CWD if present

MONGO_URL = os.getenv("MONGO_URL")
backend_env = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
if not MONGO_URL:
    # allow reuse of backend/.env in repo root
    backend_env = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
        MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL not set. Add it to recommendations-api/.env or backend/.env")

if os.path.exists(backend_env):
    load_dotenv(backend_env)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
STORE_NAME = os.getenv("STORE_NAME", "ShopHub")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")


app = FastAPI(title="Recommendations API")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(MONGO_URL)
# Use explicit db name if URL has no database (e.g. ends with /)
try:
    db = client.get_default_database()
except Exception:
    db = client.get_database(os.getenv("MONGO_DB", "test"))
engine = RecommendationEngine(db)


def refresh_cache():
    engine.refresh()


@app.on_event("startup")
def on_startup():
    refresh_cache()
    # Lightweight 24h refresh loop (avoids extra deps)
    import threading

    def loop():
        refresh_cache()
        threading.Timer(24 * 60 * 60, loop).start()

    threading.Timer(24 * 60 * 60, loop).start()


def _fetch_product_catalog() -> List[dict]:
    """Fetch all products for the AI assistant catalog."""
    products = list(
        db["products"].find(
            {},
            {"_id": 1, "title": 1, "description": 1, "price": 1, "salePrice": 1, "category": 1, "brand": 1},
        )
    )
    out = []
    for p in products:
        pid = str(p["_id"])
        name = p.get("title") or p.get("name") or "Unknown"
        desc = (p.get("description") or "")[:200]
        price = p.get("salePrice") if p.get("salePrice", 0) > 0 else p.get("price", 0)
        cat = p.get("category", "")
        brand = p.get("brand", "")
        out.append({
            "id": pid,
            "name": name,
            "description": desc,
            "price": float(price or 0),
            "category": cat,
            "brand": brand,
        })
    return out


@app.post("/api/chat")
async def chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    messages: List[dict] = body.get("messages") or []
    user_id = body.get("userId") or ""

    if not messages:
        raise HTTPException(status_code=400, detail="messages is required")

    messages = messages[-10:]

    catalog = _fetch_product_catalog()
    catalog_str = json.dumps(catalog, indent=2) if catalog else "[]"
    system_prompt = f"""You are a helpful shopping assistant for {STORE_NAME}.
Here is our product catalog (id, name, description, price, category, brand):
{catalog_str}
Help users find products, answer questions about items, suggest combinations. Be concise and friendly.
When suggesting products, mention product id or name when relevant."""

    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    from anthropic import Anthropic

    api_client = Anthropic(api_key=ANTHROPIC_API_KEY)

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _run_stream():
        try:
            with api_client.messages.stream(
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
                model=CLAUDE_MODEL,
            ) as stream:
                for text in stream.text_stream:
                    asyncio.run_coroutine_threadsafe(queue.put(("text", text)), loop).result()
            asyncio.run_coroutine_threadsafe(queue.put((None, None)), loop).result()
        except Exception as e:
            asyncio.run_coroutine_threadsafe(queue.put(("error", str(e))), loop).result()

    import threading
    t = threading.Thread(target=_run_stream)
    t.start()

    async def event_generator():
        try:
            while True:
                kind, val = await asyncio.wait_for(queue.get(), timeout=120.0)
                if kind is None:
                    break
                if kind == "error":
                    yield {"data": json.dumps({"type": "error", "content": val})}
                    break
                yield {"data": json.dumps({"type": "text", "content": val})}
        except asyncio.TimeoutError:
            yield {"data": json.dumps({"type": "error", "content": "Stream timeout"})}
        finally:
            t.join(timeout=1.0)

    return EventSourceResponse(event_generator())


@app.post("/api/smart-suggest", response_model=SmartSuggestResponse)
async def smart_suggest(payload: SmartSuggestRequest):
    """Given a situational query (feeling, activity, weather), return product category keywords."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    from anthropic import Anthropic

    system_prompt = """You are a shopping assistant. Given a user's feeling, situation, or activity, return ONLY a valid JSON array of 4-6 product category keywords they would need.
Example input: 'going to beach'
Example output: ["swimwear","sunscreen","sandals","sunglasses","beach towel"]
Example input: 'feeling cold and going hiking'
Example output: ["jackets","thermals","gloves","hiking boots","sweaters"]
Return only the JSON array, no other text. Use lowercase keywords. Prefer generic category terms that match clothing/accessories (e.g. sweaters, jackets, gloves, shoes, sandals)."""

    api_client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = api_client.messages.create(
        max_tokens=256,
        system=system_prompt,
        messages=[{"role": "user", "content": payload.query}],
        model=CLAUDE_MODEL,
    )
    text = response.content[0].text if response.content else "[]"
    text = text.strip()
    # Extract JSON array (handle markdown code blocks)
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if len(lines) > 2 else "[]"
    try:
        categories = json.loads(text)
        if not isinstance(categories, list):
            categories = []
        categories = [str(c).lower().strip() for c in categories if c][:6]
    except json.JSONDecodeError:
        categories = []
    return SmartSuggestResponse(categories=categories)


@app.post("/api/recommendations", response_model=RecommendationsResponse)
def recommendations(payload: RecommendationsRequest):
    user_id = payload.user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    items, source = engine.recommend(user_id, limit=5)
    return RecommendationsResponse(
        user_id=user_id,
        source=source,
        recommendations=[
            ProductOut(id=i.id, name=i.name, price=i.price, image=i.image) for i in items
        ],
    )


@app.get("/api/health")
def health():
    return {"ok": True}

