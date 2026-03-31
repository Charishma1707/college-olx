import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";

function AdminProductTile({
  product,
  setFormData,
  setOpenCreateProductsDialog,
  setCurrentEditedId,
  handleDelete,
}) {
  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl bg-white">
      <div>
        <div className="relative">
          <img
            src={product?.image}
            alt={product?.title}
            className="w-full h-[240px] object-cover"
          />
        </div>
        <CardContent className="p-5">
          <h2 className="text-lg font-bold mb-3 line-clamp-2">{product?.title}</h2>
          <div className="flex items-center gap-2">
            {product?.salePrice > 0 && product?.salePrice < product?.price ? (
              <>
                <span className="text-xl font-extrabold text-primary">${product?.salePrice}</span>
                <span className="text-sm text-muted-foreground line-through">${product?.price}</span>
              </>
            ) : (
              <span className="text-xl font-extrabold text-primary">${product?.price}</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center gap-3 p-5 pt-0">
          <Button
            variant="outline"
            className="flex-1 rounded-lg"
            onClick={() => {
              setOpenCreateProductsDialog(true);
              setCurrentEditedId(product?._id);
              setFormData(product);
            }}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-lg"
            onClick={() => handleDelete(product?._id)}
          >
            Delete
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}

export default AdminProductTile;