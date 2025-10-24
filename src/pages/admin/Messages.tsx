import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

const Messages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMessages(Array.isArray(data) ? (data as ContactMessage[]) : []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone || "").toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q)
    );
  });

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    try {
      const { error } = await (supabase as any)
        .from("contact_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      // Fetch from DB to ensure it's truly gone (handles RLS/replication delays)
      await fetchMessages();
      toast({ title: "Deleted", description: "Message removed." });
    } catch (e: any) {
      const details = e?.details || e?.hint || e?.message;
      toast({ variant: "destructive", title: "Delete failed", description: details || "Unable to delete message" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display mb-2">Messages</h1>
            <p className="text-muted-foreground">Customer inquiries from the contact page</p>
          </div>
        </div>

        <div className="flex justify-between items-center gap-4">
          <Input
            placeholder="Search by name, email, phone, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" onClick={fetchMessages}>Refresh</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No messages</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((m) => (
              <Card key={m.id} className="p-4">
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" />{m.email}</span>
                      {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{m.phone}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="whitespace-pre-wrap text-sm leading-6">{m.message}</p>
                  <div className="mt-3">
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => deleteMessage(m.id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Messages;
