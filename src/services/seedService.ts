import { supabase } from '../lib/supabase';
import { SEED_BUYERS, SEED_BRANDS } from '../data/seedData';

export async function seedIfEmpty(): Promise<void> {
  const { count } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0) return;

  for (const buyer of SEED_BUYERS) {
    const { data } = await supabase
      .from('buyers')
      .insert({
        code: buyer.code,
        company_name: buyer.companyName,
        country: buyer.country ?? null,
        payment_terms: buyer.paymentTerms,
        has_sub_companies: buyer.hasSubCompanies,
      })
      .select()
      .single();

    if (data && buyer.hasSubCompanies && buyer.subCompanies.length > 0) {
      await supabase.from('sub_companies').insert(
        buyer.subCompanies.map((sc) => ({
          buyer_id: data.id,
          name: sc.name,
          address: sc.address ?? null,
          contact_person: sc.contactPerson ?? null,
          phone: sc.phone ?? null,
          email: sc.email ?? null,
        }))
      );
    }
  }

  for (const brand of SEED_BRANDS) {
    await supabase.from('brands').insert({
      brand_name: brand.brandName,
      buyer_code: brand.buyerCode,
      default_packing: brand.defaultPacking ?? null,
      default_origin: brand.defaultOrigin ?? null,
    });
  }

  console.log('[PITI] Seed data inserted into Supabase');
}
