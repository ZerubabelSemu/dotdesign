import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Link2 } from "lucide-react";
import { resolveSocialIcon } from "@/lib/socialIcons";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  is_active: boolean;
  display_order: number;
}

const SocialLinks = () => {
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [form, setForm] = useState({
    platform: "",
    url: "",
    is_active: true,
    display_order: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSocials();
  }, []);

  const fetchSocials = async () => {
    const { data, error } = await (supabase as any)
      .from("social_links")
      .select("id, platform, url, is_active, display_order")
      .order("display_order")
      .order("created_at");
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch social links" });
      return;
    }
    setSocials(data || []);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ platform: "", url: "", is_active: true, display_order: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const { error } = await (supabase as any)
          .from("social_links")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Updated", description: "Social link updated." });
      } else {
        const { error } = await (supabase as any)
          .from("social_links")
          .insert([{ ...form }]);
        if (error) throw error;
        toast({ title: "Added", description: "Social link added." });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchSocials();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Operation failed" });
    }
  };

  const handleEdit = (item: SocialLink) => {
    setEditing(item);
    setForm({
      platform: item.platform,
      url: item.url,
      is_active: item.is_active,
      display_order: item.display_order ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this social link?")) return;
    const { error } = await (supabase as any)
      .from("social_links")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
      return;
    }
    toast({ title: "Deleted", description: "Social link removed." });
    fetchSocials();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display mb-2">Social Links</h1>
            <p className="text-muted-foreground">Add and manage social media links shown in the site footer and contact page.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Social Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Social Link" : "Add Social Link"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Input id="platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Instagram, Facebook, Telegram, ..." />
                </div>
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." required />
                </div>
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input id="display_order" type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <Switch id="is_active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editing ? "Update" : "Add"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {socials.map((s) => {
            const { icon: Icon } = resolveSocialIcon(s.platform || s.url);
            return (
              <Card key={s.id} className="p-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {s.platform || "Social"}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <a href={s.url} className="text-sm text-primary underline break-all" target="_blank" rel="noreferrer">
                      {s.url}
                    </a>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${s.is_active ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="px-2 py-1 bg-muted rounded-full">Order: {s.display_order ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {socials.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Link2 className="w-16 h-16 mx-auto mb-4" />
            No social links yet. Add your first social link!
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SocialLinks;
