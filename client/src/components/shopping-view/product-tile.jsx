import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { brandOptionsMap, categoryOptionsMap } from "@/config";
import { Badge } from "../ui/badge";

function ShoppingProductTile({
  product,
  handleGetProductDetails,
  handleAddtoCart,
}) {
  return (
    <Card className="w-full max-w-sm mx-auto product-card overflow-hidden border-0 shadow-md hover:shadow-xl rounded-xl bg-white">
      <div onClick={() => handleGetProductDetails(product?._id)} className="cursor-pointer">
        <div className="relative overflow-hidden group">
          <img
            src={product?.image}
            alt={product?.title}
            className="w-full h-[280px] object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
          {product?.totalStock === 0 ? (
            <Badge className="absolute top-3 left-3 bg-red-500/95 text-white font-medium shadow-lg">
              Out Of Stock
            </Badge>
          ) : product?.totalStock < 10 ? (
            <Badge className="absolute top-3 left-3 bg-amber-500/95 text-white font-medium shadow-lg">
              {`Only ${product?.totalStock} left`}
            </Badge>
          ) : product?.salePrice > 0 && product?.salePrice < product?.price ? (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-semibold shadow-lg">
              Sale
            </Badge>
          ) : null}
        </div>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold mb-2 line-clamp-2 text-foreground">{product?.title}</h2>
          <div className="flex justify-between items-center mb-3 text-sm text-muted-foreground">
            <span>{categoryOptionsMap[product?.category]}</span>
            <span className="font-medium">{brandOptionsMap[product?.brand]}</span>
          </div>
          <div className="flex items-center gap-2">
            {product?.salePrice > 0 && product?.salePrice < product?.price ? (
              <>
                <span className="text-xl font-bold text-primary">${product?.salePrice}</span>
                <span className="text-sm text-muted-foreground line-through">${product?.price}</span>
              </>
            ) : (
              <span className="text-xl font-bold text-primary">${product?.price}</span>
            )}
          </div>
        </CardContent>
      </div>
      <CardFooter className="p-4 pt-0">
        {product?.totalStock === 0 ? (
          <Button className="w-full rounded-lg opacity-60 cursor-not-allowed" disabled>
            Out Of Stock
          </Button>
        ) : (
          <Button
            onClick={(e) => { e.stopPropagation(); handleAddtoCart(product?._id, product?.totalStock); }}
            className="w-full rounded-lg font-semibold bg-primary hover:opacity-90 transition-opacity"
          >
            Add to cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ShoppingProductTile;