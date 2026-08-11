-- ============================================================
-- PITI FOODS — customer feedback update (2026)
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent: IF NOT EXISTS + guarded UPDATE)
-- ============================================================

-- ── ข้อ 6 + 7: brand tag product types + หลายขนาด packing ──
alter table brands add column if not exists product_types text[] default '{}';
alter table brands add column if not exists packing_sizes text[] default '{}';

-- ย้าย default_packing เดิมเข้า packing_sizes (ครั้งเดียว)
update brands
set packing_sizes = array[default_packing]
where default_packing is not null
  and default_packing <> ''
  and coalesce(array_length(packing_sizes, 1), 0) = 0;

-- ── ข้อ 8: audit — created_by / updated_by (snapshot ชื่อ + id) ──
alter table sale_contracts add column if not exists created_by_id uuid;
alter table sale_contracts add column if not exists created_by_name text;
alter table sale_contracts add column if not exists updated_by_id uuid;
alter table sale_contracts add column if not exists updated_by_name text;
