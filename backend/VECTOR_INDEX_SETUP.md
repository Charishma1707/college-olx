# MongoDB Atlas Vector Search Index Setup

For the multimodal semantic search to work, you must create a vector search index on your `products` collection in MongoDB Atlas.

## Create the Index

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Your Cluster → **Search** tab
2. Click **Create Search Index**
3. Choose **JSON Editor** and paste:

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

4. Name the index: **vector_index**
5. Select your database and the **products** collection
6. Click **Create**

## Notes

- Run `node seedAiVectors.js` **before** using multimodal search
- The CLIP model outputs 512-dimensional embeddings
- Ensure products have been seeded with embeddings (run the seed script first)
