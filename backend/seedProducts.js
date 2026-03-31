/**
 * Seed script - Adds 100 dummy products + banners to MongoDB
 * Run: node seedProducts.js (from backend folder)
 * Note: Clears existing products and replaces with fresh 100
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Feature = require("./models/Feature");

const IMAGES = {
  footwear: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop",
  ],
  men: [
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
  ],
  women: [
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=400&fit=crop",
  ],
  kids: [
    "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&h=400&fit=crop",
  ],
  accessories: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1617038260897-2b9901334e3e?w=400&h=400&fit=crop",
  ],
};

const PRODUCT_TEMPLATES = [
  { category: "footwear", brand: "nike", titles: ["Air Max", "Pegasus", "Revolution", "Court", "Blazer", "Dunk", "Air Force", "Zoom"], basePrice: 89 },
  { category: "footwear", brand: "adidas", titles: ["Ultraboost", "Stan Smith", "Superstar", "NMD", "Gazelle", "Samba", "Terrex"], basePrice: 95 },
  { category: "footwear", brand: "puma", titles: ["RS-X", "Suede", "Clyde", "Basket", "Carina", "Future"], basePrice: 75 },
  { category: "men", brand: "nike", titles: ["Dri-FIT Shirt", "Sport Jersey", "Training Shorts", "Joggers", "Hoodie"], basePrice: 45 },
  { category: "men", brand: "adidas", titles: ["Trefoil Tee", "Essentials Hoodie", "Training Pants", "Track Jacket"], basePrice: 50 },
  { category: "men", brand: "levi", titles: ["501 Jeans", "511 Slim", " Trucker Jacket", "Chino Pants"], basePrice: 79 },
  { category: "men", brand: "puma", titles: ["Sports Tee", "Training Shorts", "Fleece Hoodie"], basePrice: 35 },
  { category: "men", brand: "h&m", titles: ["Basic Tee", "Chinos", "Sweater", "Shirt"], basePrice: 29 },
  { category: "women", brand: "zara", titles: ["Summer Dress", "Blouse", "Skirt", "Blazer", "Trousers"], basePrice: 49 },
  { category: "women", brand: "adidas", titles: ["Sports Bra", "Leggings", "Track Jacket", "Tank Top"], basePrice: 44 },
  { category: "women", brand: "h&m", titles: ["Midi Dress", "Cardigan", "Jeans", "Top"], basePrice: 34 },
  { category: "kids", brand: "nike", titles: ["Kids Sneakers", "Sports Tee", "Shorts", "Hoodie"], basePrice: 39 },
  { category: "kids", brand: "adidas", titles: ["Youth Shoes", "Track Suit", "T-Shirt"], basePrice: 42 },
  { category: "accessories", brand: "zara", titles: ["Leather Watch", "Handbag", "Belt", "Sunglasses", "Scarf"], basePrice: 59 },
  { category: "accessories", brand: "levi", titles: ["Canvas Belt", "Cap", "Wallet"], basePrice: 35 },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateProducts(count) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const t = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    const title = t.titles[i % t.titles.length];
    const price = t.basePrice + Math.floor(Math.random() * 80);
    const hasSale = Math.random() > 0.4;
    const salePrice = hasSale ? Math.round(price * (0.7 + Math.random() * 0.2) * 100) / 100 : 0;
    const brandName = t.brand === "h&m" ? "H&M" : t.brand.charAt(0).toUpperCase() + t.brand.slice(1);
    products.push({
      image: pick(IMAGES[t.category] || IMAGES.men),
      title: `${brandName} ${title}${i > 20 ? ` #${i + 1}` : ""}`.trim(),
      description: `High quality ${title.toLowerCase()}. Comfortable, stylish, and durable. Perfect for everyday wear.`,
      category: t.category,
      brand: t.brand,
      price,
      salePrice,
      totalStock: 20 + Math.floor(Math.random() * 80),
      averageReview: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    });
  }
  return products;
}

const featureBanners = [
  { image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop" },
  { image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=600&fit=crop" },
  { image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=600&fit=crop" },
  { image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&h=600&fit=crop" },
  { image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=600&fit=crop" },
];

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    const dummyProducts = generateProducts(100);

    await Product.deleteMany({});
    await Product.insertMany(dummyProducts);
    console.log(`✅ Added ${dummyProducts.length} products!`);

    const featureCount = await Feature.countDocuments();
    if (featureCount === 0) {
      await Feature.insertMany(featureBanners);
      console.log(`✅ Added ${featureBanners.length} banner images!`);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

seedProducts();
