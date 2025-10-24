import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialLink {
  id: string;
  platform: string; // e.g., 'Instagram', 'Facebook', 'Telegram'
  url: string;
  is_active: boolean;
  display_order: number;
}

export const useSocialLinks = () => {
  return useQuery({
    queryKey: ["social-links"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_links")
        .select("id, platform, url, is_active, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return (data || []) as SocialLink[];
    },
  });
};
