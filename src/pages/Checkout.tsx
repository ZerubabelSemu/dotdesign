import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMainShopLocation, usePickupHours } from "@/hooks/useShopInfo";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, refreshPrices } = useCart();
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    notes: "",
  });

  const { data: mainLocation } = useMainShopLocation();
  const { data: pickupHours } = usePickupHours(mainLocation?.id);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const formatPickupHours = (hours: any[]) => {
    if (!hours || hours.length === 0) {
      return (
        <>
          Monday - Saturday: 9:00 AM - 6:00 PM<br />
          Sunday: Closed
        </>
      );
    }

    return hours.map((hour) => (
      <span key={hour.day_of_week}>
        {dayNames[hour.day_of_week]}: {hour.is_closed ? "Closed" : `${hour.open_time} - ${hour.close_time}`}
        <br />
      </span>
    ));
  };

  // Restore saved checkout state if returning after auth
  useEffect(() => {
    const saved = localStorage.getItem("checkout_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.deliveryType) setDeliveryType(parsed.deliveryType);
      } catch {}
      localStorage.removeItem("checkout_state");
    }
  }, []);

  // Ensure prices reflect current size adjustments
  useEffect(() => {
    refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Explain and redirect to auth, preserving state
        toast.error("Please sign in to place your order.");
        const state = JSON.stringify({ formData, deliveryType });
        localStorage.setItem("checkout_state", state);
        navigate(`/auth?redirect=${encodeURIComponent("/checkout")}`);
        return;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          delivery_address: deliveryType === "delivery" ? formData.deliveryAddress : null,
          delivery_city: deliveryType === "delivery" ? formData.deliveryCity : null,
          delivery_type: deliveryType,
          total_amount: totalPrice,
          notes: formData.notes,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart and redirect to payment instructions
      clearCart();
      toast.success("Order placed successfully!");
      navigate(`/payment-instructions/${order.id}`);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-display mb-2">Checkout</h1>
          <p className="text-sm text-muted-foreground mb-10">Enter your details below. We’ll confirm your order and share pickup or delivery updates. Your information is kept private and only used for your order.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-display mb-1">Contact Information</h2>
                  <p className="text-xs text-muted-foreground mb-4">We’ll use this to reach you about your order and delivery or pickup.</p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customerName">Full Name *</Label>
                      <Input
                        id="customerName"
                        required
                        value={formData.customerName}
                        onChange={(e) =>
                          setFormData({ ...formData, customerName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, customerEmail: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number *</Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        required
                        value={formData.customerPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, customerPhone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-display mb-1">Delivery Method</h2>
                  <p className="text-xs text-muted-foreground mb-3">Choose home delivery or pick up your order in-store at your convenience.</p>
                  <RadioGroup value={deliveryType} onValueChange={(value: "delivery" | "pickup") => setDeliveryType(value)}>
                    <div className="flex items-center space-x-2 mb-3">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery" className="cursor-pointer">Home Delivery</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="cursor-pointer">Pickup from Store</Label>
                    </div>
                  </RadioGroup>
                </div>

                {deliveryType === "delivery" ? (
                  <div>
                    <h2 className="text-xl font-display mb-1">Delivery Information</h2>
                    <p className="text-xs text-muted-foreground mb-4">Please provide accurate address details to ensure smooth delivery.</p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="deliveryCity">City *</Label>
                        <Input
                          id="deliveryCity"
                          required
                          value={formData.deliveryCity}
                          onChange={(e) =>
                            setFormData({ ...formData, deliveryCity: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                        <Textarea
                          id="deliveryAddress"
                          required
                          rows={3}
                          value={formData.deliveryAddress}
                          onChange={(e) =>
                            setFormData({ ...formData, deliveryAddress: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Order Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          rows={3}
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="e.g., Call upon arrival, gate code, preferred time, etc."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h2 className="text-xl font-display mb-1">Pickup Location</h2>
                    <p className="text-xs text-muted-foreground mb-4">After placing your order, you’ll receive confirmation with pickup details.</p>
                    <p className="mb-2"><strong>Store Address:</strong></p>
                    <p className="text-muted-foreground mb-4">
                      {mainLocation ? (
                        <>
                          {mainLocation.address}<br />
                          {mainLocation.city}
                        </>
                      ) : (
                        <>
                          123 Fashion Street, Addis Ababa, Ethiopia<br />
                          Near Bole International Airport
                        </>
                      )}
                    </p>
                    <p className="mb-2"><strong>Pickup Hours:</strong></p>
                    <p className="text-muted-foreground">
                      {formatPickupHours(pickupHours || [])}
                    </p>
                    <div className="mt-4">
                      <Label htmlFor="notes">Order Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Any special instructions for your pickup (e.g., preferred time)."
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Placing Order..." : "Place Order"}
                </Button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="border border-border rounded-lg p-6 sticky top-32">
                <h2 className="text-xl font-display mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.name} {item.size && `(${item.size})`} × {item.quantity}
                      </span>
                      <span>
                        {(item.price * item.quantity).toLocaleString()} ETB
                      </span>
                    </div>
                  ))}
                  
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>{totalPrice.toLocaleString()} ETB</span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">
                    By placing this order, you agree to our terms and conditions.
                  </p>
                  <p>
                    We’ll contact you shortly to confirm your order and arrange delivery or pickup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
