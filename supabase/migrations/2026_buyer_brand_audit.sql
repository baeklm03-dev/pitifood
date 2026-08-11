-- ============================================================
-- PITI FOODS — created_by / updated_by audit for buyers & brands (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent). Purely additive.
-- ============================================================

alter table buyers add column if not exists created_by_id uuid;
alter table buyers add column if not exists created_by_name text;
alter table buyers add column if not exists updated_by_id uuid;
alter table buyers add column if not exists updated_by_name text;

alter table brands add column if not exists created_by_id uuid;
alter table brands add column if not exists created_by_name text;
alter table brands add column if not exists updated_by_id uuid;
alter table brands add column if not exists updated_by_name text;
