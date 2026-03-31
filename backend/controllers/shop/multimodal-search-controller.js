const Product = require("../../models/Product");

/** Cached CLIP model instances (loaded once per process) */
let processor = null;
let visionModel = null;
let tokenizer = null;
let textModel = null;

async function loadClipModels() {
  if (processor && visionModel && tokenizer && textModel) {
    return { processor, visionModel, tokenizer, textModel };
  }

  const {
    AutoProcessor,
    CLIPVisionModelWithProjection,
    AutoTokenizer,
    CLIPTextModelWithProjection,
  } = await import("@xenova/transformers");

  processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32");
  visionModel = await CLIPVisionModelWithProjection.from_pretrained(
    "Xenova/clip-vit-base-patch32"
  );
  tokenizer = await AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch32");
  textModel = await CLIPTextModelWithProjection.from_pretrained(
    "Xenova/clip-vit-base-patch32"
  );

  return { processor, visionModel, tokenizer, textModel };
}

/**
 * Preprocess text query for CLIP (works best under 77 tokens ~50 words).
 * - Remove extra spaces, trim
 * - Remove special chars except letters, numbers, spaces
 * - Limit to max 50 words
 */
function preprocessQueryForClip(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") return "";
  let cleaned = rawQuery
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, "");
  const words = cleaned.split(/\s+/).filter(Boolean);
  const limited = words.slice(0, 50).join(" ");
  return limited;
}

async function getTextEmbedding(textQuery) {
  const cleanedQuery = preprocessQueryForClip(textQuery);
  console.log("[multimodal-search] CLIP text query (cleaned):", cleanedQuery);
  const { tokenizer, textModel } = await loadClipModels();
  const textInputs = tokenizer([cleanedQuery], { padding: true, truncation: true });
  const { text_embeds } = await textModel(textInputs);
  return Array.from(text_embeds.data);
}

async function getImageEmbeddingFromBuffer(buffer, mimetype) {
  const { RawImage } = await import("@xenova/transformers");
  const { processor, visionModel } = await loadClipModels();

  const blob = new Blob([buffer], { type: mimetype });
  const image = await RawImage.fromBlob(blob);
  const imageInputs = await processor(image);
  const { image_embeds } = await visionModel(imageInputs);
  return Array.from(image_embeds.data);
}

const multimodalSearch = async (req, res) => {
  try {
    const textQueryRaw = req.body?.textQuery;
    const textQuery =
      typeof textQueryRaw === "string" ? textQueryRaw.trim() : undefined;
    const imageFile = req.file;

    if ((!textQuery || textQuery.length === 0) && !imageFile) {
      return res.status(400).json({
        success: false,
        message: "Please provide either textQuery in the request body or an image file upload named 'image'",
      });
    }

    await loadClipModels();

    const hasText = Boolean(textQuery && textQuery.length > 0);
    const hasImage = Boolean(imageFile);

    let queryVector;

    if (hasText && hasImage) {
      const [textVec, imageVec] = await Promise.all([
        getTextEmbedding(textQuery),
        getImageEmbeddingFromBuffer(imageFile.buffer, imageFile.mimetype),
      ]);

      const dim = Math.min(textVec.length, imageVec.length);
      queryVector = new Array(dim);
      for (let i = 0; i < dim; i++) {
        queryVector[i] = (textVec[i] + imageVec[i]) / 2;
      }
    } else if (hasText) {
      queryVector = await getTextEmbedding(textQuery);
    } else {
      queryVector = await getImageEmbeddingFromBuffer(
        imageFile.buffer,
        imageFile.mimetype
      );
    }

    let results = [];

    const vectorIds = new Set();

    try {
      // MongoDB Atlas Vector Search (requires vector index + product embeddings)
      const vectorResults = await Product.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector,
            numCandidates: 200,
            limit: 12,
          },
        },
        { $project: { embedding: 0 } },
      ]);
      results = vectorResults;
      vectorResults.forEach((r) => vectorIds.add(String(r._id)));
    } catch (vectorErr) {
      console.log("Vector search fallback:", vectorErr.message);
    }

    // Word-based regex search: always run when we have text (merge with vector or use as fallback)
    function runWordBasedSearch(text) {
      const stopWords = [
        "for", "the", "a", "an", "and", "or", "in", "with", "to", "of", "i", "my", "me",
      ];
      const words = text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.includes(w));
      if (words.length === 0) return [];

      const wordRegexes = words.map((w) => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      const orConditions = wordRegexes.flatMap((r) => [
        { title: r },
        { description: r },
        { category: r },
        { brand: r },
      ]);

      return Product.find({ $or: orConditions })
        .limit(30)
        .select("-embedding")
        .lean();
    }

    if (hasText) {
      const regexResults = await runWordBasedSearch(textQuery);
      // Score by number of matching words (higher = better)
      const wordScores = regexResults.map((doc) => {
        const stopWords = ["for", "the", "a", "an", "and", "or", "in", "with", "to", "of", "i", "my", "me"];
        const words = textQuery
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.includes(w));
        const text = [doc.title, doc.description, doc.category, doc.brand].filter(Boolean).join(" ").toLowerCase();
        const matchCount = words.filter((w) => text.includes(w)).length;
        return { doc, matchCount };
      });
      wordScores.sort((a, b) => b.matchCount - a.matchCount);
      const sortedRegexResults = wordScores.map((x) => x.doc).slice(0, 20);

      // Merge: vector results first, then regex results (dedupe by _id)
      const seen = new Set(vectorIds);
      const merged = [...results];
      for (const doc of sortedRegexResults) {
        const id = String(doc._id);
        if (!seen.has(id)) {
          seen.add(id);
          merged.push(doc);
        }
      }
      results = merged;
    } else if (results.length === 0) {
      // Image-only fallback when no vector results
      results = await Product.find({})
        .limit(12)
        .select("-embedding")
        .lean();
    }

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (err) {
    console.error("Multimodal search error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Multimodal search failed",
    });
  }
};

module.exports = { multimodalSearch };
