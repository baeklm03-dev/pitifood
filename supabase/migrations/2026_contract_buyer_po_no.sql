-- ============================================================
-- PITI FOODS — add the buyer's P/O No. to sale_contracts (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent). Purely additive.
-- ============================================================

alter table sale_contracts add column if not exists buyer_po_no text;
