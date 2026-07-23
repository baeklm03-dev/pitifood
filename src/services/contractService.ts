import { supabase } from '../lib/supabase';
import type { SaleContract, ProductLine, Signatory } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductLine(pl: any): ProductLine {
  const qty = Number(pl.quantity);
  const nwt = Number(pl.net_weight_per_carton);
  const price = Number(pl.unit_price);
  const totalWeight = qty * nwt;
  const weightForPrice = pl.size_unit === 'Lb' ? totalWeight * 2.20462 : totalWeight;
  return {
    id: pl.id,
    productType: pl.product_type,
    size: pl.size,
    sizeUnit: pl.size_unit as 'kg' | 'Lb',
    brand: pl.brand,
    packing: pl.packing,
    quantity: qty,
    netWeightPerCarton: nwt,
    unitPrice: price,
    totalWeight,
    totalAmount: weightForPrice * price,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSignatory(s: any): Signatory {
  return { label: s.label, fullName: s.full_name, title: s.title ?? undefined };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContract(row: any): SaleContract {
  const productLines = (row.product_lines ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(mapProductLine);

  const signatories = (row.signatories ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(mapSignatory);

  return {
    id: row.id,
    contractNo: row.contract_no,
    buyerId: row.buyer_id,
    buyerCode: row.buyer_code,
    buyerName: row.buyer_name,
    subCompanyId: row.sub_company_id ?? undefined,
    subCompanyName: row.sub_company_name ?? undefined,
    offerDate: row.offer_date,
    eta: row.eta ?? undefined,
    shipmentPeriod: row.shipment_period ?? undefined,
    shipmentMonth: row.shipment_month ?? undefined,
    shipmentYear: row.shipment_year ?? undefined,
    portOfLoading: row.port_of_loading ?? undefined,
    portOfDischarge: row.port_of_discharge ?? undefined,
    incoterm: row.incoterm ?? undefined,
    paymentTerms: row.payment_terms ?? '',
    containerQty: row.container_qty ?? undefined,
    containerType: row.container_type ?? undefined,
    packingStyle: row.packing_style ?? undefined,
    productLines,
    signatories,
    remarks: row.remarks ?? undefined,
    status: row.status,
    isLocked: row.is_locked,
    signedFileUrl: row.signed_file_url ?? undefined,
    signedFileName: row.signed_file_name ?? undefined,
    signedAt: row.signed_at ?? undefined,
    parentContractId: row.parent_contract_id ?? undefined,
    revision: row.revision ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_QUERY = '*, product_lines(*), signatories(*)';

export const contractService = {
  async getAll(): Promise<SaleContract[]> {
    const { data, error } = await supabase
      .from('sale_contracts')
      .select(SELECT_QUERY)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapContract);
  },

  async getById(id: string): Promise<SaleContract | null> {
    const { data, error } = await supabase
      .from('sale_contracts')
      .select(SELECT_QUERY)
      .eq('id', id)
      .single();
    if (error) return null;
    return mapContract(data);
  },

  async create(contract: Omit<SaleContract, 'id' | 'createdAt' | 'updatedAt'>): Promise<SaleContract> {
    const { productLines, signatories, signedFileUrl, signedFileName, signedAt, ...rest } = contract;

    const { data, error } = await supabase
      .from('sale_contracts')
      .insert({
        contract_no: rest.contractNo,
        buyer_id: rest.buyerId,
        buyer_code: rest.buyerCode,
        buyer_name: rest.buyerName,
        sub_company_id: rest.subCompanyId ?? null,
        sub_company_name: rest.subCompanyName ?? null,
        offer_date: rest.offerDate,
        eta: rest.eta ?? null,
        shipment_period: rest.shipmentPeriod ?? null,
        shipment_month: rest.shipmentMonth ?? null,
        shipment_year: rest.shipmentYear ?? null,
        port_of_loading: rest.portOfLoading ?? null,
        port_of_discharge: rest.portOfDischarge ?? null,
        incoterm: rest.incoterm ?? null,
        payment_terms: rest.paymentTerms,
        container_qty: rest.containerQty ?? null,
        container_type: rest.containerType ?? null,
        packing_style: rest.packingStyle ?? null,
        remarks: rest.remarks ?? null,
        status: rest.status,
        is_locked: rest.isLocked,
        signed_file_url: signedFileUrl ?? null,
        signed_file_name: signedFileName ?? null,
        signed_at: signedAt ?? null,
        parent_contract_id: rest.parentContractId ?? null,
        revision: rest.revision,
      })
      .select()
      .single();
    if (error) throw error;

    if (productLines.length > 0) {
      const { error: plErr } = await supabase.from('product_lines').insert(
        productLines.map((pl, i) => ({
          contract_id: data.id,
          sort_order: i,
          product_type: pl.productType,
          size: pl.size,
          size_unit: pl.sizeUnit,
          brand: pl.brand,
          packing: pl.packing,
          quantity: pl.quantity,
          net_weight_per_carton: pl.netWeightPerCarton,
          unit_price: pl.unitPrice,
        }))
      );
      if (plErr) throw plErr;
    }

    if (signatories.length > 0) {
      const { error: sigErr } = await supabase.from('signatories').insert(
        signatories.map((s, i) => ({
          contract_id: data.id,
          sort_order: i,
          label: s.label,
          full_name: s.fullName,
          title: s.title ?? null,
        }))
      );
      if (sigErr) throw sigErr;
    }

    const result = await this.getById(data.id);
    return result!;
  },

  async update(
    id: string,
    contract: Omit<SaleContract, 'id' | 'contractNo' | 'revision' | 'parentContractId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const { productLines, signatories, signedFileUrl, signedFileName, signedAt, ...rest } = contract;

    const { error } = await supabase
      .from('sale_contracts')
      .update({
        buyer_id: rest.buyerId,
        buyer_code: rest.buyerCode,
        buyer_name: rest.buyerName,
        sub_company_id: rest.subCompanyId ?? null,
        sub_company_name: rest.subCompanyName ?? null,
        offer_date: rest.offerDate,
        eta: rest.eta ?? null,
        shipment_period: rest.shipmentPeriod ?? null,
        shipment_month: rest.shipmentMonth ?? null,
        shipment_year: rest.shipmentYear ?? null,
        port_of_loading: rest.portOfLoading ?? null,
        port_of_discharge: rest.portOfDischarge ?? null,
        incoterm: rest.incoterm ?? null,
        payment_terms: rest.paymentTerms,
        container_qty: rest.containerQty ?? null,
        container_type: rest.containerType ?? null,
        packing_style: rest.packingStyle ?? null,
        remarks: rest.remarks ?? null,
        status: rest.status,
        is_locked: rest.isLocked,
      })
      .eq('id', id);
    if (error) throw error;

    await supabase.from('product_lines').delete().eq('contract_id', id);
    if (productLines.length > 0) {
      const { error: plErr } = await supabase.from('product_lines').insert(
        productLines.map((pl, i) => ({
          contract_id: id,
          sort_order: i,
          product_type: pl.productType,
          size: pl.size,
          size_unit: pl.sizeUnit,
          brand: pl.brand,
          packing: pl.packing,
          quantity: pl.quantity,
          net_weight_per_carton: pl.netWeightPerCarton,
          unit_price: pl.unitPrice,
        }))
      );
      if (plErr) throw plErr;
    }

    await supabase.from('signatories').delete().eq('contract_id', id);
    if (signatories.length > 0) {
      const { error: sigErr } = await supabase.from('signatories').insert(
        signatories.map((s, i) => ({
          contract_id: id,
          sort_order: i,
          label: s.label,
          full_name: s.fullName,
          title: s.title ?? null,
        }))
      );
      if (sigErr) throw sigErr;
    }
  },

  async uploadSignedFile(contractId: string, file: File): Promise<void> {
    const ext = file.name.split('.').pop() ?? 'pdf';
    const path = `${contractId}/signed.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('signed-contracts')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { error } = await supabase
      .from('sale_contracts')
      .update({
        signed_file_url: path,
        signed_file_name: file.name,
        signed_at: new Date().toISOString(),
        status: 'locked',
        is_locked: true,
      })
      .eq('id', contractId);
    if (error) throw error;
  },

  async getSignedFileUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('signed-contracts')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('sale_contracts').delete().eq('id', id);
    if (error) throw error;
  },
};
