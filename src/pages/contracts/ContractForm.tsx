import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, Save, CheckCircle } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { buyerService } from '../../services/buyerService';
import { brandService } from '../../services/brandService';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useMediaQuery';
import { generateContractNo } from '../../utils/contractNumber';
import { PRODUCT_TYPES, SIZES } from '../../utils/productTypes';
import { parsePackingNetWeightKg } from '../../utils/packingWeight';
import type { Buyer, Brand, SaleContract, ProductLine, Signatory } from '../../types';
import { Button } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { SHIPMENT_PERIOD_OPTIONS, SHIPMENT_MONTH_OPTIONS } from '../../utils/shipment';
import type { ShipmentPeriod } from '../../types';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Supabase errors are plain objects (message/details/hint/code), not Error instances.
function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code ? `(${e.code})` : ''].filter(Boolean);
    if (parts.length) return parts.join(' — ');
    try { return JSON.stringify(err); } catch { /* ignore */ }
  }
  return 'Failed to save contract';
}

const TODAY = new Date().toISOString().split('T')[0];

const CUSTOM = '__custom__';
const OTHER = '__other__';

const CONTAINER_TYPE_OPTIONS = ['20FCL', '40FCL'];
const PACKING_STYLE_BASE = ['Semi-IQF', 'IQF'];
const INCOTERM_OPTIONS = ['FOB', 'CNF', 'CFR', 'CIF', 'EXW', 'DDP'].map((v) => ({ value: v, label: v }));

interface PRow {
  id: string;
  productType: string;
  customProductType: string;
  size: string;
  sizeUnit: 'kg' | 'Lb';
  brand: string;
  packing: string;       // selected packing size, or OTHER sentinel
  customPacking: string; // used when packing === OTHER
  quantity: string;
  netWeightPerCarton: string;
  unitPrice: string;
}

// brands whose productTypes include the given type (empty productTypes = usable for any type)
function brandsForType(brands: Brand[], productType: string): Brand[] {
  const matched = brands.filter((b) => (b.productTypes ?? []).includes(productType));
  const wildcard = brands.filter((b) => !(b.productTypes ?? []).length);
  return [...matched, ...wildcard];
}

function firstPacking(brand?: Brand): string {
  return brand?.packingSizes?.[0] ?? brand?.defaultPacking ?? '';
}

// Merges a patch into a row; when the patch touches packing, re-derives
// netWeightPerCarton from the packing text (e.g. "8x770g" -> 6.16 kg/ctn) so the
// admin doesn't have to type it separately. Leaves the field alone when the
// packing text doesn't parse (custom/non-standard formats stay manually editable).
function applyRowPatch(row: PRow, patch: Partial<PRow>): PRow {
  const next = { ...row, ...patch };
  if ('packing' in patch || 'customPacking' in patch) {
    const packingText = next.packing === OTHER ? next.customPacking : next.packing;
    const parsed = parsePackingNetWeightKg(packingText);
    if (parsed !== null) next.netWeightPerCarton = String(parsed);
  }
  return next;
}

function emptyRow(brands: Brand[], productType: string = PRODUCT_TYPES[0]): PRow {
  const usable = brandsForType(brands, productType === CUSTOM ? '' : productType);
  const brand = usable[0];
  const packing = firstPacking(brand);
  const parsed = parsePackingNetWeightKg(packing);
  return {
    id: uid(), productType, customProductType: '',
    size: '', sizeUnit: 'kg',
    brand: brand?.brandName ?? '', packing, customPacking: '',
    quantity: '', netWeightPerCarton: parsed !== null ? String(parsed) : '', unitPrice: '',
  };
}

