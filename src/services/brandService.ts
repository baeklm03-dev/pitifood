import { supabase } from '../lib/supabase';
import type { Brand } from '../types';
import type { ContractActor } from './contractService';
import { emptyProductSpec, emptyPackingDetail } from '../utils/poRequirements';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBrand(row: any): Brand {
  return {
    id: row.id,
    brandName: row.brand_name,
    buyerId: row.buyer_id,
    buyerCode: row.buyer_code,
    productTypes: row.product_types ?? [],
    packingSizes: row.packing_sizes ?? [],
    productSpec: row.product_spec_rows ?? emptyProductSpec(),
    productSpecRemark: row.product_spec_remark ?? undefined,
    packingDetail: row.packing_detail_rows ?? emptyPackingDetail(),
    packingDetailRemark: row.packing_detail_remark ?? undefined,
    defaultPacking: row.default_packing ?? undefined,
    defaultOrigin: row.default_origin ?? undefined,
    notes: row.notes ?? undefined,
    createdById: row.created_by_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
    updatedById: row.updated_by_id ?? undefined,
    updatedByName: row.updated_by_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function brandBody(brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'createdByName' | 'updatedById' | 'updatedByName'>) {
  return {
    brand_name: brand.brandName,
    buyer_id: brand.buyerId,
    buyer_code: brand.buyerCode,
    product_types: brand.productTypes ?? [],
    packing_sizes: brand.packingSizes ?? [],
    product_spec_rows: brand.productSpec ?? emptyProductSpec(),
    product_spec_remark: brand.productSpecRemark ?? null,
    packing_detail_rows: brand.packingDetail ?? emptyPackingDetail(),
    packing_detail_remark: brand.packingDetailRemark ?? null,
    default_packing: brand.defaultPacking ?? null,
    default_origin: brand.defaultOrigin ?? null,
    notes: brand.notes ?? null,
  };
}

export const brandService = {
  async getAll(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('brand_name');
    if (error) throw error;
    return (data ?? []).map(mapBrand);
  },

  async getById(id: string): Promise<Brand | null> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return mapBrand(data);
  },

  async getByBuyerId(buyerId: string): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('brand_name');
    if (error) throw error;
    return (data ?? []).map(mapBrand);
  },

  async create(brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>, actor?: ContractActor): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .insert({
        ...brandBody(brand),
        created_by_id: actor?.id ?? null,
        created_by_name: actor?.name ?? null,
        updated_by_id: actor?.id ?? null,
        updated_by_name: actor?.name ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapBrand(data);
  },

  async update(id: string, brand: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>, actor?: ContractActor): Promise<void> {
    const { error } = await supabase
      .from('brands')
      .update({
        ...brandBody(brand),
        updated_by_id: actor?.id ?? null,
        updated_by_name: actor?.name ?? null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
  },
};
