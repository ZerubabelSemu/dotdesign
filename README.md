# DotDesign

This is a production‑grade e‑commerce application I built for DotDesign. It delivers a modern storefront, a secure admin panel, and local‑market integrations. The codebase emphasizes clarity, maintainability, and predictable behavior in production.

## Features
- **Storefront**: Category filters, search, wishlist, product detail, cart, and checkout.
- **Admin Panel**: Full CRUD for products, categories, orders, phone numbers, shop locations, payment methods, and admins.
- **Locations**: Leaflet map picker for coordinates; pickup hours management.
- **Dashboard**: KPIs with 7d/30d/custom range filters and lightweight charts.
- **Auth & Roles**: Email auth and role‑based admin access.
- **Contact**: Messages saved to `public.contact_messages` (admins can read).

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Data**: TanStack Query
- **Routing**: React Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage)

## Requirements
- Node.js 18+
- npm 9+
- Supabase project (URL + anon key)

## Environment
Copy the template and fill your values:
```bash
cp .env.example .env
```
`.env` keys:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID` (optional)

## Setup
```bash
npm install
npm run dev
# open http://localhost:8080
```

## Scripts
- `npm run dev` — Start the Vite dev server
- `npm run build` — Production build
- `npm run preview` — Preview production build

## Database & Security
- Migrations and policies are consolidated in `database_schema_updates.sql`.
- RLS is enabled and enforced across tables.
- Admin checks use explicit `EXISTS` on `public.user_roles`.
- `payments.payment_receipt_url` stores full URLs.
- `public.contact_messages` allows insert for anon/auth; select only for admins.

## Deployment
Use any static hosting (e.g., Netlify, Vercel) with the environment variables above. Ensure your Supabase policies are deployed and your environment keys are set on the host.

## Troubleshooting
- **Invalid API key**: Verify `.env` values and restart the dev server.
- **Access denied to admin**: Ensure your user has an `admin` role in `public.user_roles`.
- **Types mismatch**: Regenerate Supabase types or keep targeted `(supabase as any)` casts where schema is ahead of generated types.
- **Leaflet icons not visible**: Vite needs explicit icon URLs; I configure them in `src/pages/admin/ShopLocations.tsx`.

## Conventions
- React components and pages under `src/pages/` and `src/components/`.
- Hooks under `src/hooks/`.
- Admin routes begin with `/admin` (see `src/App.tsx`).
- Code formatted with Prettier defaults; Tailwind utility‑first styling.

## License
All rights reserved.
