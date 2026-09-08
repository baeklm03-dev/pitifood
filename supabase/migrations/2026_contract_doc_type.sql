-- ============================================================
-- PITI FOODS — doc_type on sale_contracts (Sale Contract vs Proforma Invoice) (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent). Purely additive.
-- ============================================================

alter table sale_contracts add column if not exists doc_type text not null default 'sale_contract';

alter table sale_contracts drop constraint if exists sale_contracts_doc_type_check;
alter table sale_contracts add constraint sale_contracts_doc_type_check
  check (doc_type in ('sale_contract', 'proforma_invoice'));
