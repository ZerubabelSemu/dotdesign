import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, CreditCard, ArrowUp, ArrowDown } from "lucide-react";

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
  created_at: string;
}

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "mobile_money",
    account_number: "",
    account_name: "",
    phone_number: "",
    instructions: "",
    is_active: true,
    display_order: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment methods",
      });
      return;
    }

    setPaymentMethods(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const methodData = {
        ...formData,
        account_number: formData.account_number || null,
        account_name: formData.account_name || null,
        phone_number: formData.phone_number || null,
        instructions: formData.instructions || null,
      };

      if (editingMethod) {
        const { error } = await supabase
          .from("payment_methods")
          .update(methodData)
          .eq("id", editingMethod.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment method updated successfully",
        });
      } else {
        // Set display order to be the next available number
        const maxOrder = Math.max(...paymentMethods.map(m => m.display_order), 0);
        methodData.display_order = maxOrder + 1;

        const { error } = await supabase
          .from("payment_methods")
          .insert([methodData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment method added successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPaymentMethods();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      type: method.type,
      account_number: method.account_number || "",
      account_name: method.account_name || "",
      phone_number: method.phone_number || "",
      instructions: method.instructions || "",
      is_active: method.is_active,
      display_order: method.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete payment method",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Payment method deleted successfully",
    });

    fetchPaymentMethods();
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = paymentMethods.findIndex(m => m.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= paymentMethods.length) return;

    const methods = [...paymentMethods];
    const [movedMethod] = methods.splice(currentIndex, 1);
    methods.splice(newIndex, 0, movedMethod);

    // Update display orders
    const updates = methods.map((method, index) => ({
      id: method.id,
      display_order: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from("payment_methods")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    fetchPaymentMethods();
  };

  const resetForm = () => {
    setEditingMethod(null);
    setFormData({
      name: "",
      type: "mobile_money",
      account_number: "",
      account_name: "",
      phone_number: "",
      instructions: "",
      is_active: true,
      display_order: 0,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mobile_money":
        return "📱";
      case "bank_transfer":
        return "🏦";
      case "cash":
        return "💵";
      default:
        return "💳";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mobile_money":
        return "Mobile Money";
      case "bank_transfer":
        return "Bank Transfer";
      case "cash":
        return "Cash";
      default:
        return type;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display mb-2">Payment Methods</h1>
            <p className="text-muted-foreground">Manage payment options for customers</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMethod ? "Edit Payment Method" : "Add New Payment Method"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Payment Method Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Telebirr, CBE Bank, etc."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Payment Type*</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "bank_transfer" && (
                  <>
                    <div>
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="1000123456789"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_name">Account Name</Label>
                      <Input
                        id="account_name"
                        value={formData.account_name}
                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                        placeholder="Your Store Name"
                      />
                    </div>
                  </>
                )}

                {formData.type === "mobile_money" && (
                  <div>
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+251 911 234567"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="instructions">Payment Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Send payment via Telebirr mobile money..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Show this payment method to customers
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingMethod ? "Update" : "Add"} Payment Method
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method, index) => (
            <Card key={method.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{getTypeIcon(method.type)}</div>
                  <div>
                    <h3 className="font-display text-lg">{method.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getTypeLabel(method.type)}
                    </p>
                    <div className="mt-1 space-y-1">
                      {method.phone_number && (
                        <p className="text-sm">📞 {method.phone_number}</p>
                      )}
                      {method.account_number && (
                        <p className="text-sm">🏦 {method.account_number}</p>
                      )}
                      {method.account_name && (
                        <p className="text-sm">👤 {method.account_name}</p>
                      )}
                    </div>
                    {method.instructions && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {method.instructions}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(method.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(method.id, "down")}
                      disabled={index === paymentMethods.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(method)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="ml-4">
                    {method.is_active ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/10 text-gray-500 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {paymentMethods.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No payment methods yet. Add your first payment option!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PaymentMethods;
