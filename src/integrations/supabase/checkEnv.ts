// src/integrations/supabase/checkEnv.ts
console.log("✅ Supabase Environment Check:");
console.log("VITE_SUPABASE_PROJECT_ID:", import.meta.env.VITE_SUPABASE_PROJECT_ID);
console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_PUBLISHABLE_KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 20) + "..."); // partial key for safety
