import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, Clock, CreditCard } from "lucide-react";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  delivery_type: string;
  created_at: string;
  order_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
  payments: {
    status: string;
  }[];
}

const PurchaseHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  const checkAuthAndFetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please log in to view purchase history");
      navigate("/auth");
      return;
    }

    fetchOrders();
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(*),
        payments(status)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch orders");
      return;
    }

    setOrders(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case "processing":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "out_for_delivery":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "delivered":
        return "bg-green-500/10 text-green-700 dark:text-green-300";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const getPaymentStatus = (order: Order) => {
    if (order.payments?.length === 0) {
      return "Payment Pending";
    }
    const latestPayment = order.payments[0];
    return latestPayment.status === "pending" 
      ? "Payment Verification Pending" 
      : formatStatus(latestPayment.status);
  };

  const canContinuePayment = (order: Order) => {
    // Can continue payment if:
    // 1. Order status is pending or processing
    // 2. No payments exist or latest payment is pending/failed
    if (order.status === "cancelled" || order.status === "delivered") {
      return false;
    }
    
    if (order.payments?.length === 0) {
      return true; // No payment made yet
    }
    
    const latestPayment = order.payments[0];
    return latestPayment.status === "pending" || latestPayment.status === "failed";
  };

  const handleContinuePayment = (orderId: string) => {
    navigate(`/payment-instructions/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-display mb-8">Purchase History</h1>

          {orders.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-display mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
              <button
                onClick={() => navigate("/shop")}
                className="text-accent hover:underline"
              >
                Browse Products
              </button>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="font-display text-xl">Order #{order.id.slice(0, 8)}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {formatStatus(order.status)}
                        </Badge>
                        {order.delivery_type === "pickup" && (
                          <Badge variant="outline">Pickup</Badge>
                        )}
                      </div>

                      <div className="space-y-3 mb-4">
                        {order.order_items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.product_name} × {item.quantity}
                            </span>
                            <span>{(item.unit_price * item.quantity).toLocaleString()} ETB</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {format(new Date(order.created_at), "PPP")}
                          </p>
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Payment: </span>
                            <span className="font-medium">{getPaymentStatus(order)}</span>
                          </p>
                          {canContinuePayment(order) && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleContinuePayment(order.id)}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Continue Payment
                            </Button>
                          )}
                        </div>
                        <p className="text-2xl font-bold">
                          {Number(order.total_amount).toLocaleString()} ETB
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PurchaseHistory;