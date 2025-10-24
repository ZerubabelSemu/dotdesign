import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  product_id: string;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const refreshWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setWishlistItems([]);
      return;
    }

    const { data, error } = await supabase
      .from("wishlist")
      .select("*");

    if (!error && data) {
      setWishlistItems(data);
    }
  };

  useEffect(() => {
    refreshWishlist();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshWishlist();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.product_id === productId);
  };

  const addToWishlist = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please log in to add items to wishlist");
      return;
    }

    const { error } = await supabase
      .from("wishlist")
      .insert({ user_id: user.id, product_id: productId });

    if (error) {
      toast.error("Failed to add to wishlist");
      return;
    }

    toast.success("Added to wishlist");
    refreshWishlist();
  };

  const removeFromWishlist = async (productId: string) => {
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("product_id", productId);

    if (error) {
      toast.error("Failed to remove from wishlist");
      return;
    }

    toast.success("Removed from wishlist");
    refreshWishlist();
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
};