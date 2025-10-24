-- Database Schema Updates for Enhanced Features

-- 1. Phone Numbers Management
CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  label text DEFAULT 'Primary',
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
-- 2. Shop Location Management
CREATE TABLE IF NOT EXISTS public.shop_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Main Store',
  address text NOT NULL,
  city text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ensure unique shop location names for idempotent inserts
CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_locations_name
  ON public.shop_locations(name);

-- 3. Pickup Hours Management
CREATE TABLE IF NOT EXISTS public.pickup_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid REFERENCES public.shop_locations(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ensure idempotency for location/day combinations
CREATE UNIQUE INDEX IF NOT EXISTS uq_pickup_hours_loc_day
  ON public.pickup_hours(location_id, day_of_week);

-- 4. Product Sizes Management (skipped; using existing public.product_variants)

-- 5. Payment Methods Management
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL, -- 'mobile_money', 'bank_transfer', 'cash'
  account_number text,
  account_name text,
  phone_number text,
  instructions text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Add payment_receipt_url to orders table if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_receipt_url text;

-- 7. Add payment_status to orders table if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- RLS Policies for new tables

ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active phone numbers"
ON public.phone_numbers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage phone numbers"
ON public.phone_numbers
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.shop_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active shop locations"
ON public.shop_locations
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage shop locations"
ON public.shop_locations
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.pickup_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view pickup hours"
ON public.pickup_hours
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pickup hours"
ON public.pickup_hours
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- No product_sizes policies required; sizes are handled via public.product_variants

-- Payment Methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active payment methods"
ON public.payment_methods
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage payment methods"
ON public.payment_methods
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default data

-- Default phone number
INSERT INTO public.phone_numbers (phone_number, label, is_primary, is_active)
VALUES ('+251 926 765 309', 'Primary', true, true)
ON CONFLICT DO NOTHING;

-- Default shop location
INSERT INTO public.shop_locations (name, address, city, latitude, longitude, phone, email, is_active)
VALUES (
  'Main Store',
  '123 Fashion Street',
  'Addis Ababa',
  9.0054,
  38.7636,
  '+251 926 765 309',
  'info@dotdesign.com',
  true
)
ON CONFLICT DO NOTHING;

-- Default pickup hours (Monday-Saturday 9AM-6PM, Sunday closed)
INSERT INTO public.pickup_hours (location_id, day_of_week, open_time, close_time, is_closed)
SELECT 
  sl.id,
  g.d as day_of_week,
  CASE 
    WHEN g.d = 0 THEN NULL -- Sunday closed
    ELSE '09:00'::time
  END as open_time,
  CASE 
    WHEN g.d = 0 THEN NULL -- Sunday closed
    ELSE '18:00'::time
  END as close_time,
  CASE 
    WHEN g.d = 0 THEN true -- Sunday closed
    ELSE false
  END as is_closed
FROM public.shop_locations sl
CROSS JOIN generate_series(0, 6) AS g(d)
WHERE sl.name = 'Main Store'
ON CONFLICT (location_id, day_of_week) DO NOTHING;

-- Default payment methods
INSERT INTO public.payment_methods (name, type, account_number, account_name, phone_number, instructions, is_active, display_order)
VALUES 
  ('Telebirr', 'mobile_money', NULL, NULL, '+251 911 234567', 'Send payment via Telebirr mobile money', true, 1),
  ('Commercial Bank of Ethiopia', 'bank_transfer', '1000123456789', 'Your Store Name', NULL, 'Transfer to CBE account', true, 2),
  ('Zemen Bank', 'bank_transfer', '9876543210000', 'Your Store Name', NULL, 'Transfer to Zemen Bank account', true, 3)
ON CONFLICT DO NOTHING;

-- Create storage bucket for payment receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment receipts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read payment-receipts'
  ) THEN
    CREATE POLICY "Public read payment-receipts"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'payment-receipts');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload payment-receipts'
  ) THEN
    CREATE POLICY "Authenticated upload payment-receipts"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-receipts');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own payment-receipts'
  ) THEN
    CREATE POLICY "Users can update own payment-receipts"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'payment-receipts' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'payment-receipts' AND owner = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own payment-receipts'
  ) THEN
    CREATE POLICY "Users can delete own payment-receipts"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'payment-receipts' AND owner = auth.uid());
  END IF;
END
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- 9. Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers' AND policyname = 'Allow insert for anon and authenticated'
  ) THEN
    CREATE POLICY "Allow insert for anon and authenticated"
    ON public.newsletter_subscribers
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers' AND policyname = 'Admins can select subscribers'
  ) THEN
    CREATE POLICY "Admins can select subscribers"
    ON public.newsletter_subscribers
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Secure function: list auth users for admins (by email/name)
CREATE OR REPLACE FUNCTION public.list_auth_users(search text DEFAULT '')
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email, p.full_name, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE (
    search IS NULL OR search = '' OR
    u.email ILIKE '%' || search || '%' OR
    COALESCE(p.full_name, '') ILIKE '%' || search || '%'
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.list_auth_users(text) TO authenticated;

-- Contact messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Allow inserts for anon and authenticated'
  ) THEN
    CREATE POLICY "Allow inserts for anon and authenticated"
    ON public.contact_messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Allow select for admins only'
  ) THEN
    CREATE POLICY "Allow select for admins only"
    ON public.contact_messages
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      )
    );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- 8. Social Links Management
CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL, -- e.g., 'Instagram', 'Facebook', 'Telegram'
  url text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'social_links' AND policyname = 'Public can view active social links'
  ) THEN
    CREATE POLICY "Public can view active social links"
    ON public.social_links
    FOR SELECT
    USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'social_links' AND policyname = 'Admins can manage social links'
  ) THEN
    CREATE POLICY "Admins can manage social links"
    ON public.social_links
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Seed defaults if none exist
INSERT INTO public.social_links (platform, url, is_active, display_order)
SELECT * FROM (VALUES
  ('Instagram', 'https://instagram.com/yourprofile', true, 1),
  ('Facebook', 'https://facebook.com/yourpage', true, 2)
) AS v(platform, url, is_active, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.social_links);

NOTIFY pgrst, 'reload schema';
