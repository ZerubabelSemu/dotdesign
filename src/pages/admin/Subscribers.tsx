import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
}

const Subscribers = () => {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubs(Array.isArray(data) ? (data as Subscriber[]) : []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to load subscribers" });
    } finally {
      setLoading(false);
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm("Delete this subscriber? This cannot be undone.")) return;
    try {
      const { error } = await (supabase as any)
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setSubs((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Deleted", description: "Subscriber removed." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message || "Unable to delete subscriber" });
    }
  };

  const filtered = subs.filter((s) => s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display mb-2">Subscribers</h1>
            <p className="text-muted-foreground">Newsletter subscribers collected from the site footer</p>
          </div>
          <Button variant="outline" onClick={fetchSubs}>Refresh</Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No subscribers</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((s) => (
              <Card key={s.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{s.email}</span>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                <div>
                  <Button variant="destructive" size="sm" className="gap-1" onClick={() => deleteSubscriber(s.id)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Subscribers;
