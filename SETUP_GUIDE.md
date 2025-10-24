# DotDesign — Setup Guide

This guide documents how I set up, run, and deploy the project. It’s written to be explicit enough for another developer to get productive quickly.

## Prerequisites
- Node.js 18+ and npm 9+
- A Supabase project (Project URL and anon key)

## 1) Environment
Create your environment file from the template and populate with your Supabase values.
```bash
cp .env.example .env
```
Required keys in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID` (optional)

## 2) Database
Apply database objects and policies using the consolidated SQL file.
- Open the Supabase SQL editor.
- Paste the contents of `database_schema_updates.sql`.
- Run the script. It is idempotent and safe to re‑run.

Notes:
- RLS is enabled across tables; policies allow only necessary operations.
- Admin checks use `EXISTS` against `public.user_roles`.
- `public.contact_messages` allows insert for anon/auth and select only for admins.

## 3) Development
Install dependencies and start the dev server.
```bash
npm install
npm run dev
# open http://localhost:8080
```

If using the shop locations map picker, install Leaflet locally:
```bash
npm i leaflet @types/leaflet
```

## 4) Admin Access
To access `/admin`, the authenticated user must have an admin role.

Option A — via SQL:
```sql
-- Replace 'your-user-id' with the authenticated user's id
INSERT INTO public.user_roles (user_id, role, can_promote)
VALUES ('your-user-id', 'admin', true)
ON CONFLICT (user_id, role) DO UPDATE SET can_promote = EXCLUDED.can_promote;
```

Option B — from the Admins page:
- Promote by selecting a user from the searchable list (email based), if you already have an admin.

## 5) Deployment
Build and host as a static site (Netlify, Vercel, etc.). Ensure environment variables are set on the host and Supabase policies are in place.
```bash
npm run build
npm run preview  # optional local preview
```

## 6) Verification Checklist
- [ ] `.env` configured and loaded
- [ ] Database migrations applied successfully
- [ ] Admin user created (can access `/admin`)
- [ ] Shop locations map picker renders and updates lat/lng
- [ ] Dashboard charts render and update across ranges
- [ ] Contact page submissions appear in `/admin/messages`

## Troubleshooting
- **Invalid API key**: Re‑check `.env` and restart dev server.
- **Admin access denied**: Verify `public.user_roles` contains your user with role `admin`.
- **Type mismatch errors**: Regenerate Supabase types or use targeted casts as done in the codebase.
- **Leaflet icons missing**: Vite requires explicit icon URLs; the app configures them in `src/pages/admin/ShopLocations.tsx`.

