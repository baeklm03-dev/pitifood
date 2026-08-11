-- ============================================================
-- PITI FOODS — PO requirements v3: per-product spec/packing (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent). Purely additive — does not touch or
-- drop production_orders.product_spec_rows / product_spec_remark /
-- packing_detail_rows / packing_detail_remark, which are superseded
-- by product_requirements below and no longer read by the app.
-- ============================================================

-- ── po_lines: which brand each line belongs to (a PO can span >1 product/brand) ──
alter table po_lines add column if not exists brand text;

-- ── production_orders: one product-spec + packing-detail block per product/brand ──
alter table production_orders add column if not exists product_requirements jsonb not null default '[]'::jsonb;
