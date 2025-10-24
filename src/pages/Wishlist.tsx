import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

interface WishlistProduct {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
    product_images: {
      image_url: string;
    }[];
  };
}

const Wishlist = () => {
  const navigate = useNavigate();
  const { removeFromWishlist, refreshWishlist } = useWishlist();
  const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchWishlist();
  }, []);

  const checkAuthAndFetchWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please log in to view your wishlist");
      navigate("/auth");
      return;
    }

    fetchWishlist();
  };

  const fetchWishlist = async () => {
    const { data, error } = await supabase
      .from("wishlist")
      .select(`
        *,
        products(
          id,
          name,
          price,
          product_images(image_url)
        )
      `);

    if (error) {
      toast.error("Failed to fetch wishlist");
      return;
    }

    setWishlistProducts(data || []);
    setLoading(false);
  };

  const handleRemove = async (productId: string) => {
    await removeFromWishlist(productId);
    fetchWishlist();
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
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-display mb-8">My Wishlist</h1>

          {wishlistProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-display mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                Save items you love to your wishlist to keep track of them
              </p>
              <Button onClick={() => navigate("/shop")}>
                Browse Products
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistProducts.map((item) => (
                <Card key={item.id} className="overflow-hidden group">
                  <div
                    className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/product/${item.products.id}`)}
                  >
                    <img
                      src={item.products.product_images[0]?.image_url || "/placeholder.svg"}
                      alt={item.products.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  <div className="p-4">
                    <h3
                      className="font-display text-lg mb-2 cursor-pointer hover:text-accent transition-colors"
                      onClick={() => navigate(`/product/${item.products.id}`)}
                    >
                      {item.products.name}
                    </h3>
                    <p className="text-lg font-semibold mb-4">
                      {item.products.price.toLocaleString()} ETB
                    </p>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/product/${item.products.id}`)}
                        className="flex-1"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemove(item.product_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wishlist;