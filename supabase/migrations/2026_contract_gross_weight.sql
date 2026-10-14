-- ============================================================
-- PITI FOODS — add Gross Weight to sale_contracts (2026)
-- NOTE: the Dashboard SQL Editor times out on this project; apply this over a
-- direct Postgres connection instead (db.<ref>.supabase.co:5432).
-- Safe to re-run (idempotent). Purely additive.
-- ============================================================

alter table sale_contracts add column if not exists gross_weight text;
