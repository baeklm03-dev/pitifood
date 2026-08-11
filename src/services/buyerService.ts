import { supabase } from '../lib/supabase';
import type { Buyer, SubCompany } from '../types';
import type { ContractActor } from './contractService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubCompany(sc: any): SubCompany {
  return {
    id: sc.id,
    name: sc.name,
    address: sc.address ?? undefined,
    contactPerson: sc.contact_person ?? undefined,
    phone: sc.phone ?? undefined,
    email: sc.email ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBuyer(row: any): Buyer {
  return {
    id: row.id,
    code: row.code,
    companyName: row.company_name,
    address: row.address ?? undefined,
    country: row.country ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    paymentTerms: row.payment_terms ?? '',
    portOfLoading: row.port_of_loading ?? undefined,
    portOfDischarge: row.port_of_discharge ?? undefined,
    incoterm: row.incoterm ?? undefined,
    loadingRequirementRows: row.loading_requirement_rows ?? [],
    loadingRequirementRemark: row.loading_requirement_remark ?? undefined,
    documentRequirementRows: row.document_requirement_rows ?? [],
    documentRequirementRemark: row.document_requirement_remark ?? undefined,
    hasSubCompanies: row.has_sub_companies ?? false,
    subCompanies: (row.sub_companies ?? []).map(mapSubCompany),
    createdById: row.created_by_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
    updatedById: row.updated_by_id ?? undefined,
    updatedByName: row.updated_by_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buyerBody(buyer: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt' | 'subCompanies' | 'createdById' | 'createdByName' | 'updatedById' | 'updatedByName'>) {
  return {
    code: buyer.code,
    company_name: buyer.companyName,
    address: buyer.address ?? null,
    country: buyer.country ?? null,
    contact_person: buyer.contactPerson ?? null,
    phone: buyer.phone ?? null,
    email: buyer.email ?? null,
    payment_terms: buyer.paymentTerms,
    port_of_loading: buyer.portOfLoading ?? null,
    port_of_discharge: buyer.portOfDischarge ?? null,
    incoterm: buyer.incoterm ?? null,
    loading_requirement_rows: buyer.loadingRequirementRows ?? [],
    loading_requirement_remark: buyer.loadingRequirementRemark ?? null,
    document_requirement_rows: buyer.documentRequirementRows ?? [],
    document_requirement_remark: buyer.documentRequirementRemark ?? null,
    has_sub_companies: buyer.hasSubCompanies,
  };
}

export const buyerService = {
  async getAll(): Promise<Buyer[]> {
    const { data, error } = await supabase
      .from('buyers')
      .select('*, sub_companies(*)')
      .order('code');
    if (error) throw error;
    return (data ?? []).map(mapBuyer);
  },

  async getById(id: string): Promise<Buyer | null> {
    const { data, error } = await supabase
      .from('buyers')
      .select('*, sub_companies(*)')
      .eq('id', id)
      .single();
    if (error) return null;
    return mapBuyer(data);
  },

  async create(buyer: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt'>, actor?: ContractActor): Promise<Buyer> {
    const { data, error } = await supabase
      .from('buyers')
      .insert({
        ...buyerBody(buyer),
        created_by_id: actor?.id ?? null,
        created_by_name: actor?.name ?? null,
        updated_by_id: actor?.id ?? null,
        updated_by_name: actor?.name ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    if (buyer.hasSubCompanies && buyer.subCompanies.length > 0) {
      const { error: scErr } = await supabase.from('sub_companies').insert(
        buyer.subCompanies.map((sc) => ({
          buyer_id: data.id,
          name: sc.name,
          address: sc.address ?? null,
          contact_person: sc.contactPerson ?? null,
          phone: sc.phone ?? null,
          email: sc.email ?? null,
        }))
      );
      if (scErr) throw scErr;
    }

    const result = await this.getById(data.id);
    return result!;
  },

  async update(id: string, buyer: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt'>, actor?: ContractActor): Promise<void> {
    const { error } = await supabase
      .from('buyers')
      .update({
        ...buyerBody(buyer),
        updated_by_id: actor?.id ?? null,
        updated_by_name: actor?.name ?? null,
      })
      .eq('id', id);
    if (error) throw error;

    await supabase.from('sub_companies').delete().eq('buyer_id', id);

    if (buyer.hasSubCompanies && buyer.subCompanies.length > 0) {
      const { error: scErr } = await supabase.from('sub_companies').insert(
        buyer.subCompanies.map((sc) => ({
          buyer_id: id,
          name: sc.name,
          address: sc.address ?? null,
          contact_person: sc.contactPerson ?? null,
          phone: sc.phone ?? null,
          email: sc.email ?? null,
        }))
      );
      if (scErr) throw scErr;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('buyers').delete().eq('id', id);
    if (error) throw error;
  },
};
