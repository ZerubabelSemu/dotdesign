-- Add delivery_type to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup'));

-- Add payment_receipt_url to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_receipt_url text;

-- Update orders to make delivery address nullable for pickup orders
ALTER TABLE orders ALTER COLUMN delivery_address DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN delivery_city DROP NOT NULL;

-- Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on wishlist
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Wishlist policies
CREATE POLICY "Users can view own wishlist"
  ON wishlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own wishlist"
  ON wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own wishlist"
  ON wishlist FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment receipts
CREATE POLICY "Users can upload own payment receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own payment receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all payment receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts' AND
    has_role(auth.uid(), 'admin'::app_role)
  );