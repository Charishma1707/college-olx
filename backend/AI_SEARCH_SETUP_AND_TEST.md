# AI Multimodal Search - Setup & Testing Guide

## Overview

The AI search lets you find products using **text** (e.g. "red sneakers") or by **uploading an image** (e.g. a photo of shoes you like).

---

## Step 1: Install Dependencies (if not done)

```bash
cd backend
npm install @xenova/transformers
```

---

## Step 2: Seed Dummy Products

```bash
cd backend
npm run seed:products
```

This adds 10 products + 3 banner images. Run once. If you already have products, it will skip.

---

## Step 3: Generate AI Embeddings (seedAiVectors)

This downloads the CLIP model and generates 512-dim vectors for each product image.

```bash
cd backend
npm run seed:vectors
```

**First run takes 5-10 minutes** (model download). You'll see:
- `Loading Xenova/clip-vit-base-patch32...`
- `Processing: Product Name` for each product
- `Saved embedding (512 dimensions)`

---

## Step 4: Create MongoDB Vector Index

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster → **Search** tab → **Create Search Index**
3. Choose **JSON Editor**
4. Name: **vector_index**
5. Database: your DB (e.g. `ecommerce`), Collection: **products**
6. Paste:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 512,
      "similarity": "cosine"
    }
  ]
}
```

7. Click **Create** (index may take a few minutes to build)

---

## Step 5: How to Test if AI Search is Working

### Option A: Postman (Text Search)

1. **POST** `http://localhost:5000/api/shop/products/multimodal-search`
2. Headers: `Content-Type: application/json`
3. Body (raw JSON):

```json
{
  "textQuery": "red running shoes"
}
```

4. You should get `{ "success": true, "data": [...], "count": 5 }` with top 5 matching products.

### Option B: Postman (Image Search)

1. **POST** `http://localhost:5000/api/shop/products/multimodal-search`
2. Body: **form-data**
3. Key: `image` (type: File)
4. Value: choose an image file (e.g. sneakers.jpg)
5. Send. You should get products similar to the image.

### Option C: cURL (Text)

```bash
curl -X POST http://localhost:5000/api/shop/products/multimodal-search \
  -H "Content-Type: application/json" \
  -d "{\"textQuery\": \"leather watch\"}"
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `"vector_index" not found` | Create the index in Atlas (Step 4). Wait for it to finish building. |
| `No products returned` | Run `npm run seed:vectors` to add embeddings to products. |
| `Authentication failed` | Check your MONGO_URL in `.env`. |
| Model download fails | Ensure stable internet. The model is ~150MB. |

---

## Summary Checklist

- [ ] `npm run seed:products` - Add products
- [ ] `npm run seed:vectors` - Add embeddings (run once, takes ~10 min first time)
- [ ] Create `vector_index` in MongoDB Atlas
- [ ] Start backend: `npm run dev`
- [ ] Test: POST with `textQuery` or `image` to `/api/shop/products/multimodal-search`
