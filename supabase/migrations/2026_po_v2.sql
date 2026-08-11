-- ============================================================
-- PITI FOODS — PO requirement sections v2: structured rows (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent). Purely additive — does not touch
-- or drop the older po_packing_detail / default_spec /
-- po_loading_requirement / po_document_requirement / product_spec /
-- packing_detail / loading_requirement / document_requirement
-- columns, which are no longer read by the app after this change.
-- ============================================================

-- ── Brands: structured ข้อ 1 (product spec) + ข้อ 2 (packing detail) ──
alter table brands add column if not exists product_spec_rows jsonb not null default '[]'::jsonb;
alter table brands add column if not exists product_spec_remark text;
alter table brands add column if not exists packing_detail_rows jsonb not null default '[]'::jsonb;
alter table brands add column if not exists packing_detail_remark text;

-- ── Buyers: structured ข้อ 3 (loading) + ข้อ 4 (documents) ──
alter table buyers add column if not exists loading_requirement_rows jsonb not null default '[]'::jsonb;
alter table buyers add column if not exists loading_requirement_remark text;
alter table buyers add column if not exists document_requirement_rows jsonb not null default '[]'::jsonb;
alter table buyers add column if not exists document_requirement_remark text;

-- ── production_orders: per-PO editable copy of all four sections ──
alter table production_orders add column if not exists product_spec_rows jsonb not null default '[]'::jsonb;
alter table production_orders add column if not exists product_spec_remark text;
alter table production_orders add column if not exists packing_detail_rows jsonb not null default '[]'::jsonb;
alter table production_orders add column if not exists packing_detail_remark text;
alter table production_orders add column if not exists loading_requirement_rows jsonb not null default '[]'::jsonb;
alter table production_orders add column if not exists loading_requirement_remark text;
alter table production_orders add column if not exists document_requirement_rows jsonb not null default '[]'::jsonb;
alter table production_orders add column if not exists document_requirement_remark text;
