-- ============================================================
-- PITI FOODS — add currency to sale_contracts (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent). Purely additive.
-- ============================================================

alter table sale_contracts add column if not exists currency text not null default 'USD';
