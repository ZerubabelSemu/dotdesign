import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  featured: boolean;
  published: boolean;
  category_id: string | null;
  material: string | null;
  care_instructions: string | null;
  category?: {
    name: string;
    slug: string;
  };
  product_images: Array<{
    id: string;
    image_url: string;
    alt_text: string | null;
    display_order: number;
  }>;
  product_variants?: Array<{
    id: string;
    size: string | null;
    color: string | null;
    stock: number;
    price_adjustment: number;
  }>;
}

export const useProducts = (categorySlug?: string) => {
  return useQuery({
    queryKey: ["products", categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          category:categories${categorySlug && categorySlug !== "all" ? "!inner" : ""}(name, slug),
          product_images(id, image_url, alt_text, display_order)
        `)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (categorySlug && categorySlug !== "all") {
        query = query.eq("categories.slug", categorySlug);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useFeaturedProducts = () => {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images(id, image_url, alt_text, display_order)
        `)
        .eq("published", true)
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name, slug),
          product_images(id, image_url, alt_text, display_order),
          product_variants(id, size, color, stock, price_adjustment)
        `)
        .eq("id", id)
        .eq("published", true)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
};
