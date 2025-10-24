import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  size?: string;
  variantId?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  refreshPrices: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    setItems((prev) => {
      const existingItem = prev.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );

      if (existingItem) {
        return prev.map((i) =>
          i.id === existingItem.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }

      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const refreshPrices = async () => {
    try {
      if (items.length === 0) return;
      const productIds = Array.from(new Set(items.map(i => i.productId)));
      const { data, error } = await (supabase as any)
        .from("products")
        .select(`id, price, product_variants(id, price_adjustment)`) 
        .in('id', productIds);
      if (error) throw error;
      const prodMap = new Map<string, { price: number; variants: Array<{ id: string; price_adjustment: number }> }>();
      for (const p of (data || [])) {
        if (!productIds.includes(p.id)) continue;
        prodMap.set(p.id, { price: Number(p.price), variants: (p.product_variants || []).map((v: any) => ({ id: v.id, price_adjustment: Number(v.price_adjustment || 0) })) });
      }
      setItems(prev => prev.map(it => {
        const prod = prodMap.get(it.productId);
        if (!prod) return it;
        const adj = it.variantId ? (prod.variants.find(v => v.id === it.variantId)?.price_adjustment || 0) : 0;
        const effective = Number(prod.price) + Number(adj);
        return { ...it, price: effective };
      }));
    } catch (e) {
      // ignore and keep existing prices
      console.warn("refreshPrices failed", e);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        refreshPrices,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
