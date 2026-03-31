const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    image: String,
    title: String,
    description: String,
    category: String,
    brand: String,
    price: Number,
    salePrice: Number,
    totalStock: Number,
    averageReview: Number,
    /** CLIP embedding for multimodal semantic search (512 dimensions) */
    embedding: [Number],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);