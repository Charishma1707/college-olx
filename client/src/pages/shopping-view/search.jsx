import ProductDetailsDialog from "@/components/shopping-view/product-details";
import ShoppingProductTile from "@/components/shopping-view/product-tile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-toastify";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { fetchProductDetails } from "@/store/shop/products-slice";
import {
  getSearchResults,
  multimodalSearch,
  resetSearchResults,
  resetSmartSuggest,
  smartSuggest,
} from "@/store/shop/search-slice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

function SearchProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") || "");
  const [mode, setMode] = useState("text"); // 'text' | 'image'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageHint, setImageHint] = useState("");
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const dispatch = useDispatch();
  const {
    searchResults,
    isLoading,
    searchError,
    lastQuery,
    smartSuggestCategories,
    smartSuggestLoading,
  } = useSelector((state) => state.shopSearch);
  const { productDetails } = useSelector((state) => state.shopProducts);

  const { user } = useSelector((state) => state.auth);

  const { cartItems } = useSelector((state) => state.shopCart);

  const SITUATIONAL_PATTERNS =
    /\b(feeling|going|headed|planning|weather|season|summer|winter|spring|fall|autumn|cold|hot|rainy|sunny|hiking|running|cycling|swimming|beach|gym|workout|travel|trip|outing|party|wedding|camping|skiing|snow|outdoor|indoor)\b/i;

  function isSituationalQuery(text) {
    return text && text.trim().length >= 3 && SITUATIONAL_PATTERNS.test(text.trim());
  }

  useEffect(() => {
    if (mode !== "text") return;
    const trimmed = keyword?.trim() || "";
    if (!trimmed) {
      dispatch(resetSearchResults());
      dispatch(resetSmartSuggest());
      return;
    }
    if (trimmed.length < 2) return;

    const timer = setTimeout(() => {
      setSearchParams(new URLSearchParams(`?keyword=${trimmed}`));
      if (isSituationalQuery(trimmed)) {
        dispatch(resetSearchResults());
        dispatch(smartSuggest(trimmed));
      } else {
        dispatch(resetSmartSuggest());
        dispatch(getSearchResults(trimmed));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, mode, dispatch]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function handleRunImageSearch() {
    if (!imageFile) {
      toast.error("Please upload an image first");
      return;
    }

    dispatch(multimodalSearch({ imageFile, textQuery: imageHint }));
  }

  function handleAddtoCart(getCurrentProductId, getTotalStock) {
    let getCartItems = cartItems.items || [];

    if (getCartItems.length) {
      const indexOfCurrentItem = getCartItems.findIndex(
        (item) => item.productId === getCurrentProductId
      );
      if (indexOfCurrentItem > -1) {
        const getQuantity = getCartItems[indexOfCurrentItem].quantity;
        if (getQuantity + 1 > getTotalStock) {
          toast.error( `Only ${getQuantity} quantity can be added for this item`);

          return;
        }
      }
    }

    dispatch(
      addToCart({
        userId: user?.id,
        productId: getCurrentProductId,
        quantity: 1,
      })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchCartItems(user?.id));
        toast.success( "Product is added to cart");
      }
    });
  }

  function handleGetProductDetails(getCurrentProductId) {
    dispatch(fetchProductDetails(getCurrentProductId));
  }

  const CATEGORY_ICONS = {
    sweaters: "🧥",
    jackets: "🧥",
    coat: "🧥",
    gloves: "🧤",
    thermals: "🔥",
    "hiking boots": "👟",
    boots: "👟",
    shoes: "👟",
    sandals: "👡",
    swimwear: "👙",
    sunscreen: "🧴",
    sunglasses: "🕶️",
    "beach towel": "🏖️",
    towel: "🏖️",
  };
  function getCategoryIcon(cat) {
    return CATEGORY_ICONS[cat] || "✨";
  }
  function formatCategoryLabel(cat) {
    return cat
      .split(/[\s_-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  function handleChipClick(category) {
    setKeyword(category);
    setSearchParams(new URLSearchParams(`?keyword=${category}`));
  }

  useEffect(() => {
    if (productDetails !== null) setOpenDetailsDialog(true);
  }, [productDetails]);

  return (
    <div className="container mx-auto md:px-6 px-4 py-10 min-h-screen">
      <div className="max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl font-bold text-center mb-6 text-foreground">Search Products</h1>

        <div className="flex justify-center gap-3 mb-6">
          <Button
            type="button"
            variant={mode === "text" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => {
              setMode("text");
              setImageFile(null);
              dispatch(resetSearchResults());
            }}
          >
            Search by Text
          </Button>
          <Button
            type="button"
            variant={mode === "image" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => {
              setMode("image");
              setKeyword("");
              setImageHint("");
              setSearchParams(new URLSearchParams());
              dispatch(resetSearchResults());
            }}
          >
            Search by Image
          </Button>
        </div>

        <div className="relative">
          {mode === "text" ? (
            <Input
              value={keyword}
              name="keyword"
              onChange={(event) => setKeyword(event.target.value)}
              className="py-6 pl-5 pr-12 text-lg rounded-xl border-2 search-input-glow focus:border-primary transition-colors shadow-sm"
              placeholder="Search by feel, occasion or description..."
            />
          ) : (
            <Card className="rounded-2xl border-2 border-dashed bg-white/70">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-foreground">Upload a product image</p>
                      <p className="text-sm text-muted-foreground">We’ll find visually similar products</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Input
                    value={imageHint}
                    onChange={(e) => setImageHint(e.target.value)}
                    className="rounded-xl"
                    placeholder="Optional text hint (e.g. red sneakers, leather watch)"
                  />

                  {imagePreview ? (
                    <div className="rounded-xl overflow-hidden border bg-muted/10">
                      <img
                        src={imagePreview}
                        alt="Uploaded search"
                        className="w-full h-[220px] object-cover"
                      />
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    className="rounded-xl font-semibold"
                    onClick={handleRunImageSearch}
                    disabled={isLoading}
                  >
                    {isLoading ? "Searching..." : "Search with Image"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {mode === "text" ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {searchResults.length > 0 ? `${searchResults.length} results` : ""}
            </span>
          ) : null}
        </div>

        {mode === "text" && (smartSuggestCategories.length > 0 || smartSuggestLoading) ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              ✨ AI suggestions based on your mood
            </p>
            <div className="flex flex-wrap gap-2">
              {smartSuggestLoading ? (
                <span className="text-sm text-muted-foreground">Loading suggestions...</span>
              ) : (
                smartSuggestCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleChipClick(cat)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>{getCategoryIcon(cat)}</span>
                    <span>{formatCategoryLabel(cat)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      {mode === "text" && !keyword.trim() ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Type at least 2 characters to search</p>
          <p className="text-sm mt-2">Search by product name, brand, or category</p>
          <p className="text-sm mt-2">Try situational queries like &quot;feeling cold and going hiking&quot;</p>
        </div>
      ) : smartSuggestLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">✨ Getting AI suggestions...</p>
        </div>
      ) : searchError ? (
        <div className="text-center py-16 bg-muted/50 rounded-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Search failed</h2>
          <p className="text-muted-foreground">Please try again.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Searching for &quot;{lastQuery || keyword.trim() || "..."}&quot;...</p>
        </div>
      ) : smartSuggestCategories.length > 0 && !searchResults.length ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl">
          <p className="text-muted-foreground">Choose a category above to browse products</p>
        </div>
      ) : !searchResults.length ? (
        <div className="text-center py-16 bg-muted/50 rounded-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-2">No products found for &quot;{lastQuery || keyword.trim() || "..."}&quot;</h2>
          <p className="text-muted-foreground">Try different keywords.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {searchResults.map((item) => (
          <ShoppingProductTile
            key={item._id}
            handleAddtoCart={handleAddtoCart}
            product={item}
            handleGetProductDetails={handleGetProductDetails}
          />
        ))}
      </div>
      )}
      <ProductDetailsDialog
        open={openDetailsDialog}
        setOpen={setOpenDetailsDialog}
        productDetails={productDetails}
      />
    </div>
  );
}

export default SearchProducts;