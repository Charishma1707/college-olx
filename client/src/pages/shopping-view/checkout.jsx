import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Address from "@/components/shopping-view/address";
import { fetchCartItems } from "@/store/shop/cart-slice";
import { createNewOrder } from "@/store/shop/order-slice";
import { toast } from "react-toastify";

function ShoppingCheckout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { cartItems, isLoading: isCartLoading } = useSelector(
    (state) => state.shopCart
  );
  const { approvalURL, isLoading: isOrderLoading } = useSelector(
    (state) => state.shopOrder
  );

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);

  const cartLineItems = useMemo(() => {
    return cartItems?.items?.length ? cartItems.items : [];
  }, [cartItems?.items]);

  const totalAmount = useMemo(() => {
    if (!cartLineItems.length) return 0;
    return cartLineItems.reduce((sum, item) => {
      const unitPrice = item?.salePrice > 0 ? item.salePrice : item.price;
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [cartLineItems]);

  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchCartItems(user.id));
  }, [dispatch, user?.id]);

  useEffect(() => {
    if (approvalURL) {
      toast.info("Redirecting to PayPal...");
      globalThis.location.href = approvalURL;
    }
  }, [approvalURL]);

  function handleCreateOrder() {
    if (!user?.id) {
      toast.error("Please login to continue");
      navigate("/auth/login");
      return;
    }

    if (!cartLineItems.length) {
      toast.error("Your cart is empty");
      navigate("/shop/home");
      return;
    }

    const hasSelectedAddress = Boolean(currentSelectedAddress?._id);
    if (hasSelectedAddress === false) {
      toast.error("Please select an address");
      return;
    }

    const normalizedCartItems = cartLineItems.map((item) => ({
      productId: item.productId,
      title: item.title,
      price: item?.salePrice > 0 ? item.salePrice : item.price,
      quantity: item.quantity,
    }));

    dispatch(
      createNewOrder({
        userId: user.id,
        cartId: cartItems?._id,
        cartItems: normalizedCartItems,
        addressInfo: currentSelectedAddress,
        orderStatus: "pending",
        paymentMethod: "paypal",
        paymentStatus: "unpaid",
        totalAmount,
        orderDate: new Date(),
        orderUpdateDate: new Date(),
        paymentId: "",
        payerId: "",
      })
    ).then((res) => {
      const ok = Boolean(res?.payload?.success);
      if (ok) toast.success("Order created. Opening PayPal...");
      else toast.error(res?.payload?.message || "Unable to create order");
    });
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Delivery Address</CardTitle>
            </CardHeader>
            <CardContent>
              <Address
                selectedId={currentSelectedAddress?._id}
                setCurrentSelectedAddress={setCurrentSelectedAddress}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cartLineItems.length ? (
                <div className="text-muted-foreground">
                  Your cart is empty.
                </div>
              ) : (
                cartLineItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-4"
                  >
                    <div className="h-16 w-16 rounded-xl overflow-hidden border bg-muted/10 shrink-0">
                      {item?.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="font-bold">
                      $
                      {(
                        (item?.salePrice > 0 ? item.salePrice : item.price) *
                        item.quantity
                      ).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl sticky top-24">
          <CardHeader>
            <CardTitle className="text-2xl">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Items</span>
              <span className="font-semibold">{cartLineItems.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-extrabold">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
            <Separator />
            <Button
              className="w-full rounded-xl font-semibold"
              onClick={handleCreateOrder}
              disabled={isCartLoading || isOrderLoading}
            >
              {isOrderLoading ? "Redirecting to PayPal..." : "Pay with PayPal"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ShoppingCheckout;
