import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, Save, CheckCircle } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { buyerService } from '../../services/buyerService';
import { brandService } from '../../services/brandService';
import { generateContractNo } from '../../utils/contractNumber';
import type { Buyer, Brand, SaleContract, ProductLine, Signatory } from '../../types';
import { Button } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { SHIPMENT_PERIOD_OPTIONS, SHIPMENT_MONTH_OPTIONS } from '../../utils/shipment';
import type { ShipmentPeriod } from '../../types';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const TODAY = new Date().toISOString().split('T')[0];

const PRODUCT_TYPES = [
  'CHOSO A GRADE', 'CHOSO B GRADE', 'CHOSO SCAR', 'CHOSO (WHITE CHEEK)',
  'RHOSO', 'RHOSO (SOFT SHELL)', 'RAW VANNAMEI PD',
];

const SIZES = [
  '13/15', '16/20', '21/25', '26/30', '70/30', '31/35', '30/40',
  '41/50', '51/60', '61/70', '71/80', '81/100', '91/120',
];

const PACKING_STYLE_OPTIONS = ['Semi-IQF', 'IQF'].map((v) => ({ value: v, label: v }));

interface PRow {
  id: string;
  productType: string;
  customProductType: string;
  size: string;
  sizeUnit: 'kg' | 'Lb';
  brand: string;
  packing: string;
  quantity: string;
  netWeightPerCarton: string;
  unitPrice: string;
}

function emptyRow(brands: Brand[]): PRow {
  return {
    id: uid(), productType: PRODUCT_TYPES[0], customProductType: '',
    size: '', sizeUnit: 'kg',
    brand: brands[0]?.brandName ?? '', packing: brands[0]?.defaultPacking ?? '',
    quantity: '', netWeightPerCarton: '', unitPrice: '',
  };
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
    productType: row.productType === '__custom__' ? row.customProductType : row.productType,
    size: row.size, sizeUnit: row.sizeUnit, brand: row.brand, packing: row.packing,
    quantity: parseFloat(row.quantity) || 0,
    netWeightPerCarton: parseFloat(row.netWeightPerCarton) || 0,
    unitPrice: parseFloat(row.unitPrice) || 0,
    totalWeight, totalAmount,
  };
}

function productLineToRow(pl: ProductLine): PRow {
  const isCustom = !PRODUCT_TYPES.includes(pl.productType);
  return {
    id: pl.id,
    productType: isCustom ? '__custom__' : pl.productType,
    customProductType: isCustom ? pl.productType : '',
    size: pl.size, sizeUnit: pl.sizeUnit, brand: pl.brand, packing: pl.packing,
    quantity: pl.quantity > 0 ? String(pl.quantity) : '',
    netWeightPerCarton: pl.netWeightPerCarton > 0 ? String(pl.netWeightPerCarton) : '',
    unitPrice: pl.unitPrice > 0 ? String(pl.unitPrice) : '',
  };
}

interface FormState {
  buyerId: string;
  subCompanyId: string;
  offerDate: string;
  eta: string;
  shipmentPeriod: string;
  shipmentMonth: string;
  shipmentYear: string;
  portOfLoading: string;
  portOfDischarge: string;
  incoterm: string;
  paymentTerms: string;
  containerQty: string;
  containerType: string;
  packingStyle: string;
  remarks: string;
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
    eta: '', shipmentPeriod: '', shipmentMonth: '', shipmentYear: '',
    portOfLoading: '', portOfDischarge: '', incoterm: '',
    paymentTerms: '', containerQty: '', containerType: '', packingStyle: '',
    remarks: '', rows: [], signatories: defaultSignatories(),
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
        setForm({
          buyerId: existing.buyerId,
          subCompanyId: existing.subCompanyId ?? '',
          offerDate: existing.offerDate,
          eta: existing.eta ?? '',
          shipmentPeriod: existing.shipmentPeriod ?? '',
          shipmentMonth: existing.shipmentMonth ? String(existing.shipmentMonth) : '',
          shipmentYear: existing.shipmentYear ? String(existing.shipmentYear) : '',
          portOfLoading: existing.portOfLoading ?? '',
          portOfDischarge: existing.portOfDischarge ?? '',
          incoterm: existing.incoterm ?? '',
          paymentTerms: existing.paymentTerms,
          containerQty: existing.containerQty ? String(existing.containerQty) : '',
          containerType: existing.containerType ?? '',
          packingStyle: existing.packingStyle ?? '',
          remarks: existing.remarks ?? '',
          rows: existing.productLines.map(productLineToRow),
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
      rows: prev.rows.length === 0 ? [emptyRow(brands)] : prev.rows.map((r) => ({
        ...r, brand: brands[0]?.brandName ?? r.brand, packing: brands[0]?.defaultPacking ?? r.packing,
      })),
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

  const addRow = () => {
    const brands = buyerBrands(form.buyerId);
    setForm((prev) => ({ ...prev, rows: [...prev.rows, emptyRow(brands)] }));
  };

  const removeRow = (rowId: string) => setForm((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== rowId) }));