// Groups product-line rows by resolved product type (custom text if CUSTOM) + brand,
// preserving first-seen order — mirrors ContractPrint's grouping so the edit form and
// the printed document read the same way. Same product type but different brand stays
// as separate groups instead of merging into one table.
function groupRowsByProduct(rows: PRow[]): { key: string; productType: string; brand: string; rows: PRow[] }[] {
  const order: string[] = [];
  const map = new Map<string, { productType: string; brand: string; rows: PRow[] }>();
  rows.forEach((r) => {
    const productType = r.productType === CUSTOM ? (r.customProductType.trim() || '— unnamed —') : r.productType;
    const key = `${productType}|${r.brand}`;
    if (!map.has(key)) { map.set(key, { productType, brand: r.brand, rows: [] }); order.push(key); }
    map.get(key)!.rows.push(r);
  });
  return order.map((key) => ({ key, ...map.get(key)! }));
}

function computeRow(row: PRow) {
  const qty = parseFloat(row.quantity) || 0;
  const nwt = parseFloat(row.netWeightPerCarton) || 0;
  const price = parseFloat(row.unitPrice) || 0;
  const totalWeight = qty * nwt;
  const weightForPrice = row.sizeUnit === 'Lb' ? totalWeight * 2.20462 : totalWeight;
  return { totalWeight, totalAmount: weightForPrice * price };
}

function rowToProductLine(row: PRow): ProductLine {
  const { totalWeight, totalAmount } = computeRow(row);
  return {
    id: row.id,
    productType: row.productType === CUSTOM ? row.customProductType : row.productType,
    size: row.size, sizeUnit: row.sizeUnit, brand: row.brand,
    packing: row.packing === OTHER ? row.customPacking : row.packing,
    quantity: parseFloat(row.quantity) || 0,
    netWeightPerCarton: parseFloat(row.netWeightPerCarton) || 0,
    unitPrice: parseFloat(row.unitPrice) || 0,
    totalWeight, totalAmount,
  };
}

function productLineToRow(pl: ProductLine, brands: Brand[]): PRow {
  const isCustom = !PRODUCT_TYPES.includes(pl.productType);
  const brand = brands.find((b) => b.brandName === pl.brand);
  const sizes = brand?.packingSizes ?? [];
  const packingIsOther = pl.packing !== '' && !sizes.includes(pl.packing);
  return {
    id: pl.id,
    productType: isCustom ? CUSTOM : pl.productType,
    customProductType: isCustom ? pl.productType : '',
    size: pl.size, sizeUnit: pl.sizeUnit, brand: pl.brand,
    packing: packingIsOther ? OTHER : pl.packing,
    customPacking: packingIsOther ? pl.packing : '',
    quantity: pl.quantity > 0 ? String(pl.quantity) : '',
    netWeightPerCarton: pl.netWeightPerCarton > 0 ? String(pl.netWeightPerCarton) : '',
    unitPrice: pl.unitPrice > 0 ? String(pl.unitPrice) : '',
  };
}

interface FormState {
  buyerId: string;
  subCompanyId: string;
  offerDate: string;
  shipmentPeriod: string;
  shipmentMonth: string;
  shipmentYear: string;
  portOfLoading: string;
  portOfDischarge: string;
  incoterm: string;
  paymentTerms: string;
  containerQty: string;
  containerType: string;       // selected, or OTHER sentinel
  customContainerType: string; // used when containerType === OTHER
  packingStyle: string;        // selected, or OTHER sentinel
  customPackingStyle: string;  // used when packingStyle === OTHER
  rows: PRow[];
  signatories: Signatory[];
}

function defaultSignatories(buyerName = ''): Signatory[] {
  return [
    { label: 'For and on behalf of PITI FOODS CO., LTD.', fullName: '', title: '' },
    { label: `For and on behalf of ${buyerName}`, fullName: '', title: '' },
  ];
}

interface FormErrors { buyerId?: string; offerDate?: string; rows?: string; }

const fmt2 = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const numInput: React.CSSProperties = {
  padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '4px',
  fontSize: '12px', width: '100%', textAlign: 'right', background: 'var(--surface)',
};
const computed: React.CSSProperties = { ...numInput, background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'default' };
const cellInput: React.CSSProperties = {
  padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '4px',
  fontSize: '12px', width: '100%', background: 'var(--surface)',
};

