import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, Save, CheckCircle } from 'lucide-react';
import { poService } from '../../services/poService';
import { contractService } from '../../services/contractService';
import { buyerService } from '../../services/buyerService';
import { brandService } from '../../services/brandService';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useMediaQuery';
import { generatePoNo } from '../../utils/poNumber';
import { formatDeliveryNoteTH } from '../../utils/deliveryNote';
import { PRODUCT_SPEC_PRESETS, PACKING_DETAIL_PRESETS, LOADING_REQUIREMENT_PRESETS, DOCUMENT_REQUIREMENT_PRESETS, defaultRowsFrom } from '../../utils/requirementPresets';
import type { SaleContract, Buyer, Brand, ProductionOrder, POLine, POStatus, RequirementRow, ProductRequirement } from '../../types';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { RequirementRows } from '../../components/UI/RequirementRows';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code ? `(${e.code})` : ''].filter(Boolean);
    if (parts.length) return parts.join(' — ');
  }
  return 'Failed to save production order';
}

const TODAY = new Date().toISOString().split('T')[0];

// Attn is a PITI FOODS-side (sender) distribution list — this is the standard default;
// still editable per PO.
const DEFAULT_PO_ATTN = 'คุณพิสิทธ์/ฝ่ายจัดซื้อ/ฝ่ายคิวเอ/ฝ่ายผลิต/ฝ่ายคิวซี/ฝ่ายส่งออก/ฝ่ายคลังสินค้า/ฝ่ายบัญชี';

interface LineRow {
  id: string;
  productType: string;
  brand: string;
  size: string;
  packing: string;
  mark: string;
  sizeRm: string;
  qtyCtn: string;
  qtyKg: string;
  inStock: string;
  produceAdd: string;
}

const num = (s: string) => parseFloat(s) || 0;

function lineToRow(l: POLine): LineRow {
  return {
    id: l.id,
    productType: l.productType, brand: l.brand ?? '', size: l.size, packing: l.packing,
    mark: l.mark, sizeRm: l.sizeRm,
    qtyCtn: l.qtyCtn ? String(l.qtyCtn) : '',
    qtyKg: l.qtyKg ? String(l.qtyKg) : '',
    inStock: l.inStock ? String(l.inStock) : '',
    produceAdd: l.produceAdd ? String(l.produceAdd) : '',
  };
}

function rowToLine(r: LineRow): POLine {
  return {
    id: r.id,
    productType: r.productType, brand: r.brand || undefined, size: r.size, packing: r.packing,
    mark: r.mark, sizeRm: r.sizeRm,
    qtyCtn: num(r.qtyCtn), qtyKg: num(r.qtyKg),
    inStock: num(r.inStock), produceAdd: num(r.produceAdd),
  };
}

