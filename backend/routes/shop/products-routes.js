const express = require("express");

const {
  getFilteredProducts,
  getProductDetails,
} = require("../../controllers/shop/products-controller");
const { multimodalSearch } = require("../../controllers/shop/multimodal-search-controller");
const { upload } = require("../../helpers/cloudinary");

const router = express.Router();

router.get("/get", getFilteredProducts);
router.get("/get/:id", getProductDetails);

// Multimodal semantic search: accepts textQuery (JSON body) OR image file (multipart)
router.post(
  "/multimodal-search",
  (req, res, next) => {
    if (req.is("multipart/form-data")) {
      return upload.single("image")(req, res, next);
    }
    next();
  },
  multimodalSearch
);

module.exports = router;