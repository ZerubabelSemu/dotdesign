import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PhoneNumber {
  id: string;
  phone_number: string;
  label: string;
  is_primary: boolean;
  is_active: boolean;
}

export interface ShopLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface PickupHour {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export const usePhoneNumbers = () => {
  return useQuery({
    queryKey: ["phone-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("is_active", true)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      return data as PhoneNumber[];
    },
  });
};

export const useShopLocations = () => {
  return useQuery({
    queryKey: ["shop-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_locations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ShopLocation[];
    },
  });
};

export const usePickupHours = (locationId?: string) => {
  return useQuery({
    queryKey: ["pickup-hours", locationId],
    queryFn: async () => {
      let query = supabase
        .from("pickup_hours")
        .select("*")
        .order("day_of_week");

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PickupHour[];
    },
    enabled: !!locationId,
  });
};

export const usePrimaryPhoneNumber = () => {
  return useQuery({
    queryKey: ["primary-phone"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("is_active", true)
        .eq("is_primary", true)
        .single();

      if (error) throw error;
      return data as PhoneNumber;
    },
  });
};

export const useMainShopLocation = () => {
  return useQuery({
    queryKey: ["main-shop-location"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_locations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      return data as ShopLocation;
    },
  });
};
