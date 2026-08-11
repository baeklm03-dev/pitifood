-- ============================================================
-- PITI FOODS — Production Order (PO) feature (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent)
-- ============================================================

-- ── Brand: PO packing detail (ข้อ 2 ของ PO) ──
alter table brands add column if not exists po_packing_detail text;

-- ── Buyer: PO loading requirement (ข้อ 3) + document requirement (ข้อ 4) ──
alter table buyers add column if not exists po_loading_requirement text;
alter table buyers add column if not exists po_document_requirement text;

-- ── production_orders (header) ──
create table if not exists production_orders (
  id uuid primary key default gen_random_uuid(),
  po_no text not null,
  contract_id uuid references sale_contracts(id) on delete restrict,
  contract_no text not null,
  buyer_id uuid,
  buyer_name text,
  sub_company_name text,
  destination text,
  attn text,
  po_date date not null,
  delivery_note text,          -- "กำหนดส่งมอบ" เช่น 1 x 40fcl ภายในเดือน...
  product_spec text,           -- ข้อ 1
  packing_detail text,         -- ข้อ 2 (default จาก brand)
  loading_requirement text,    -- ข้อ 3 (default จาก buyer)
  document_requirement text,   -- ข้อ 4 (default จาก buyer)
  prepared_by text,
  approved_by text,
  status text not null default 'draft',
  created_by_id uuid,
  created_by_name text,
  updated_by_id uuid,
  updated_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── po_lines (ตารางสินค้า) ──
create table if not exists po_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references production_orders(id) on delete cascade,
  sort_order int default 0,
  product_type text,
  size text,
  packing text,
  mark text,
  size_rm text,
  qty_ctn numeric default 0,
  qty_kg numeric default 0,
  in_stock numeric default 0,
  produce_add numeric default 0
);

create index if not exists po_lines_po_id_idx on po_lines(po_id);
create index if not exists production_orders_contract_id_idx on production_orders(contract_id);

-- ── RLS: authenticated users have full access (same as existing tables) ──
alter table production_orders enable row level security;
alter table po_lines enable row level security;

drop policy if exists "auth all production_orders" on production_orders;
create policy "auth all production_orders" on production_orders
  for all to authenticated using (true) with check (true);

drop policy if exists "auth all po_lines" on po_lines;
create policy "auth all po_lines" on po_lines
  for all to authenticated using (true) with check (true);