  const setRow = (rowId: string, patch: Partial<PRow>) => {
    setForm((prev) => ({ ...prev, rows: prev.rows.map((r) => r.id === rowId ? { ...r, ...patch } : r) }));
  };

  const handleBrandChange = (rowId: string, brandName: string) => {
    const brand = allBrands.find((b) => b.brandName === brandName && b.buyerId === form.buyerId);
    setRow(rowId, { brand: brandName, packing: brand?.defaultPacking ?? '' });
  };

  const totals = form.rows.reduce(
    (acc, r) => {
      const qty = parseFloat(r.quantity) || 0;
      const { totalWeight, totalAmount } = computeRow(r);
      return { qty: acc.qty + qty, weight: acc.weight + totalWeight, amount: acc.amount + totalAmount };
    },
    { qty: 0, weight: 0, amount: 0 }
  );

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

      const contract = {
        contractNo: no,
        buyerId: form.buyerId,
        buyerCode: buyer?.code ?? '',
        buyerName: buyer?.companyName ?? '',
        subCompanyId: form.subCompanyId || undefined,
        subCompanyName: sub?.name || undefined,
        offerDate: form.offerDate,
        eta: form.eta || undefined,
        shipmentPeriod: (form.shipmentPeriod || undefined) as ShipmentPeriod | undefined,
        shipmentMonth: form.shipmentMonth ? parseInt(form.shipmentMonth, 10) : undefined,
        shipmentYear: form.shipmentYear ? parseInt(form.shipmentYear, 10) : undefined,
        portOfLoading: form.portOfLoading || undefined,
        portOfDischarge: form.portOfDischarge || undefined,
        incoterm: form.incoterm || undefined,
        paymentTerms: form.paymentTerms,
        containerQty: form.containerQty ? parseInt(form.containerQty, 10) : undefined,
        containerType: form.containerType || undefined,
        packingStyle: form.packingStyle || undefined,
        productLines: form.rows.map(rowToProductLine),
        signatories: form.signatories,
        remarks: form.remarks || undefined,
        status,
        isLocked: false,
        revision: existingContract?.revision ?? 0,
        parentContractId: existingContract?.parentContractId,
      } as Omit<SaleContract, 'id' | 'createdAt' | 'updatedAt'>;

      if (isEdit && id) {
        await contractService.update(id, contract);
      } else {
        await contractService.create(contract);
      }
      navigate('/contracts');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save contract');
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
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' };

