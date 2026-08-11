import { supabase } from '../lib/supabase';
import { SEED_BUYERS, SEED_BRANDS } from '../data/seedData';

// App.tsx calls this on both the 'INITIAL_SESSION' and 'SIGNED_IN' auth events, which
// commonly both fire within the same page load — sharing one in-flight promise (rather
// than each call doing its own check-then-insert) avoids a race that double-seeds buyers.
let seedPromise: Promise<void> | null = null;

export function seedIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = doSeed().catch((err) => {
      seedPromise = null; // allow a retry on the next call if this attempt failed
      throw err;
    });
  }
  return seedPromise;
}

async function doSeed(): Promise<void> {
  const { count } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0) return;

  for (const buyer of SEED_BUYERS) {
    // Re-check per buyer (not just the overall count above) so a page reload mid-seed
    // can't re-insert buyers that a previous, still-finishing load already created.
    const { count: existingCount } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true })
      .eq('code', buyer.code);
    if ((existingCount ?? 0) > 0) continue;

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
    const { count: existingBrandCount } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .eq('brand_name', brand.brandName)
      .eq('buyer_code', brand.buyerCode);
    if ((existingBrandCount ?? 0) > 0) continue;

    await supabase.from('brands').insert({
      brand_name: brand.brandName,
      buyer_code: brand.buyerCode,
      default_packing: brand.defaultPacking ?? null,
      default_origin: brand.defaultOrigin ?? null,
    });
  }

  console.log('[PITI] Seed data inserted into Supabase');
}
