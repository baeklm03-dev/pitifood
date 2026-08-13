import { supabase } from '../lib/supabase';
import type { ProductionOrder, POLine } from '../types';
import type { ContractActor } from './contractService';
import { emptyLoadingRequirement, emptyDocumentRequirement } from '../utils/poRequirements';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLine(l: any): POLine {
  return {
    id: l.id,
    productType: l.product_type ?? '',
    brand: l.brand ?? undefined,
    size: l.size ?? '',
    packing: l.packing ?? '',
    mark: l.mark ?? '',
    sizeRm: l.size_rm ?? '',
    qtyCtn: Number(l.qty_ctn) || 0,
    qtyKg: Number(l.qty_kg) || 0,
    inStock: Number(l.in_stock) || 0,
    produceAdd: Number(l.produce_add) || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPO(row: any): ProductionOrder {
  const lines = (row.po_lines ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(mapLine);
  return {
    id: row.id,
    poNo: row.po_no,
    contractId: row.contract_id,
    contractNo: row.contract_no,
    buyerId: row.buyer_id ?? undefined,
    buyerName: row.buyer_name ?? undefined,
    subCompanyName: row.sub_company_name ?? undefined,
    destination: row.destination ?? undefined,
    attn: row.attn ?? undefined,
    poDate: row.po_date,
    deliveryNote: row.delivery_note ?? undefined,
    productRequirements: row.product_requirements ?? [],
    loadingRequirement: row.loading_requirement_rows ?? emptyLoadingRequirement(),
    loadingRequirementRemark: row.loading_requirement_remark ?? undefined,
    documentRequirement: row.document_requirement_rows ?? emptyDocumentRequirement(),
    documentRequirementRemark: row.document_requirement_remark ?? undefined,
    preparedBy: row.prepared_by ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    lines,
    status: row.status,
    createdById: row.created_by_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
    updatedById: row.updated_by_id ?? undefined,
    updatedByName: row.updated_by_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_QUERY = '*, po_lines(*)';

// Header fields excluding po_no (po_no is set once at create, never updated).
function headerBody(po: Omit<ProductionOrder, 'id' | 'poNo' | 'createdAt' | 'updatedAt' | 'lines'>) {
  return {
    contract_id: po.contractId,
    contract_no: po.contractNo,
    buyer_id: po.buyerId ?? null,
    buyer_name: po.buyerName ?? null,
    sub_company_name: po.subCompanyName ?? null,
    destination: po.destination ?? null,
    attn: po.attn ?? null,
    po_date: po.poDate,
    delivery_note: po.deliveryNote ?? null,
    product_requirements: po.productRequirements ?? [],
    loading_requirement_rows: po.loadingRequirement ?? emptyLoadingRequirement(),
    loading_requirement_remark: po.loadingRequirementRemark ?? null,
    document_requirement_rows: po.documentRequirement ?? emptyDocumentRequirement(),
    document_requirement_remark: po.documentRequirementRemark ?? null,
    prepared_by: po.preparedBy ?? null,
    approved_by: po.approvedBy ?? null,
    status: po.status,
  };
}

function linesPayload(poId: string, lines: POLine[]) {
  return lines.map((l, i) => ({
    po_id: poId,
    sort_order: i,
    product_type: l.productType,
    brand: l.brand ?? null,
    size: l.size,
    packing: l.packing,
    mark: l.mark,
    size_rm: l.sizeRm,
    qty_ctn: l.qtyCtn,
    qty_kg: l.qtyKg,
    in_stock: l.inStock,
    produce_add: l.produceAdd,
  }));
}

export const poService = {
  async getAll(): Promise<ProductionOrder[]> {
    const { data, error } = await supabase
      .from('production_orders')
      .select(SELECT_QUERY)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapPO);
  },

  async getById(id: string): Promise<ProductionOrder | null> {
    const { data, error } = await supabase
      .from('production_orders')
      .select(SELECT_QUERY)
      .eq('id', id)
      .single();
    if (error) return null;
    return mapPO(data);
  },

  async getByContract(contractId: string): Promise<ProductionOrder[]> {
    const { data, error } = await supabase
      .from('production_orders')
      .select(SELECT_QUERY)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapPO);
  },

  async create(po: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>, actor?: ContractActor): Promise<ProductionOrder> {
    const { lines, poNo, ...rest } = po;
    const { data, error } = await supabase
      .from('production_orders')
      .insert({
        po_no: poNo,
        ...headerBody(rest),
        created_by_id: actor?.id ?? null,
        created_by_name: actor?.name ?? null,
        updated_by_id: actor?.id ?? null,
        updated_by_name: actor?.name ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    if (lines.length > 0) {
      const { error: lErr } = await supabase.from('po_lines').insert(linesPayload(data.id, lines));
      if (lErr) throw lErr;
    }

    const result = await this.getById(data.id);
    return result!;
  },

  async update(id: string, po: Omit<ProductionOrder, 'id' | 'poNo' | 'createdAt' | 'updatedAt'>, actor?: ContractActor): Promise<void> {
    const { lines, ...rest } = po;
    const { error } = await supabase
      .from('production_orders')
      .update({
        ...headerBody(rest),
        updated_by_id: actor?.id ?? null,
        updated_by_name: actor?.name ?? null,
      })
      .eq('id', id);
    if (error) throw error;

    await supabase.from('po_lines').delete().eq('po_id', id);
    if (lines.length > 0) {
      const { error: lErr } = await supabase.from('po_lines').insert(linesPayload(id, lines));
      if (lErr) throw lErr;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('production_orders').delete().eq('id', id);
    if (error) throw error;
  },
};
