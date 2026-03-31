/**
 * Multimodal Semantic Search - Database Seed Script
 * Generates CLIP embeddings for products without them and saves to MongoDB.
 *
 * Run: node seedAiVectors.js (from backend folder)
 * Prerequisite: npm install @xenova/transformers
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

async function seedAiVectors() {
  try {
    // Connect to MongoDB using .env
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    // Load @xenova/transformers and initialize CLIP model (ESM)
    console.log("⏳ Loading Xenova/clip-vit-base-patch32 model (this may take a few minutes on first run)...");
    const { AutoProcessor, CLIPVisionModelWithProjection, RawImage } =
      await import("@xenova/transformers");

    const processor = await AutoProcessor.from_pretrained("Xenova/clip-vit-base-patch32");
    const visionModel = await CLIPVisionModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch32"
    );
    console.log("✅ CLIP model loaded");

    // Find all products that do NOT have an embedding field
    const productsWithoutEmbedding = await Product.find({
      $or: [{ embedding: { $exists: false } }, { embedding: null }],
    });

    console.log(`📦 Found ${productsWithoutEmbedding.length} products without embeddings`);

    if (productsWithoutEmbedding.length === 0) {
      console.log("✅ All products already have embeddings. Nothing to do.");
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < productsWithoutEmbedding.length; i++) {
      const product = productsWithoutEmbedding[i];
      const productNum = i + 1;

      try {
        // Skip if no image URL
        if (!product.image || typeof product.image !== "string") {
          console.log(
            `⏭️  [${productNum}/${productsWithoutEmbedding.length}] Skipping product "${product.title || product._id}" - no image URL`
          );
          skipCount++;
          continue;
        }

        console.log(
          `🔄 [${productNum}/${productsWithoutEmbedding.length}] Processing: ${product.title || product._id}`
        );

        // Fetch image using the Cloudinary URL stored in the document
        let image;
        try {
          image = await RawImage.read(product.image);
        } catch (imgError) {
          console.log(
            `   ❌ Broken image URL for "${product.title || product._id}": ${imgError.message}`
          );
          skipCount++;
          continue;
        }

        // Pass image through CLIP model to generate vector embedding
        const imageInputs = await processor(image);
        const { image_embeds } = await visionModel(imageInputs);

        // Extract flat array of numbers (the vector embedding)
        const embedding = Array.from(image_embeds.data);

        // Save embedding to product document
        product.embedding = embedding;
        await product.save();

        successCount++;
        console.log(`   ✅ Saved embedding (${embedding.length} dimensions)`);
      } catch (err) {
        console.log(
          `   ❌ Error processing "${product.title || product._id}": ${err.message}`
        );
        skipCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log("✅ Seed complete!");
  } catch (err) {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

seedAiVectors();
