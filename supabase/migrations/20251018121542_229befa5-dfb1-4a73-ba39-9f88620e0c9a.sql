-- Add hierarchical admin structure to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS promoted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS can_promote boolean NOT NULL DEFAULT false;

-- Create function to handle cascading demotion
CREATE OR REPLACE FUNCTION public.cascade_demote_admins(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recursively demote all admins promoted by this user and their branches
  WITH RECURSIVE admin_tree AS (
    -- Start with direct promotions
    SELECT user_id, promoted_by
    FROM user_roles
    WHERE promoted_by = _user_id AND role = 'admin'
    
    UNION ALL
    
    -- Recursively find all branches
    SELECT ur.user_id, ur.promoted_by
    FROM user_roles ur
    INNER JOIN admin_tree at ON ur.promoted_by = at.user_id
    WHERE ur.role = 'admin'
  )
  DELETE FROM user_roles
  WHERE user_id IN (SELECT user_id FROM admin_tree) AND role = 'admin';
END;
$$;

-- Add RLS policy for admin management
CREATE POLICY "Admins with can_promote can manage other admins"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND can_promote = true)
)
WITH CHECK (
  has_role(auth.uid(), 'admin') AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND can_promote = true)
);

-- Update the admin record to have full rights
UPDATE user_roles 
SET can_promote = true 
WHERE user_id = '04ae073d-d8b3-427f-8e60-28d20a153ae3' AND role = 'admin';

-- Promote the existing account to admin
INSERT INTO user_roles (user_id, role, can_promote) 
VALUES ('448469c2-8a3d-4313-8c52-094534b0d775', 'admin', true);

-- Remove the default admin (optional)
DELETE FROM user_roles 
WHERE user_id = '04ae073d-d8b3-427f-8e60-28d20a153ae3' AND role = 'admin';