  const LockedField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>{label}</label>
      <div style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', background: 'var(--bg)', color: value ? 'var(--text)' : 'var(--text-muted)', minHeight: '35px', whiteSpace: 'pre-wrap' }}>
        {value || 'Set on buyer profile'}
      </div>
    </div>
  );

  const codeOptions = Array.from(new Set(buyers.map((b) => b.code))).sort().map((code) => ({ value: code, label: code }));
  const companyOptions = buyers
    .filter((b) => b.code === selectedCode)
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
    .flatMap((b) => [
      { value: b.id, label: b.companyName },
      ...b.subCompanies.map((s) => ({ value: `${b.id}::${s.id}`, label: `${b.companyName} — ${s.name}` })),
    ]);
  const companyValue = form.subCompanyId ? `${form.buyerId}::${form.subCompanyId}` : form.buyerId;
  const brandOptionsForRow = buyerBrands(form.buyerId).map((b) => ({ value: b.brandName, label: b.brandName }));
  const productTypeOptions = [...PRODUCT_TYPES.map((p) => ({ value: p, label: p })), { value: '__custom__', label: '— Custom —' }];
  const displayContractNo = contractNo || (selectedBuyer ? `${selectedBuyer.code}-${new Date().getFullYear().toString().slice(-2)}XX (preview)` : 'Select buyer first');

  if (loadingPage) return <LoadingSpinner message="Loading contract..." />;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
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
            <Input label="ETA" type="date" value={form.eta} onChange={(e) => setForm((p) => ({ ...p, eta: e.target.value }))} />
          </div>
          <div style={grid3}>
            <Select label="Shipment — Period" value={form.shipmentPeriod} onChange={(e) => setForm((p) => ({ ...p, shipmentPeriod: e.target.value }))} options={SHIPMENT_PERIOD_OPTIONS} placeholder="— Select —" />
            <Select label="Shipment — Month" value={form.shipmentMonth} onChange={(e) => setForm((p) => ({ ...p, shipmentMonth: e.target.value }))} options={SHIPMENT_MONTH_OPTIONS} placeholder="— Select —" />
            <Input label="Shipment — Year" type="number" value={form.shipmentYear} onChange={(e) => setForm((p) => ({ ...p, shipmentYear: e.target.value }))} placeholder="e.g. 2026" />
          </div>

          {!form.buyerId ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select a buyer to see shipping &amp; payment terms.</p>
          ) : (
            <>
              <div style={grid2}>
                <LockedField label="Shipped From" value={form.portOfLoading} />
                <LockedField label="Destination" value={form.portOfDischarge} />
              </div>
              <div style={grid2}>
                <LockedField label="Incoterm" value={form.incoterm} />
                <LockedField label="Payment Terms" value={form.paymentTerms} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Shipped From / Destination / Incoterm / Payment Terms come from the buyer's profile. To change them, edit the buyer.
              </p>
            </>
          )}

          <div style={grid3}>
            <Input label="Container Qty" type="number" min="0" value={form.containerQty} onChange={(e) => setForm((p) => ({ ...p, containerQty: e.target.value }))} placeholder="e.g. 1" />
            <Input label="Container Type" value={form.containerType} onChange={(e) => setForm((p) => ({ ...p, containerType: e.target.value }))} placeholder="e.g. 40FCL" />
            <Select label="Packing Style" value={form.packingStyle} onChange={(e) => setForm((p) => ({ ...p, packingStyle: e.target.value }))} options={PACKING_STYLE_OPTIONS} placeholder="— Select —" />
          </div>
        </div>
      </div>

      {/* Section 2: Product Lines */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>2 — Product Lines</p>
          <Button size="sm" onClick={addRow} disabled={!form.buyerId}><Plus size={13} /> Add Row</Button>
        </div>

        {errors.rows && <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '10px' }}>{errors.rows}</p>}

        {!form.buyerId && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>Select a buyer first to add product lines.</p>
        )}

        {form.buyerId && form.rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['#', 'Product Type', 'Size', 'Unit', 'Brand', 'Packing', 'Quantity ctns', 'Quantity(n.w) kg', 'Price USD/kg', 'Amount USD', ''].map((h, i) => (
                    <th key={i} style={{ padding: '7px 6px', textAlign: i >= 6 && i <= 9 ? 'right' : 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, idx) => {
                  const { totalAmount } = computeRow(row);
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', width: '28px' }}>{idx + 1}</td>
                      <td style={{ padding: '4px 6px', minWidth: '160px' }}>
                        <select value={row.productType} onChange={(e) => setRow(row.id, { productType: e.target.value })} style={{ ...cellInput, marginBottom: row.productType === '__custom__' ? '4px' : '0' }}>
                          {productTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {row.productType === '__custom__' && (
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
                      <td style={{ padding: '4px 6px', minWidth: '100px' }}>
                        {brandOptionsForRow.length > 0 ? (
                          <select value={row.brand} onChange={(e) => handleBrandChange(row.id, e.target.value)} style={cellInput}>
                            {brandOptionsForRow.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            <option value="__other__">— Other —</option>
                          </select>
                        ) : (
                          <input value={row.brand} onChange={(e) => setRow(row.id, { brand: e.target.value })} placeholder="Brand" style={cellInput} />
                        )}
                      </td>
                      <td style={{ padding: '4px 6px', minWidth: '90px' }}>
                        <input value={row.packing} onChange={(e) => setRow(row.id, { packing: e.target.value })} placeholder="12x450g (NW)" style={cellInput} />
                      </td>
                      <td style={{ padding: '4px 6px', minWidth: '72px' }}>
                        <input type="number" min="0" value={row.quantity} onChange={(e) => setRow(row.id, { quantity: e.target.value })} placeholder="0" style={{ ...numInput, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '4px 6px', minWidth: '80px' }}>
                        <input type="number" min="0" step="0.01" value={row.netWeightPerCarton} onChange={(e) => setRow(row.id, { netWeightPerCarton: e.target.value })} placeholder="0.00" style={{ ...numInput, textAlign: 'right' }} />
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
                  <td colSpan={6} style={{ padding: '8px 6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', letterSpacing: '0.04em', textTransform: 'uppercase' }}>TOTAL</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)' }}>{totals.qty > 0 ? totals.qty.toLocaleString() : '—'}</td>
                  <td style={{ padding: '8px 6px', borderTop: '2px solid var(--border)' }}></td>
                  <td style={{ padding: '8px 6px', borderTop: '2px solid var(--border)' }}></td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)', color: 'var(--primary)' }}>{totals.amount > 0 ? `USD ${fmt2(totals.amount)}` : '—'}</td>
                  <td style={{ borderTop: '2px solid var(--border)' }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {form.buyerId && form.rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', marginTop: '8px' }}>
            No product lines yet.{' '}
            <button onClick={addRow} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Add first row</button>
          </div>
        )}
      </div>

      {/* Section 3: Remarks */}
      <div style={cardStyle}>
        <p style={sectionTitle}>3 — Remarks</p>
        <Textarea label="" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks, special conditions, or notes..." style={{ minHeight: '70px' }} />
      </div>

      {/* Section 4: Signatories */}
      <div style={cardStyle}>
        <p style={sectionTitle}>4 — Signatories</p>
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
