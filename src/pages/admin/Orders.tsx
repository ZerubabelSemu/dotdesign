import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_type: string;
  total_amount: number;
  status: string;
  created_at: string;
  payments: {
    id: string;
    status: string;
    payment_receipt_url: string | null;
    amount: number;
  }[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const { toast } = useToast();
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;

  const normalizeReceiptUrl = async (url: string): Promise<string> => {
    try {
      if (!url) return url;
      // If it's a bare storage path like "bucket/path/to/file.ext"
      const bareMatch = url.match(/^[\w-]+\/.+$/);
      if (!url.startsWith("http") && bareMatch) {
        const bucket = url.split("/")[0];
        const path = url.substring(bucket.length + 1);
        // try public URL first
        const { data } = await (supabase as any).storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
        // fallback to signed URL
        const signed = await (supabase as any).storage.from(bucket).createSignedUrl(path, 600);
        return signed?.data?.signedUrl || url;
      }
      // If it's a Supabase storage URL but points to an old project host, rewrite to current project
      if (supabaseUrl && url.includes("/storage/v1/object/") && !url.startsWith(supabaseUrl)) {
        try {
          const u = new URL(url);
          const base = new URL(supabaseUrl);
          return `${base.origin}${u.pathname}${u.search}`;
        } catch {}
      }
      // If it's a Supabase storage URL for current (or rewritten) host, try creating a signed URL to avoid private bucket 404s
      if (url.includes("/storage/v1/object/") && supabaseUrl) {
        try {
          const u = new URL(url.startsWith("http") ? url : `${supabaseUrl}${url}`);
          // path: /storage/v1/object/[public|sign]/<bucket>/<path>
          const parts = u.pathname.split("/").filter(Boolean);
          const idx = parts.findIndex((p) => p === "object");
          const bucket = parts[idx + 2];
          const objectPath = parts.slice(idx + 3).join("/");
          if (bucket && objectPath) {
            const signed = await (supabase as any).storage.from(bucket).createSignedUrl(objectPath, 600);
            if (signed?.data?.signedUrl) return signed.data.signedUrl;
          }
        } catch {}
      }
      return url;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        payments(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch orders",
      });
      return;
    }

    setOrders(data || []);
  };

  const updateOrderStatus = async (orderId: string, newStatus: "pending" | "processing" | "out_for_delivery" | "delivered" | "cancelled") => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Order status updated",
    });

    fetchOrders();
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: "pending" | "confirmed" | "failed") => {
    const { error } = await supabase
      .from("payments")
      .update({ status: newStatus })
      .eq("id", paymentId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update payment status",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Payment status updated",
    });

    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "processing":
        return "bg-blue-500/10 text-blue-500";
      case "out_for_delivery":
        return "bg-purple-500/10 text-purple-500";
      case "delivered":
        return "bg-green-500/10 text-green-500";
      case "cancelled":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-4xl font-display mb-2">Orders</h1>
            <p className="text-muted-foreground">Manage customer orders</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input
              placeholder="Search orders…"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="md:w-80"
            />
          </div>
        </div>

        {(() => {
          const q = orderSearch.trim().toLowerCase();
          const filtered = q
            ? orders.filter((o) => {
                const parts = [
                  o.id,
                  o.customer_name,
                  o.customer_phone,
                  o.customer_email || "",
                  o.delivery_city || "",
                  o.delivery_address || "",
                  o.status,
                ].join(" ").toLowerCase();
                return parts.includes(q);
              })
            : orders;
          return (
        <div className="space-y-4">
          {filtered.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg">{order.customer_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Phone: {order.customer_phone}</p>
                    {order.customer_email && <p>Email: {order.customer_email}</p>}
                    {order.delivery_type === "delivery" ? (
                      <p>Delivery: {order.delivery_address}, {order.delivery_city}</p>
                    ) : (
                      <p className="font-medium text-blue-600">Pickup Order</p>
                    )}
                    <p>Order Date: {format(new Date(order.created_at), "PPP")}</p>
                    
                    {order.payments && order.payments.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium">Payment Status: 
                          <span className={`ml-2 ${getStatusColor(order.payments[0].status)}`}>
                            {formatStatus(order.payments[0].status)}
                          </span>
                        </p>
                        {order.payments[0].payment_receipt_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto mt-1"
                            onClick={async () => {
                              const normalized = await normalizeReceiptUrl(order.payments[0].payment_receipt_url!);
                              setSelectedReceipt(normalized);
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Receipt
                          </Button>
                        )}
                        {order.payments[0].status === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => updatePaymentStatus(order.payments[0].id, "confirmed")}
                            >
                              Confirm Payment
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updatePaymentStatus(order.payments[0].id, "failed")}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xl font-bold">
                    {Number(order.total_amount).toLocaleString()} ETB
                  </p>
                </div>

                <div className="flex flex-col gap-2 lg:w-48">
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderStatus(order.id, value as "pending" | "processing" | "out_for_delivery" | "delivered" | "cancelled")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
          );
        })()}

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders yet.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-4xl w-[92vw]">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" disabled>
                  View
                </Button>
                <a href={selectedReceipt} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button variant="outline" size="sm">Open in New Tab</Button>
                </a>
                <a href={selectedReceipt} download className="inline-flex">
                  <Button variant="outline" size="sm">Download</Button>
                </a>
              </div>
              <div className="h-[70vh] overflow-auto rounded border">
              {(() => {
                const url = selectedReceipt;
                const isImage = /(\.png|\.jpe?g|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(url);
                const isPdf = /(\.pdf)(\?.*)?$/i.test(url);
                if (isImage) {
                  return (
                    <img
                      src={url}
                      alt="Payment Receipt"
                      className="max-w-full h-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'p-8 text-center text-muted-foreground';
                        errorDiv.innerHTML = `
                          <div class="text-4xl mb-2">📄</div>
                          <p>Receipt image cannot be displayed</p>
                          <p class="text-sm mt-2">URL: ${url}</p>
                        `;
                        target.parentNode?.insertBefore(errorDiv, target.nextSibling);
                      }}
                    />
                  );
                }
                if (isPdf) {
                  return (
                    <object data={url} type="application/pdf" className="w-full h-[70vh]">
                      <iframe src={url} className="w-full h-[70vh]" title="Receipt PDF" />
                    </object>
                  );
                }
                return (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="text-4xl mb-2">📄</div>
                    <p>Preview is unavailable for this file type.</p>
                    <p className="text-sm mt-2 break-all">URL: {url}</p>
                  </div>
                );
              })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Orders;