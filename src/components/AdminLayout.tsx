import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, LogOut, Menu, X, Users, Phone, MapPin, CreditCard, Home, Mail, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [canPromote, setCanPromote] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const checkPromotePermission = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("can_promote")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      setCanPromote(data?.can_promote || false);
    };
    checkPromotePermission();
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access the admin panel.",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

      const menuItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
        { icon: Package, label: "Products", path: "/admin/products" },
        { icon: FolderTree, label: "Categories", path: "/admin/categories" },
        { icon: ShoppingCart, label: "Orders", path: "/admin/orders" },
        { icon: Phone, label: "Phone Numbers", path: "/admin/phone-numbers" },
        { icon: MapPin, label: "Shop Locations", path: "/admin/shop-locations" },
        { icon: CreditCard, label: "Payment Methods", path: "/admin/payment-methods" },
        { icon: Link2, label: "Social Links", path: "/admin/social-links" },
        { icon: Mail, label: "Subscribers", path: "/admin/subscribers" },
        { icon: Mail, label: "Messages", path: "/admin/messages" },
      ];

  // Check if current user has promotion rights to show admin management

  const allMenuItems = canPromote 
    ? [...menuItems, { icon: Users, label: "Admins", path: "/admin/admins" }]
    : menuItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border elegant-transition z-40 overflow-y-auto ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}>
        <div className="p-6 h-full flex flex-col">
          <h2 className="text-2xl font-display mb-8">Admin Panel</h2>
          
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {allMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg elegant-transition ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

              <div className="mt-8 pt-8 border-t border-border space-y-2">
                <Link
                  to="/"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg elegant-transition hover:bg-muted"
                >
                  <Home className="h-5 w-5" />
                  <span>Go Home</span>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </Button>
              </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;