const fmt = (n: number, dec = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

interface RowSpanGroup { span: number; ids: string[]; }

// For consecutive rows sharing the same product+brand, only the first row gets a
// visible entry (with the merged rowSpan); the rest are null so their รายการสินค้า/
// แบรนด์ cells are omitted entirely and folded into that first row's merged cell.
function computeRowSpanGroups(rows: LineRow[]): (RowSpanGroup | null)[] {
  const result: (RowSpanGroup | null)[] = new Array(rows.length).fill(null);
  let i = 0;
  while (i < rows.length) {
    let span = 1;
    while (i + span < rows.length && rows[i + span].productType === rows[i].productType && rows[i + span].brand === rows[i].brand) span++;
    result[i] = { span, ids: rows.slice(i, i + span).map((r) => r.id) };
    i += span;
  }
  return result;
}

// Clones an existing row set with fresh ids; falls back to the Sheet1 main-item
// presets when there's nothing set yet, so a first-time section isn't blank.
function cloneRows(rows: RequirementRow[] | undefined, presets: string[]): RequirementRow[] {
  return rows?.length ? rows.map((r) => ({ ...r, id: uid() })) : defaultRowsFrom(presets);
}

// Form-local shape mirrors ProductRequirement but keeps remarks as plain (controlled) strings.
interface ProductReqRow {
  id: string;
  productType: string;
  brand: string;
  productSpecRows: RequirementRow[];
  productSpecRemark: string;
  packingDetailRows: RequirementRow[];
  packingDetailRemark: string;
}

function prToRow(pr: ProductRequirement): ProductReqRow {
  return {
    id: pr.id, productType: pr.productType, brand: pr.brand ?? '',
    productSpecRows: pr.productSpecRows, productSpecRemark: pr.productSpecRemark ?? '',
    packingDetailRows: pr.packingDetailRows, packingDetailRemark: pr.packingDetailRemark ?? '',
  };
}

function rowToPr(r: ProductReqRow): ProductRequirement {
  return {
    id: r.id, productType: r.productType, brand: r.brand || undefined,
    productSpecRows: r.productSpecRows, productSpecRemark: r.productSpecRemark || undefined,
    packingDetailRows: r.packingDetailRows, packingDetailRemark: r.packingDetailRemark || undefined,
  };
}

// Distinct product+brand pairs, in first-seen order — the single source of truth
// for what shows in Section 3, derived straight from Section 2's line items so
// brand is never typed a second time.
function lineGroupsOf(rows: LineRow[]): { productType: string; brand: string }[] {
  const seen = new Set<string>();
  const out: { productType: string; brand: string }[] = [];
  rows.forEach((r) => {
    const key = `${r.productType}|${r.brand}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ productType: r.productType, brand: r.brand });
  });
  return out;
}

function defaultProductReq(productType: string, brand: string, brands: Brand[]): ProductReqRow {
  const brandRecord = brands.find((b) => b.brandName === brand);
  return {
    id: uid(), productType, brand,
    productSpecRows: cloneRows(brandRecord?.productSpecRows, PRODUCT_SPEC_PRESETS),
    productSpecRemark: brandRecord?.productSpecRemark ?? '',
    packingDetailRows: cloneRows(brandRecord?.packingDetailRows, PACKING_DETAIL_PRESETS),
    packingDetailRemark: brandRecord?.packingDetailRemark ?? '',
  };
}

interface FormState {
  contractId: string;
  attn: string;
  poDate: string;
  deliveryNote: string;
  productRequirements: ProductReqRow[];
  loadingRequirementRows: RequirementRow[];
  loadingRequirementRemark: string;
  documentRequirementRows: RequirementRow[];
  documentRequirementRemark: string;
  preparedBy: string;
  approvedBy: string;
  rows: LineRow[];
}

const emptyForm: FormState = {
  contractId: '', attn: '', poDate: TODAY, deliveryNote: '',
  productRequirements: [],
  loadingRequirementRows: [], loadingRequirementRemark: '',
  documentRequirementRows: [], documentRequirementRemark: '',
  preparedBy: '', approvedBy: '', rows: [],
};

export function POForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const isEdit = Boolean(id) && id !== 'new';

  const [signedContracts, setSignedContracts] = useState<SaleContract[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [existing, setExisting] = useState<ProductionOrder | null>(null);
  const [poNo, setPoNo] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ contractId?: string }>({});

  useEffect(() => {
    const base = Promise.all([contractService.getAll(), buyerService.getAll(), brandService.getAll()]);
    if (isEdit && id) {
      Promise.all([base, poService.getById(id)]).then(([[cts, bu, br], po]) => {
        setSignedContracts(cts.filter((c) => c.isLocked));
        setBuyers(bu); setBrands(br);
        if (!po) { navigate('/po'); return; }
        setExisting(po);
        setPoNo(po.poNo);
        const rows = po.lines.map(lineToRow);
        setForm({
          contractId: po.contractId,
          attn: po.attn ?? '',
          poDate: po.poDate,
          deliveryNote: po.deliveryNote ?? '',
          productRequirements: (po.productRequirements ?? []).map(prToRow),
          loadingRequirementRows: cloneRows(po.loadingRequirementRows, LOADING_REQUIREMENT_PRESETS),
          loadingRequirementRemark: po.loadingRequirementRemark ?? '',
          documentRequirementRows: cloneRows(po.documentRequirementRows, DOCUMENT_REQUIREMENT_PRESETS),
          documentRequirementRemark: po.documentRequirementRemark ?? '',
          preparedBy: po.preparedBy ?? '',
          approvedBy: po.approvedBy ?? '',
          rows,
        });
        setLoadingPage(false);
      });
    } else {
      base.then(([cts, bu, br]) => {
        setSignedContracts(cts.filter((c) => c.isLocked));
        setBuyers(bu); setBrands(br);
        setLoadingPage(false);
      });
    }
  }, [id, isEdit, navigate]);

  const selectedContract = signedContracts.find((c) => c.id === form.contractId) ?? null;

  const handleContractChange = (contractId: string) => {
    setErrors({});
    const c = signedContracts.find((x) => x.id === contractId);
    if (!c) { setForm({ ...emptyForm, poDate: form.poDate }); return; }

    const buyer = buyers.find((b) => b.id === c.buyerId);
    const deliveryNote = formatDeliveryNoteTH(c.containerQty, c.containerType, c.shipmentMonth, c.shipmentYear);

    const rows: LineRow[] = c.productLines.map((p) => ({
      id: uid(),
      productType: p.productType, brand: p.brand, size: p.size, packing: p.packing,
      mark: '', sizeRm: '',
      qtyCtn: p.quantity ? String(p.quantity) : '',
      qtyKg: p.totalWeight ? String(+p.totalWeight.toFixed(2)) : '',
      inStock: '', produceAdd: '',
    }));

    // One requirement block per distinct product+brand in this contract's lines,
    // pulling ข้อ 1/2 from that specific brand's registered template.
    const seen = new Set<string>();
    const productRequirements: ProductReqRow[] = [];
    c.productLines.forEach((p) => {
      const key = `${p.productType}|${p.brand}`;
      if (seen.has(key)) return;
      seen.add(key);
      const brandRecord = brands.find((b) => b.brandName === p.brand && b.buyerId === c.buyerId);
      productRequirements.push({
        id: uid(), productType: p.productType, brand: p.brand,
        productSpecRows: cloneRows(brandRecord?.productSpecRows, PRODUCT_SPEC_PRESETS),
        productSpecRemark: brandRecord?.productSpecRemark ?? '',
        packingDetailRows: cloneRows(brandRecord?.packingDetailRows, PACKING_DETAIL_PRESETS),
        packingDetailRemark: brandRecord?.packingDetailRemark ?? '',
      });
    });

    setForm((prev) => ({
      ...prev,
      contractId,
      attn: DEFAULT_PO_ATTN,
      deliveryNote,
      productRequirements,
      loadingRequirementRows: cloneRows(buyer?.loadingRequirementRows, LOADING_REQUIREMENT_PRESETS),
      loadingRequirementRemark: buyer?.loadingRequirementRemark ?? '',
      documentRequirementRows: cloneRows(buyer?.documentRequirementRows, DOCUMENT_REQUIREMENT_PRESETS),
      documentRequirementRemark: buyer?.documentRequirementRemark ?? '',
      rows,
    }));
  };

  const setRow = (rowId: string, patch: Partial<LineRow>) =>
    setForm((prev) => ({ ...prev, rows: prev.rows.map((r) => r.id === rowId ? { ...r, ...patch } : r) }));
  const setRows = (rowIds: string[], patch: Partial<LineRow>) =>
    setForm((prev) => ({ ...prev, rows: prev.rows.map((r) => rowIds.includes(r.id) ? { ...r, ...patch } : r) }));
  const addRow = () =>
    setForm((prev) => ({ ...prev, rows: [...prev.rows, { id: uid(), productType: '', brand: '', size: '', packing: '', mark: '', sizeRm: '', qtyCtn: '', qtyKg: '', inStock: '', produceAdd: '' }] }));
  const removeRow = (rowId: string) =>
    setForm((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== rowId) }));

  // Section 3's product/brand grouping is derived straight from Section 2's rows —
  // no separate editable brand field, so there's nothing to re-type or fall out of sync.
  const lineGroups = lineGroupsOf(form.rows);

  const getRequirement = (productType: string, brand: string): ProductReqRow =>
    form.productRequirements.find((pr) => pr.productType === productType && pr.brand === brand)
    ?? defaultProductReq(productType, brand, brands);

  const updateRequirement = (productType: string, brand: string, patch: Partial<ProductReqRow>) =>
    setForm((prev) => {
      const idx = prev.productRequirements.findIndex((pr) => pr.productType === productType && pr.brand === brand);
      if (idx >= 0) {
        const next = [...prev.productRequirements];
        next[idx] = { ...next[idx], ...patch };
        return { ...prev, productRequirements: next };
      }
      return { ...prev, productRequirements: [...prev.productRequirements, { ...defaultProductReq(productType, brand, brands), ...patch }] };
    });

  const totals = form.rows.reduce(
    (acc, r) => ({ ctn: acc.ctn + num(r.qtyCtn), kg: acc.kg + num(r.qtyKg), stock: acc.stock + num(r.inStock), add: acc.add + num(r.produceAdd) }),
    { ctn: 0, kg: 0, stock: 0, add: 0 }
  );

  const validate = () => {
    if (!form.contractId) { setErrors({ contractId: 'เลือก Sale Contract ที่ sign แล้ว' }); return false; }
    return true;
  };

  const handleSave = async (status: POStatus) => {
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const c = selectedContract!;
      const buyer = buyers.find((b) => b.id === c.buyerId);
      const sub = c.subCompanyId ? buyer?.subCompanies.find((s) => s.id === c.subCompanyId) : undefined;

      const po: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        poNo: existing?.poNo ?? poNo,
        contractId: c.id,
        contractNo: c.contractNo,
        buyerId: c.buyerId,
        buyerName: sub?.name || c.subCompanyName || c.buyerName,
        subCompanyName: sub?.name || c.subCompanyName,
        destination: c.portOfDischarge,
        attn: form.attn || undefined,
        poDate: form.poDate,
        deliveryNote: form.deliveryNote || undefined,
        productRequirements: lineGroups.map((g) => getRequirement(g.productType, g.brand)).map(rowToPr),
        loadingRequirementRows: form.loadingRequirementRows,
        loadingRequirementRemark: form.loadingRequirementRemark || undefined,
        documentRequirementRows: form.documentRequirementRows,
        documentRequirementRemark: form.documentRequirementRemark || undefined,
        preparedBy: form.preparedBy || undefined,
        approvedBy: form.approvedBy || undefined,
        lines: form.rows.map(rowToLine),
        status,
      };

      const actor = user ? { id: user.id, name: user.fullName } : undefined;
      if (isEdit && id) {
        await poService.update(id, po, actor);
      } else {
        const allPOs = await poService.getAll();
        po.poNo = generatePoNo(allPOs);
        await poService.create(po, actor);
      }
      navigate('/po');
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: isMobile ? '16px' : '20px 24px', marginBottom: '14px',
    boxShadow: 'var(--shadow-sm)',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
  };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' };
  const cellInput: React.CSSProperties = {
    padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '4px',
    fontSize: '12px', width: '100%', background: 'var(--surface)',
  };
  const numCell: React.CSSProperties = { ...cellInput, textAlign: 'right' };

  const contractOptions = signedContracts
    .slice()
    .sort((a, b) => a.contractNo.localeCompare(b.contractNo));

  const displayPoNo = poNo || (form.contractId ? '(รันเลขที่เมื่อบันทึก)' : 'เลือก contract ก่อน');

  if (loadingPage) return <LoadingSpinner message="Loading..." />;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/po')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
            {isEdit ? `Edit Production Order — ${poNo}` : 'New Production Order'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEdit ? 'แก้ไขใบสั่งผลิต' : 'สร้างจาก Sale Contract ที่ sign แล้ว'}
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
        <p style={sectionTitle}>1 — PO Header</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={grid2}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>PO No. <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(รันอัตโนมัติ 001/2026, ...)</span></label>
              <div style={{ padding: '8px 12px', border: '2px solid var(--primary)', borderRadius: 'var(--radius)', fontSize: '13px', background: 'var(--bg)', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                {displayPoNo}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Ref. Sale Contract * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(เฉพาะที่ sign แล้ว)</span></label>
              <select
                value={form.contractId}
                onChange={(e) => handleContractChange(e.target.value)}
                disabled={isEdit}
                style={{ padding: '9px 13px', border: `1.5px solid ${errors.contractId ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius)', fontSize: '13px', background: isEdit ? 'var(--bg)' : 'var(--surface)', width: '100%', cursor: isEdit ? 'default' : 'pointer' }}
              >
                <option value="">— เลือก Sale Contract —</option>
                {contractOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNo} — {c.buyerName}</option>
                ))}
              </select>
              {errors.contractId && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{errors.contractId}</span>}
              {signedContracts.length === 0 && !isEdit && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ยังไม่มี contract ที่ sign แล้ว</span>
              )}
            </div>
          </div>

          {selectedContract && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px 24px', fontSize: '13px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>ลูกค้า: </span>{selectedContract.subCompanyName || selectedContract.buyerName}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>ปลายทาง: </span>{selectedContract.portOfDischarge || '—'}</div>
            </div>
          )}

          <div style={grid2}>
            <Input label="วันที่ (PO Date)" type="date" value={form.poDate} onChange={(e) => setForm((p) => ({ ...p, poDate: e.target.value }))} />
            <Input label="Attn (ฝั่งผู้ส่ง — PITI FOODS)" value={form.attn} onChange={(e) => setForm((p) => ({ ...p, attn: e.target.value }))} placeholder="เช่น คุณพิสิทธ์/ฝ่ายจัดซื้อ/ฝ่ายคิวเอ ..." />
          </div>
          <Input label="กำหนดส่งมอบ (Delivery)" value={form.deliveryNote} onChange={(e) => setForm((p) => ({ ...p, deliveryNote: e.target.value }))} placeholder="เช่น จำนวน 1 x 40fcl กำหนดส่งมอบ ภายในเดือนกรกฎาคม 2026" />
        </div>
      </div>

      {/* Section 2: Product lines */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>2 — รายการสินค้า</p>
          <Button size="sm" onClick={addRow} disabled={!form.contractId}><Plus size={13} /> Add Row</Button>
        </div>

        {form.rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>เลือก Sale Contract เพื่อดึงรายการสินค้า</p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['#', 'รายการสินค้า', 'แบรนด์', 'Packing size', 'mark', 'size r/m', 'จำนวน (กล่อง)', 'จำนวน (ก.ก.)', 'สินค้าในสต็อก', 'ผลิตเพิ่ม', ''].map((h, i) => (
                    <th key={i} style={{ padding: '7px 6px', textAlign: i >= 6 ? 'right' : 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rowGroups = computeRowSpanGroups(form.rows);
                  return form.rows.map((row, idx) => {
                    const group = rowGroups[idx];
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', width: '24px' }}>{idx + 1}</td>
                        {group && (
                          <td rowSpan={group.span} style={{ padding: '4px 6px', minWidth: '150px', verticalAlign: 'top' }}>
                            <input value={row.productType} onChange={(e) => setRows(group.ids, { productType: e.target.value })} style={cellInput} />
                          </td>
                        )}
                        {group && (
                          <td rowSpan={group.span} style={{ padding: '4px 6px', minWidth: '110px', verticalAlign: 'top' }}>
                            <input value={row.brand} onChange={(e) => setRows(group.ids, { brand: e.target.value })} style={cellInput} />
                          </td>
                        )}
                    <td style={{ padding: '4px 6px', minWidth: '110px' }}><input value={row.packing} onChange={(e) => setRow(row.id, { packing: e.target.value })} style={cellInput} /></td>
                    <td style={{ padding: '4px 6px', minWidth: '70px' }}><input value={row.mark} onChange={(e) => setRow(row.id, { mark: e.target.value })} style={cellInput} /></td>
                    <td style={{ padding: '4px 6px', minWidth: '70px' }}><input value={row.sizeRm} onChange={(e) => setRow(row.id, { sizeRm: e.target.value })} style={cellInput} /></td>
                    <td style={{ padding: '4px 6px', minWidth: '80px' }}><input type="number" min="0" value={row.qtyCtn} onChange={(e) => setRow(row.id, { qtyCtn: e.target.value })} placeholder="0" style={numCell} /></td>
                    <td style={{ padding: '4px 6px', minWidth: '90px' }}><input type="number" min="0" step="0.01" value={row.qtyKg} onChange={(e) => setRow(row.id, { qtyKg: e.target.value })} placeholder="0.00" style={numCell} /></td>
                    <td style={{ padding: '4px 6px', minWidth: '90px' }}><input type="number" min="0" step="0.01" value={row.inStock} onChange={(e) => setRow(row.id, { inStock: e.target.value })} placeholder="0.00" style={numCell} /></td>
                    <td style={{ padding: '4px 6px', minWidth: '90px' }}><input type="number" min="0" step="0.01" value={row.produceAdd} onChange={(e) => setRow(row.id, { produceAdd: e.target.value })} placeholder="0.00" style={numCell} /></td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', width: '32px' }}>
                      <button type="button" onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: '4px' }}><Trash2 size={14} /></button>
                    </td>
                      </tr>
                    );
                  });
                })()}
                <tr style={{ background: 'var(--bg)', fontWeight: 600 }}>
                  <td colSpan={6} style={{ padding: '8px 6px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', textTransform: 'uppercase' }}>Total</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{totals.ctn ? fmt(totals.ctn, 0) : '—'}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{totals.kg ? fmt(totals.kg) : '—'}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{totals.stock ? fmt(totals.stock) : '—'}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{totals.add ? fmt(totals.add) : '—'}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Requirements */}
      <div style={cardStyle}>
        <p style={sectionTitle}>3 — ข้อกำหนดอื่นๆ</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ข้อ 1-2 — แยกตามสินค้า/แบรนด์ในรายการสินค้าด้านบน (ดึงจาก brand โดยอัตโนมัติ)</span>
          {lineGroups.map((g, i) => {
            const pr = getRequirement(g.productType, g.brand);
            return (
              <div key={`${g.productType}|${g.brand}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', background: 'var(--bg)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>
                  {g.productType || '—'}{g.brand ? ` "${g.brand}"` : ''}
                </div>
                <label style={{ fontSize: '12.5px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{i + 1}.1 รายละเอียดสินค้า (Product specification)</label>
                <RequirementRows rows={pr.productSpecRows} onChange={(rows) => updateRequirement(g.productType, g.brand, { productSpecRows: rows })} presetLabels={PRODUCT_SPEC_PRESETS} brandName={g.brand} listId={`po-product-spec-${i}`} />
                <div style={{ marginTop: '8px', marginBottom: '14px' }}>
                  <Input label="Remark" value={pr.productSpecRemark} onChange={(e) => updateRequirement(g.productType, g.brand, { productSpecRemark: e.target.value })} />
                </div>
                <label style={{ fontSize: '12.5px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{i + 1}.2 รายละเอียดและข้อกำหนดบรรจุภัณฑ์</label>
                <RequirementRows rows={pr.packingDetailRows} onChange={(rows) => updateRequirement(g.productType, g.brand, { packingDetailRows: rows })} presetLabels={PACKING_DETAIL_PRESETS} brandName={g.brand} listId={`po-packing-detail-${i}`} />
                <div style={{ marginTop: '8px' }}>
                  <Input label="Remark" value={pr.packingDetailRemark} onChange={(e) => updateRequirement(g.productType, g.brand, { packingDetailRemark: e.target.value })} />
                </div>
              </div>
            );
          })}
          {lineGroups.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>เลือก Sale Contract เพื่อดึงข้อกำหนดตามสินค้า</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>3. ข้อกำหนดการโหลด (Loading requirement) — จาก buyer</label>
            <RequirementRows rows={form.loadingRequirementRows} onChange={(rows) => setForm((p) => ({ ...p, loadingRequirementRows: rows }))} presetLabels={LOADING_REQUIREMENT_PRESETS} listId="po-loading-presets" />
            <div style={{ marginTop: '10px' }}>
              <Input label="Remark" value={form.loadingRequirementRemark} onChange={(e) => setForm((p) => ({ ...p, loadingRequirementRemark: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>4. การจัดเตรียมเอกสารและภาพถ่าย — จาก buyer</label>
            <RequirementRows rows={form.documentRequirementRows} onChange={(rows) => setForm((p) => ({ ...p, documentRequirementRows: rows }))} presetLabels={DOCUMENT_REQUIREMENT_PRESETS} listId="po-document-presets" />
            <div style={{ marginTop: '10px' }}>
              <Input label="Remark" value={form.documentRequirementRemark} onChange={(e) => setForm((p) => ({ ...p, documentRequirementRemark: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Signatories */}
      <div style={cardStyle}>
        <p style={sectionTitle}>4 — ผู้จัดทำ / ผู้ผลิต</p>
        <div style={grid2}>
          <Input label="ผู้จัดทำ (จะพิมพ์ชื่อนี้ใน PO)" value={form.preparedBy} onChange={(e) => setForm((p) => ({ ...p, preparedBy: e.target.value }))} placeholder="ชื่อผู้จัดทำ" />
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>ผู้ผลิต</label>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>เว้นว่างไว้สำหรับเซ็นชื่อในเอกสาร ไม่ต้องกรอก</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingBottom: '32px', flexWrap: 'wrap' }}>
        <Button variant="ghost" onClick={() => navigate('/po')}>Cancel</Button>
        <Button variant="secondary" loading={saving} onClick={() => handleSave('draft')}><Save size={14} /> Save Draft</Button>
        <Button loading={saving} onClick={() => handleSave('finalized')}><CheckCircle size={14} /> Finalize</Button>
      </div>
    </div>
  );
}
