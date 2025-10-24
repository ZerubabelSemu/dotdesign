import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Phone } from "lucide-react";

interface PhoneNumber {
  id: string;
  phone_number: string;
  label: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

const PhoneNumbers = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<PhoneNumber | null>(null);
  const [formData, setFormData] = useState({
    phone_number: "",
    label: "Primary",
    is_primary: false,
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    const { data, error } = await supabase
      .from("phone_numbers")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch phone numbers",
      });
      return;
    }

    setPhoneNumbers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // If setting as primary, unset other primary numbers
      if (formData.is_primary) {
        await supabase
          .from("phone_numbers")
          .update({ is_primary: false })
          .neq("id", editingPhone?.id || "");
      }

      if (editingPhone) {
        const { error } = await supabase
          .from("phone_numbers")
          .update(formData)
          .eq("id", editingPhone.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Phone number updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("phone_numbers")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Phone number added successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPhoneNumbers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEdit = (phone: PhoneNumber) => {
    setEditingPhone(phone);
    setFormData({
      phone_number: phone.phone_number,
      label: phone.label,
      is_primary: phone.is_primary,
      is_active: phone.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;

    const { error } = await supabase
      .from("phone_numbers")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete phone number",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Phone number deleted successfully",
    });

    fetchPhoneNumbers();
  };

  const resetForm = () => {
    setEditingPhone(null);
    setFormData({
      phone_number: "",
      label: "Primary",
      is_primary: false,
      is_active: true,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display mb-2">Phone Numbers</h1>
            <p className="text-muted-foreground">Manage store contact numbers</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPhone ? "Edit Phone Number" : "Add New Phone Number"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phone_number">Phone Number*</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+251 926 765 309"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Primary, Support, Sales, etc."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_primary">Primary Number</Label>
                    <p className="text-sm text-muted-foreground">
                      Only one number can be primary
                    </p>
                  </div>
                  <Switch
                    id="is_primary"
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Show this number to customers
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
                    {editingPhone ? "Update" : "Add"} Phone Number
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {phoneNumbers.map((phone) => (
            <Card key={phone.id} className="p-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    {phone.label}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(phone)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(phone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-lg font-medium">{phone.phone_number}</p>
                  <div className="flex gap-2">
                    {phone.is_primary && (
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                        Primary
                      </span>
                    )}
                    {phone.is_active ? (
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
              </CardContent>
            </Card>
          ))}
        </div>

        {phoneNumbers.length === 0 && (
          <div className="text-center py-12">
            <Phone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No phone numbers yet. Add your first contact number!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PhoneNumbers;
