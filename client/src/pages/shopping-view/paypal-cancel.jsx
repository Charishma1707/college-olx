import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

function PaypalCancelPage() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.error("Payment was cancelled");
  }, []);

  return (
    <Card className="p-10">
      <CardHeader className="p-0">
        <CardTitle className="text-3xl">Payment cancelled</CardTitle>
      </CardHeader>
      <div className="mt-6 flex gap-3 flex-wrap">
        <Button variant="outline" onClick={() => navigate("/shop/checkout")}>
          Back to Checkout
        </Button>
        <Button onClick={() => navigate("/shop/home")}>Continue shopping</Button>
      </div>
    </Card>
  );
}

export default PaypalCancelPage;

