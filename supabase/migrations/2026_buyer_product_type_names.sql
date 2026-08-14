-- ============================================================
-- PITI FOODS — per-buyer product type name overrides (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent).
-- ============================================================

alter table buyers add column if not exists product_type_name_overrides jsonb not null default '{}'::jsonb;