export function ContractForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const isEdit = Boolean(id) && id !== 'new';

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [existingContract, setExistingContract] = useState<SaleContract | null>(null);
  const [contractNo, setContractNo] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    buyerId: '', subCompanyId: '', offerDate: TODAY,
    shipmentPeriod: '', shipmentMonth: '', shipmentYear: '',
    portOfLoading: '', portOfDischarge: '', incoterm: '',
    paymentTerms: '', containerQty: '',
    containerType: '', customContainerType: '',
    packingStyle: '', customPackingStyle: '',
    rows: [], signatories: defaultSignatories(),
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const loadBase = Promise.all([buyerService.getAll(), brandService.getAll()]);
    if (isEdit && id) {
      Promise.all([loadBase, contractService.getById(id)]).then(([[bu, br], existing]) => {
        setBuyers(bu);
        setAllBrands(br);
        if (!existing) { navigate('/contracts'); return; }
        if (existing.isLocked) { navigate(`/contracts/${id}/print`); return; }
        setExistingContract(existing);
        setContractNo(existing.contractNo);
        setSelectedCode(existing.buyerCode);
        const ct = existing.containerType ?? '';
        const ctIsOther = ct !== '' && !CONTAINER_TYPE_OPTIONS.includes(ct);
        const ps = existing.packingStyle ?? '';
        const psIsOther = ps !== '' && !PACKING_STYLE_BASE.includes(ps);
        setForm({
          buyerId: existing.buyerId,
          subCompanyId: existing.subCompanyId ?? '',
          offerDate: existing.offerDate,
          shipmentPeriod: existing.shipmentPeriod ?? '',
          shipmentMonth: existing.shipmentMonth ? String(existing.shipmentMonth) : '',
          shipmentYear: existing.shipmentYear ? String(existing.shipmentYear) : '',
          portOfLoading: existing.portOfLoading ?? '',
          portOfDischarge: existing.portOfDischarge ?? '',
          incoterm: existing.incoterm ?? '',
          paymentTerms: existing.paymentTerms,
          containerQty: existing.containerQty ? String(existing.containerQty) : '',
          containerType: ctIsOther ? OTHER : ct,
          customContainerType: ctIsOther ? ct : '',
          packingStyle: psIsOther ? OTHER : ps,
          customPackingStyle: psIsOther ? ps : '',
          rows: existing.productLines.map((pl) => productLineToRow(pl, br)),
          signatories: existing.signatories,
        });
        setLoadingPage(false);
      });
    } else {
      loadBase.then(([bu, br]) => { setBuyers(bu); setAllBrands(br); setLoadingPage(false); });
    }
  }, [id, isEdit, navigate]);

  const buyerBrands = useCallback(
    (buyerId: string) => allBrands.filter((b) => b.buyerId === buyerId),
    [allBrands]
  );

  const selectedBuyer = buyers.find((b) => b.id === form.buyerId) ?? null;

  const handleCodeChange = (code: string) => {
    setSelectedCode(code);
    const companies = buyers.filter((b) => b.code === code);
    handleBuyerChange(companies.length === 1 ? companies[0].id : '');
  };

  const handleBuyerChange = (buyerId: string, subCompanyId: string = '') => {
    const buyer = buyers.find((b) => b.id === buyerId);
    const sub = buyer?.subCompanies.find((s) => s.id === subCompanyId);
    const brands = buyerBrands(buyerId);
    setForm((prev) => ({
      ...prev, buyerId, subCompanyId,
      paymentTerms: buyer?.paymentTerms ?? '',
      portOfLoading: buyer?.portOfLoading ?? '',
      portOfDischarge: buyer?.portOfDischarge ?? '',
      incoterm: buyer?.incoterm ?? '',
      rows: prev.rows.length === 0 ? [emptyRow(brands)] : prev.rows.map((r) => {
        const usable = brandsForType(brands, r.productType === CUSTOM ? r.customProductType : r.productType);
        const b = usable[0];
        return applyRowPatch(r, { brand: b?.brandName ?? r.brand, packing: firstPacking(b), customPacking: '' });
      }),
      signatories: [
        prev.signatories[0],
        { ...prev.signatories[1], label: `For and on behalf of ${sub?.name ?? buyer?.companyName ?? ''}` },
      ],
    }));
    setErrors((e) => ({ ...e, buyerId: undefined }));
  };

  const handleCompanyChange = (value: string) => {
    const [buyerId, subCompanyId] = value.split('::');
    handleBuyerChange(buyerId, subCompanyId ?? '');
  };

  // "Add Product" starts a new group with the first product type not already in use —
  // "Add Row" (per group, below) adds another line (e.g. a different brand/size) to an existing product.
  const addProduct = () => {
    const brands = buyerBrands(form.buyerId);
    const usedTypes = new Set(form.rows.map((r) => r.productType === CUSTOM ? (r.customProductType.trim() || '— unnamed —') : r.productType));
    const nextType = PRODUCT_TYPES.find((pt) => !usedTypes.has(pt)) ?? CUSTOM;
    setForm((prev) => ({ ...prev, rows: [...prev.rows, emptyRow(brands, nextType)] }));
  };

  const addRowToGroup = (groupKey: string) => {
    const brands = buyerBrands(form.buyerId);
    const isKnownType = PRODUCT_TYPES.includes(groupKey);
    const newRow = emptyRow(brands, isKnownType ? groupKey : CUSTOM);
    if (!isKnownType && groupKey !== '— unnamed —') newRow.customProductType = groupKey;
    setForm((prev) => ({ ...prev, rows: [...prev.rows, newRow] }));
  };

  const removeRow = (rowId: string) => setForm((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== rowId) }));

  const setRow = (rowId: string, patch: Partial<PRow>) => {
    setForm((prev) => ({ ...prev, rows: prev.rows.map((r) => r.id === rowId ? applyRowPatch(r, patch) : r) }));
  };

  const handleBrandChange = (rowId: string, brandName: string) => {
    if (brandName === OTHER) { setRow(rowId, { brand: '', packing: OTHER, customPacking: '' }); return; }
    const brand = allBrands.find((b) => b.brandName === brandName && b.buyerId === form.buyerId);
    setRow(rowId, { brand: brandName, packing: firstPacking(brand), customPacking: '' });
  };

  const handleRowTypeChange = (rowId: string, productType: string) => {
    if (productType === CUSTOM) { setRow(rowId, { productType: CUSTOM }); return; }
    const usable = brandsForType(buyerBrands(form.buyerId), productType);
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        // keep current brand if still valid for the new type, else pick first usable
        const stillValid = usable.some((b) => b.brandName === r.brand);
        const b = stillValid ? usable.find((x) => x.brandName === r.brand) : usable[0];
        return applyRowPatch(r, { productType, brand: b?.brandName ?? '', packing: firstPacking(b), customPacking: '' });
      }),
    }));
  };

  function sumRows(rows: PRow[]) {
    return rows.reduce(
      (acc, r) => {
        const qty = parseFloat(r.quantity) || 0;
        const { totalWeight, totalAmount } = computeRow(r);
        return { qty: acc.qty + qty, weight: acc.weight + totalWeight, amount: acc.amount + totalAmount };
      },
      { qty: 0, weight: 0, amount: 0 }
    );
  }

  const totals = sumRows(form.rows);
  const rowGroups = groupRowsByProduct(form.rows);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.buyerId) e.buyerId = 'Please select a buyer';
    if (!form.offerDate) e.offerDate = 'Offer date is required';
    if (form.rows.length === 0) e.rows = 'Add at least one product line';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (status: 'draft' | 'finalized') => {
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const buyer = buyers.find((b) => b.id === form.buyerId);
      const sub = buyer?.subCompanies.find((s) => s.id === form.subCompanyId);
      const all = await contractService.getAll();
      const no = existingContract?.contractNo ?? (contractNo || generateContractNo(buyer?.code ?? '', all));

      const containerType = form.containerType === OTHER ? form.customContainerType : form.containerType;
      const packingStyle = form.packingStyle === OTHER ? form.customPackingStyle : form.packingStyle;

      const contract = {
        contractNo: no,
        buyerId: form.buyerId,
        buyerCode: buyer?.code ?? '',
        buyerName: buyer?.companyName ?? '',
        subCompanyId: form.subCompanyId || undefined,
        subCompanyName: sub?.name || undefined,
        offerDate: form.offerDate,
        shipmentPeriod: (form.shipmentPeriod || undefined) as ShipmentPeriod | undefined,
        shipmentMonth: form.shipmentMonth ? parseInt(form.shipmentMonth, 10) : undefined,
        shipmentYear: form.shipmentYear ? parseInt(form.shipmentYear, 10) : undefined,
        portOfLoading: form.portOfLoading || undefined,
        portOfDischarge: form.portOfDischarge || undefined,
        incoterm: form.incoterm || undefined,
        paymentTerms: form.paymentTerms,
        containerQty: form.containerQty ? parseInt(form.containerQty, 10) : undefined,
        containerType: containerType || undefined,
        packingStyle: packingStyle || undefined,
        productLines: form.rows.map(rowToProductLine),
        signatories: form.signatories,
        status,
        isLocked: false,
        revision: existingContract?.revision ?? 0,
        parentContractId: existingContract?.parentContractId,
      } as Omit<SaleContract, 'id' | 'createdAt' | 'updatedAt'>;

      const actor = user ? { id: user.id, name: user.fullName } : undefined;
      if (isEdit && id) {
        await contractService.update(id, contract, actor);
      } else {
        await contractService.create(contract, actor);
      }
      navigate('/contracts');
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: '14px',
    boxShadow: 'var(--shadow-sm)',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
  };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' };

  const codeOptions = Array.from(new Set(buyers.map((b) => b.code))).sort().map((code) => ({ value: code, label: code }));
  const companyOptions = buyers
    .filter((b) => b.code === selectedCode)
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
    .flatMap((b) => [
      { value: b.id, label: b.companyName },
      ...b.subCompanies.map((s) => ({ value: `${b.id}::${s.id}`, label: s.name })),
    ]);
  const companyValue = form.subCompanyId ? `${form.buyerId}::${form.subCompanyId}` : form.buyerId;
  const productTypeOptions = [...PRODUCT_TYPES.map((p) => ({ value: p, label: p })), { value: CUSTOM, label: '— Custom —' }];
  const containerTypeOptions = [...CONTAINER_TYPE_OPTIONS.map((v) => ({ value: v, label: v })), { value: OTHER, label: '— Other —' }];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i).map((y) => ({ value: String(y), label: String(y) }));
  const packingStyleOptions = [...PACKING_STYLE_BASE.map((v) => ({ value: v, label: v })), { value: OTHER, label: '— Other —' }];
  // brands usable for a given row's product type
  const rowBrandOptions = (row: PRow) => {
    const type = row.productType === CUSTOM ? row.customProductType : row.productType;
    return brandsForType(buyerBrands(form.buyerId), type).map((b) => ({ value: b.brandName, label: b.brandName }));
  };
  // packing size dropdown for a row, based on its selected brand
  const rowPackingOptions = (row: PRow) => {
    const brand = allBrands.find((b) => b.brandName === row.brand && b.buyerId === form.buyerId);
    const sizes = brand?.packingSizes?.length ? brand.packingSizes : (brand?.defaultPacking ? [brand.defaultPacking] : []);
    return [...sizes.map((s) => ({ value: s, label: s })), { value: OTHER, label: '— Other —' }];
  };
  const displayContractNo = contractNo || (selectedBuyer ? `${selectedBuyer.code}-${new Date().getFullYear().toString().slice(-2)}XX (preview)` : 'Select buyer first');

  if (loadingPage) return <LoadingSpinner message="Loading contract..." />;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/contracts')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
            {isEdit ? `Edit Contract — ${contractNo}` : 'New Sale Contract'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEdit ? 'Editing existing contract' : 'Fill in all sections below'}
          </p>
        </div>
      </div>

      {formError && (
        <div style={{ background: '#FDEDEC', border: '1px solid #F5C6CB', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)' }}>
          {formError}
        </div>
      )}

      {/* Section 1: Header */}
      <div style={cardStyle}>
        <p style={sectionTitle}>1 — Contract Header</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={grid2}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Contract No.</label>
              <div style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', background: 'var(--bg)', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                {displayContractNo}
              </div>
            </div>
            <Select label="Buyer Code *" value={selectedCode} onChange={(e) => handleCodeChange(e.target.value)} options={codeOptions} placeholder="Select code..." error={errors.buyerId} />
          </div>
          {selectedCode && (
            <Select label="Company *" value={companyValue} onChange={(e) => handleCompanyChange(e.target.value)} options={companyOptions} placeholder="Select company..." />
          )}
          <div style={grid2}>
            <Input label="Offer Date *" type="date" value={form.offerDate} onChange={(e) => setForm((p) => ({ ...p, offerDate: e.target.value }))} error={errors.offerDate} />
            <div />
          </div>
          <div style={grid3}>
            <Select label="Shipment — Period" value={form.shipmentPeriod} onChange={(e) => setForm((p) => ({ ...p, shipmentPeriod: e.target.value }))} options={SHIPMENT_PERIOD_OPTIONS} placeholder="— Select —" />
            <Select label="Shipment — Month" value={form.shipmentMonth} onChange={(e) => setForm((p) => ({ ...p, shipmentMonth: e.target.value }))} options={SHIPMENT_MONTH_OPTIONS} placeholder="— Select —" />
            <Select label="Shipment — Year" value={form.shipmentYear} onChange={(e) => setForm((p) => ({ ...p, shipmentYear: e.target.value }))} options={yearOptions} placeholder="— Select —" />
          </div>

          {!form.buyerId ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select a buyer to see shipping &amp; payment terms.</p>
          ) : (
            <>
              <div style={grid2}>
                <Input label="Shipped From" value={form.portOfLoading} onChange={(e) => setForm((p) => ({ ...p, portOfLoading: e.target.value }))} placeholder="e.g. Songkhla, Thailand" />
                <Input label="Destination" value={form.portOfDischarge} onChange={(e) => setForm((p) => ({ ...p, portOfDischarge: e.target.value }))} placeholder="e.g. Kaohsiung, Taiwan" />
              </div>
              <div style={grid2}>
                <Select label="Incoterm" value={form.incoterm} onChange={(e) => setForm((p) => ({ ...p, incoterm: e.target.value }))} options={INCOTERM_OPTIONS} placeholder="— Select —" />
                <Textarea label="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))} placeholder="Payment terms..." style={{ minHeight: '35px' }} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                ค่าเริ่มต้นดึงจากโปรไฟล์ลูกค้า — แก้ตรงนี้จะมีผลเฉพาะ contract ฉบับนี้ (ไม่กระทบโปรไฟล์ลูกค้า)
              </p>
            </>
          )}

          <div style={grid3}>
            <Input label="Container Qty" type="number" min="0" value={form.containerQty} onChange={(e) => setForm((p) => ({ ...p, containerQty: e.target.value }))} placeholder="e.g. 1" />
            <div>
              <Select label="Container Type" value={form.containerType} onChange={(e) => setForm((p) => ({ ...p, containerType: e.target.value }))} options={containerTypeOptions} placeholder="— Select —" />
              {form.containerType === OTHER && (
                <div style={{ marginTop: '6px' }}>
                  <Input label="" value={form.customContainerType} onChange={(e) => setForm((p) => ({ ...p, customContainerType: e.target.value }))} placeholder="ระบุ container type" />
                </div>
              )}
            </div>
            <div>
              <Select label="Frozen Style" value={form.packingStyle} onChange={(e) => setForm((p) => ({ ...p, packingStyle: e.target.value }))} options={packingStyleOptions} placeholder="— Select —" />
              {form.packingStyle === OTHER && (
                <div style={{ marginTop: '6px' }}>
                  <Input label="" value={form.customPackingStyle} onChange={(e) => setForm((p) => ({ ...p, customPackingStyle: e.target.value }))} placeholder="ระบุ frozen style" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Product Lines */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>2 — Product Lines</p>
          <Button size="sm" onClick={addProduct} disabled={!form.buyerId}><Plus size={13} /> Add Product</Button>
        </div>

        {errors.rows && <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '10px' }}>{errors.rows}</p>}

        {!form.buyerId && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>Select a buyer first to add product lines.</p>
        )}

        {form.buyerId && rowGroups.map((group, gi) => {
          const groupTotals = sumRows(group.rows);
          return (
            <div key={group.key + gi} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '14px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{gi + 1}. {group.productType}{group.brand ? ` "${group.brand}"` : ''}</span>
                <Button size="sm" variant="ghost" onClick={() => addRowToGroup(group.productType)}><Plus size={12} /> Add Row</Button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['#', 'Product Type', 'Size', 'Unit', 'Brand', 'Packing', 'Quantity ctns', 'NW/Ctn (kg)', 'Quantity(n.w) kg', 'Price USD/kg', 'Amount USD', ''].map((h, i) => (
                        <th key={i} style={{ padding: '7px 6px', textAlign: i >= 6 && i <= 10 ? 'right' : 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, idx) => {
                      const { totalWeight, totalAmount } = computeRow(row);
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', width: '28px' }}>{idx + 1}</td>
                          <td style={{ padding: '4px 6px', minWidth: '160px' }}>
                            <select value={row.productType} onChange={(e) => handleRowTypeChange(row.id, e.target.value)} style={{ ...cellInput, marginBottom: row.productType === CUSTOM ? '4px' : '0' }}>
                              {productTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            {row.productType === CUSTOM && (
                              <input value={row.customProductType} onChange={(e) => setRow(row.id, { customProductType: e.target.value })} placeholder="Enter type..." style={cellInput} />
                            )}
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '80px' }}>
                            <select value={row.size} onChange={(e) => setRow(row.id, { size: e.target.value })} style={cellInput}>
                              <option value="">— Select —</option>
                              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '60px' }}>
                            <select value={row.sizeUnit} onChange={(e) => setRow(row.id, { sizeUnit: e.target.value as 'kg' | 'Lb' })} style={cellInput}>
                              <option value="kg">kg</option>
                              <option value="Lb">Lb</option>
                            </select>
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '110px' }}>
                            {(() => {
                              const opts = rowBrandOptions(row);
                              const brandIsOther = row.brand === '' || !opts.some((o) => o.value === row.brand);
                              return (
                                <>
                                  <select value={brandIsOther ? OTHER : row.brand} onChange={(e) => handleBrandChange(row.id, e.target.value)} style={{ ...cellInput, marginBottom: brandIsOther ? '4px' : '0' }}>
                                    {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    <option value={OTHER}>— Other —</option>
                                  </select>
                                  {brandIsOther && (
                                    <input value={row.brand} onChange={(e) => setRow(row.id, { brand: e.target.value })} placeholder="Brand" style={cellInput} />
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '110px' }}>
                            {(() => {
                              const opts = rowPackingOptions(row);
                              const hasSizes = opts.length > 1; // more than just — Other —
                              if (!hasSizes) {
                                return <input value={row.packing === OTHER ? row.customPacking : row.packing} onChange={(e) => setRow(row.id, { packing: e.target.value })} placeholder="12x450g (NW)" style={cellInput} />;
                              }
                              return (
                                <>
                                  <select value={row.packing} onChange={(e) => setRow(row.id, { packing: e.target.value, customPacking: e.target.value === OTHER ? row.customPacking : '' })} style={{ ...cellInput, marginBottom: row.packing === OTHER ? '4px' : '0' }}>
                                    {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                  {row.packing === OTHER && (
                                    <input value={row.customPacking} onChange={(e) => setRow(row.id, { customPacking: e.target.value })} placeholder="12x450g (NW)" style={cellInput} />
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '72px' }}>
                            <input type="number" min="0" value={row.quantity} onChange={(e) => setRow(row.id, { quantity: e.target.value })} placeholder="0" style={{ ...numInput, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '80px' }}>
                            <input type="number" min="0" step="0.01" value={row.netWeightPerCarton} onChange={(e) => setRow(row.id, { netWeightPerCarton: e.target.value })} placeholder="0.00" style={{ ...numInput, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '90px' }}>
                            <div style={computed}>{totalWeight > 0 ? fmt2(totalWeight) : '—'}</div>
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '90px' }}>
                            <input type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => setRow(row.id, { unitPrice: e.target.value })} placeholder="0.00" style={{ ...numInput, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '4px 6px', minWidth: '100px' }}>
                            <div style={computed}>{totalAmount > 0 ? fmt2(totalAmount) : '—'}</div>
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', width: '36px' }}>
                            <button type="button" onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'var(--bg)', fontWeight: 600 }}>
                      <td colSpan={6} style={{ padding: '8px 6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Subtotal</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)' }}>{groupTotals.qty > 0 ? groupTotals.qty.toLocaleString() : '—'}</td>
                      <td style={{ padding: '8px 6px', borderTop: '2px solid var(--border)' }}></td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)' }}>{groupTotals.weight > 0 ? fmt2(groupTotals.weight) : '—'}</td>
                      <td style={{ padding: '8px 6px', borderTop: '2px solid var(--border)' }}></td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)', color: 'var(--primary)' }}>{groupTotals.amount > 0 ? `USD ${fmt2(groupTotals.amount)}` : '—'}</td>
                      <td style={{ borderTop: '2px solid var(--border)' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {form.buyerId && form.rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', marginTop: '8px' }}>
            No products yet.{' '}
            <button onClick={addProduct} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Add first product</button>
          </div>
        )}

        {form.buyerId && rowGroups.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '12.5px', fontWeight: 600 }}>
            <span>Grand Total —</span>
            <span>{totals.qty > 0 ? totals.qty.toLocaleString() : '—'} ctns</span>
            <span>{totals.weight > 0 ? fmt2(totals.weight) : '—'} kg</span>
            <span style={{ color: 'var(--primary)' }}>{totals.amount > 0 ? `USD ${fmt2(totals.amount)}` : '—'}</span>
          </div>
        )}
      </div>

      {/* Section 3: Signatories */}
      <div style={cardStyle}>
        <p style={sectionTitle}>3 — Signatories</p>
        <div style={grid2}>
          {form.signatories.map((sig, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input label="Signature Label" value={sig.label} onChange={(e) => { const s = [...form.signatories]; s[idx] = { ...s[idx], label: e.target.value }; setForm((p) => ({ ...p, signatories: s })); }} />
              <Input label="Full Name" value={sig.fullName} onChange={(e) => { const s = [...form.signatories]; s[idx] = { ...s[idx], fullName: e.target.value }; setForm((p) => ({ ...p, signatories: s })); }} placeholder="Signatory full name" />
              <Input label="Title" value={sig.title ?? ''} onChange={(e) => { const s = [...form.signatories]; s[idx] = { ...s[idx], title: e.target.value }; setForm((p) => ({ ...p, signatories: s })); }} placeholder="e.g. Managing Director" />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '32px' }}>
        <Button variant="ghost" onClick={() => navigate('/contracts')}>Cancel</Button>
        <Button variant="secondary" loading={saving} onClick={() => handleSave('draft')}>
          <Save size={14} /> Save Draft
        </Button>
        <Button loading={saving} onClick={() => handleSave('finalized')}>
          <CheckCircle size={14} /> Finalize
        </Button>
      </div>
    </div>
  );
}
