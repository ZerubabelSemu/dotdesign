# DotDesign — Project Summary

This repository contains a production-grade e‑commerce application I engineered end‑to‑end for DotDesign. It includes a modern storefront, a secure admin panel, and integrations tailored for the local market. The system is designed for clarity, maintainability, and predictable operations in production.

## Purpose and Scope
- Provide a performant, mobile‑first storefront with categories, search, wishlist, and a smooth checkout experience.
- Offer a secure admin panel with full CRUD for catalog, locations, payments, and orders; plus role management.
- Support Ethiopian payment context and shop pickup operations with location coordinates and pickup hours.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite, TailwindCSS, shadcn/ui, React Router, TanStack Query.
- **Backend**: Supabase (PostgreSQL, Auth, Storage) with RLS and explicit policies.
- **Data Access**: Typed queries with Supabase client; RPC where beneficial; guarded casts when generated types lag schema.

## Key Features
- **Catalog**: Products, categories (slugged), variants, images, low‑stock highlighting.
- **Cart & Orders**: End‑to‑end order flow with payment receipt URL storage.
- **Admin Panel**: Products, categories, orders, phone numbers, shop locations (Leaflet map picker), payment methods, admins.
- **Dashboard**: KPIs, range filters (7d/30d/custom), basic charts for revenue and orders over time.
- **Auth & Roles**: Email auth, `user_roles` with admin gating and promotion controls.
- **Contact Messages**: Public “Get in Touch” form writes to `public.contact_messages` (admin‑read only).

## Security and Data Integrity
- **RLS** enforced across tables with targeted policies.
- **Admin gating** is implemented explicitly via `EXISTS` on `public.user_roles` rather than relying on custom SQL helpers.
- **Uploads/URLs**: `payments.payment_receipt_url` stores full URLs, eliminating client‑side path resolution.
- **Least privilege**: Insert for `contact_messages` allowed to anon/auth; select limited to admins.

## Notable Decisions
- **Leaflet over proprietary maps**: No API key required, reliable OSM tiles, simple picker for coordinates.
- **Type safety pragmatism**: Where Supabase generated types lag schema additions, I use narrow `(supabase as any)` casts locally with array guards; recommend regenerating types post‑migration.
- **Simple charts first**: Lightweight bar charts avoid heavy chart libs and keep the dashboard fast.

## Operational Readiness
- Environment templating via `.env.example`.
- Database migrations consolidated in `database_schema_updates.sql` with idempotent policy creation.
- Build and dev scripts ready; vite dev server on 8080.

## Short Roadmap
- Add test coverage for critical flows (auth, checkout, admin CRUD).
- Regenerate Supabase types after every migration to remove temporary casts.
- Optional: Enhance charts (tooltips/legends), export CSV for orders/messages, and add audits on admin actions.

## Quick Start
- Copy `.env.example` to `.env` and fill Supabase values.
- Run `npm install` then `npm run dev`.
- Access `/admin`; admin role is required (see setup guide for promotion path).

