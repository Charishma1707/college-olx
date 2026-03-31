## Recommendations API (FastAPI)

### What it does
- `POST /api/recommendations` `{ "user_id": "..." }`
- Item-based collaborative filtering using cosine similarity on product co-purchases
- Returns top 5 recommended products
- Fallback: bestsellers for new users / no history
- Cache rebuilt on startup and refreshed every 24h

### Setup

```bash
cd recommendations-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Run

```bash
uvicorn api:app --reload --port 8000
```

It reads `MONGO_URL` from:
- `recommendations-api/.env` (recommended) or
- `backend/.env`

