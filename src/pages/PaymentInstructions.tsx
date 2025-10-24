import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CheckCircle, Copy } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  account_number: string | null;
  account_name: string | null;
  phone_number: string | null;
  instructions: string | null;
  is_active: boolean;
  display_order: number;
}

const PaymentInstructions = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchOrderAndPaymentMethods();
  }, [orderId]);

  const fetchOrderAndPaymentMethods = async () => {
    if (!orderId) return;

    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) {
        toast.error("Order not found");
        navigate("/");
        return;
      }

      setOrder(orderData);

      // Fetch payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (methodsError) {
        console.error("Error fetching payment methods:", methodsError);
        // Continue without payment methods
      } else {
        setPaymentMethods(methodsData || []);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load order details");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !orderId) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${orderId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(fileName);

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: orderId,
          amount: order.total_amount,
          method: "telebirr" as const,
          status: "pending",
          payment_receipt_url: publicUrl,
        });

      if (paymentError) throw paymentError;

      // Update order status
      await supabase
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId);

      toast.success("Receipt uploaded successfully! Payment verification pending.");
      navigate("/purchase-history");
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("Failed to upload receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
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
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl font-display mb-4">Order Placed Successfully!</h1>
            <p className="text-muted-foreground">Order ID: {orderId}</p>
          </div>

          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-display mb-6">Payment Instructions</h2>
            
            <div className="space-y-6">
              <div>
                <p className="text-lg mb-4">Total Amount: <span className="font-bold">{order?.total_amount.toLocaleString()} ETB</span></p>
                <p className="text-muted-foreground mb-4">
                  Please transfer the amount to any of the following accounts:
                </p>
              </div>

              <div className="space-y-4">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <Card key={method.id} className="p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{method.name}</h3>
                          {method.phone_number && (
                            <p className="text-sm text-muted-foreground mt-1">📞 {method.phone_number}</p>
                          )}
                          {method.account_number && (
                            <p className="text-sm text-muted-foreground mt-1">🏦 {method.account_number}</p>
                          )}
                          {method.account_name && (
                            <p className="text-sm text-muted-foreground mt-1">👤 {method.account_name}</p>
                          )}
                          {method.instructions && (
                            <p className="text-sm text-muted-foreground mt-2">{method.instructions}</p>
                          )}
                        </div>
                        {(method.phone_number || method.account_number) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(method.phone_number || method.account_number || "")}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  // Fallback to default payment methods if none are configured
                  <>
                    <Card className="p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Telebirr</h3>
                          <p className="text-sm text-muted-foreground mt-1">+251 911 234567</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("+251 911 234567")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Commercial Bank of Ethiopia (CBE)</h3>
                          <p className="text-sm text-muted-foreground mt-1">Account: 1000123456789</p>
                          <p className="text-sm text-muted-foreground">Account Name: Your Store Name</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("1000123456789")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Zemen Bank</h3>
                          <p className="text-sm text-muted-foreground mt-1">Account: 9876543210000</p>
                          <p className="text-sm text-muted-foreground">Account Name: Your Store Name</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("9876543210000")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </>
                )}
              </div>

              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold mb-4">Upload Payment Receipt</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  After making the payment, please upload a screenshot or receipt for verification.
                </p>
                
                <div className="flex flex-col gap-4">
                  <Label
                    htmlFor="receipt-upload"
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {uploading ? "Uploading..." : "Click to upload receipt"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 5MB
                    </p>
                  </Label>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Your order will be processed once we verify your payment. 
                  You can track your order status in your purchase history.
                </p>
              </div>

              <div className="flex gap-4 mt-8">
                <Button onClick={() => navigate("/purchase-history")} className="flex-1">
                  View Purchase History
                </Button>
                <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                  Continue Shopping
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentInstructions;