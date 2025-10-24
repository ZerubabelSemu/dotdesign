import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Trash2, Users, Search, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Admin {
  id: string;
  user_id: string;
  can_promote: boolean;
  promoted_by: string | null;
  created_at: string;
  email?: string;
  full_name?: string;
  promoter_email?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const Admins = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAdminUserId, setNewAdminUserId] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [canPromoteNew, setCanPromoteNew] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [currentUserCanPromote, setCurrentUserCanPromote] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [promotionMethod, setPromotionMethod] = useState<"uuid" | "email">("uuid");
  const { toast } = useToast();

  useEffect(() => {
    checkPermissions();
    fetchAdmins();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [userSearchQuery]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("list_auth_users", {
        search: userSearchQuery || "",
      });

      if (error) throw error;

      setUsers(Array.isArray(data) ? (data as any[]) : []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("can_promote")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setCurrentUserCanPromote(data?.can_promote || false);
  };

  const fetchAdmins = async () => {
    try {
      // Get all admin roles with profiles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Get promoter profiles
      const promoterIds = adminRoles
        ?.map(r => r.promoted_by)
        .filter((id): id is string => id !== null) || [];

      const { data: promoterProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", promoterIds);

      const promoterMap = new Map<string, string>();
      promoterProfiles?.forEach(p => {
        if (p.full_name) promoterMap.set(p.id, p.full_name);
      });

      const adminsWithDetails: Admin[] = adminRoles?.map((admin: any) => {
        const profile = Array.isArray(admin.profiles) ? admin.profiles[0] : admin.profiles;
        return {
          id: admin.id,
          user_id: admin.user_id,
          can_promote: admin.can_promote,
          promoted_by: admin.promoted_by,
          created_at: admin.created_at,
          email: admin.user_id,
          full_name: profile?.full_name || 'User',
          promoter_email: admin.promoted_by ? promoterMap.get(admin.promoted_by) : undefined,
        };
      }) || [];

      setAdmins(adminsWithDetails);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let userId: string;

      if (promotionMethod === "email") {
        const email = newAdminEmail.trim();
        if (!email) {
          toast({
            variant: "destructive",
            title: "Email required",
            description: "Please enter an email address.",
          });
          return;
        }

        // Find user by email
        const userProfile = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!userProfile) {
          toast({
            variant: "destructive",
            title: "User not found",
            description: "No user found with that email address.",
          });
          return;
        }

        userId = userProfile.id;
      } else {
        userId = newAdminUserId.trim();
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          toast({
            variant: "destructive",
            title: "Invalid format",
            description: "Please enter a valid user ID (UUID format).",
          });
          return;
        }

        // Check if user exists in profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", userId)
          .maybeSingle();

        if (!profile) {
          toast({
            variant: "destructive",
            title: "User not found",
            description: "No user found with that ID. Make sure the user has created an account.",
          });
          return;
        }
      }

      // Check if already admin
      const { data: existingAdmin } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (existingAdmin) {
        toast({
          variant: "destructive",
          title: "Already an admin",
          description: "This user is already an admin.",
        });
        return;
      }

      // Promote to admin
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
          promoted_by: user.id,
          can_promote: canPromoteNew,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `User has been promoted to admin.`,
      });

      setDialogOpen(false);
      setNewAdminUserId("");
      setNewAdminEmail("");
      setCanPromoteNew(false);
      fetchAdmins();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDemoteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      // Call the cascade function to demote admin and all their branches
      const { error: cascadeError } = await supabase.rpc(
        "cascade_demote_admins",
        { _user_id: selectedAdmin.user_id }
      );

      if (cascadeError) throw cascadeError;

      // Delete the admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedAdmin.user_id)
        .eq("role", "admin");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin has been demoted along with their branch.",
      });

      setDeleteDialogOpen(false);
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display mb-2">Admin Management</h1>
            <p className="text-muted-foreground">
              Manage admin users and their permissions
            </p>
          </div>
          {currentUserCanPromote && (
            <Button onClick={() => setDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Promote New Admin
            </Button>
          )}
        </div>

        {!currentUserCanPromote && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-warning" />
                Limited Permissions
              </CardTitle>
              <CardDescription>
                You don't have permission to promote or demote admins. Contact a full admin for assistance.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {admin.full_name || "User"}
                      {admin.can_promote && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      ID: {admin.user_id}
                      {admin.promoter_email && (
                        <span className="block text-xs mt-1">
                          Promoted by: {admin.promoter_email}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {currentUserCanPromote && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Permissions:</span>{" "}
                    {admin.can_promote ? "Full Admin (Can promote others)" : "Standard Admin"}
                  </div>
                  <div>
                    <span className="font-medium">Since:</span>{" "}
                    {new Date(admin.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Promote Admin Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promote New Admin</DialogTitle>
            <DialogDescription>
              Choose how you want to promote a user to admin.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={promotionMethod} onValueChange={(value) => setPromotionMethod(value as "uuid" | "email")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="uuid">By User ID</TabsTrigger>
              <TabsTrigger value="email">By Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="uuid" className="space-y-4">
              <div>
                <Label htmlFor="userId">User ID (UUID)</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="e.g., 04ae073d-d8b3-427f-8e60-28d20a153ae3"
                  value={newAdminUserId}
                  onChange={(e) => setNewAdminUserId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can find user IDs in your backend user management
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="email" className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the email address of the user you want to promote
                </p>
              </div>
              
              <div>
                <Label htmlFor="userSearch">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="userSearch"
                    placeholder="Search users by email or name..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                  {users
                    .filter(user => 
                      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      user.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          setNewAdminEmail(user.email);
                          setUserSearchQuery("");
                        }}
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          {user.full_name && (
                            <p className="text-xs text-muted-foreground">{user.full_name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="can-promote">Full Admin Rights</Label>
              <p className="text-sm text-muted-foreground">
                Allow this admin to promote others
              </p>
            </div>
            <Switch
              id="can-promote"
              checked={canPromoteNew}
              onCheckedChange={setCanPromoteNew}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePromoteAdmin}>Promote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demote Admin Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will demote {selectedAdmin?.full_name} and all admins they promoted (their entire branch).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAdmin(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDemoteAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Admins;