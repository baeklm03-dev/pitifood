import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { buyerService } from '../../services/buyerService';
import { useAuth } from '../../hooks/useAuth';
import type { Brand, Buyer } from '../../types';
import { PRODUCT_TYPES } from '../../utils/productTypes';
import { Button } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { RequirementRows } from '../../components/UI/RequirementRows';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';
import { PRODUCT_SPEC_PRESETS, PACKING_DETAIL_PRESETS, defaultRowsFrom } from '../../utils/requirementPresets';

interface FormErrors {
  brandName?: string;
  buyerId?: string;
}

type BrandData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>;

export function BrandForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';

  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [form, setForm] = useState<BrandData>({
    brandName: '', buyerId: '', buyerCode: '',
    productTypes: [], packingSizes: [],
    productSpecRows: defaultRowsFrom(PRODUCT_SPEC_PRESETS), productSpecRemark: '',
    packingDetailRows: defaultRowsFrom(PACKING_DETAIL_PRESETS), packingDetailRemark: '',
    defaultPacking: '', defaultOrigin: 'Thailand', notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const loadBuyers = buyerService.getAll().then(setBuyers);
    if (isEdit && id) {
      Promise.all([loadBuyers, brandService.getById(id)]).then(([, existing]) => {
        if (!existing) { navigate('/brands'); return; }
        setForm({
          brandName: existing.brandName,
          buyerId: existing.buyerId,
          buyerCode: existing.buyerCode,
          productTypes: existing.productTypes ?? [],
          packingSizes: existing.packingSizes?.length
            ? existing.packingSizes
            : (existing.defaultPacking ? [existing.defaultPacking] : []),
          productSpecRows: existing.productSpecRows?.length ? existing.productSpecRows : defaultRowsFrom(PRODUCT_SPEC_PRESETS),
          productSpecRemark: existing.productSpecRemark ?? '',
          packingDetailRows: existing.packingDetailRows?.length ? existing.packingDetailRows : defaultRowsFrom(PACKING_DETAIL_PRESETS),
          packingDetailRemark: existing.packingDetailRemark ?? '',
          defaultPacking: existing.defaultPacking ?? '',
          defaultOrigin: existing.defaultOrigin ?? 'Thailand',
          notes: existing.notes ?? '',
        });
        setLoadingPage(false);
      });
    } else {
      loadBuyers.then(() => setLoadingPage(false));
    }
  }, [id, isEdit, navigate]);

  const setField = (key: keyof BrandData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleProductType = (pt: string) => {
    setForm((prev) => ({
      ...prev,
      productTypes: prev.productTypes.includes(pt)
        ? prev.productTypes.filter((x) => x !== pt)
        : [...prev.productTypes, pt],
    }));
  };

  const addPacking = () => setForm((prev) => ({ ...prev, packingSizes: [...prev.packingSizes, ''] }));
  const updatePacking = (idx: number, value: string) =>
    setForm((prev) => ({ ...prev, packingSizes: prev.packingSizes.map((p, i) => (i === idx ? value : p)) }));
  const removePacking = (idx: number) =>
    setForm((prev) => ({ ...prev, packingSizes: prev.packingSizes.filter((_, i) => i !== idx) }));

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.brandName.trim()) newErrors.brandName = 'Brand name is required';
    if (!form.buyerId) newErrors.buyerId = 'Linked buyer is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const buyer = buyers.find((b) => b.id === form.buyerId);
      const packingSizes = form.packingSizes.map((p) => p.trim()).filter(Boolean);
      const data: BrandData = {
        ...form,
        brandName: form.brandName.trim(),
        buyerCode: buyer?.code ?? form.buyerCode,
        productTypes: form.productTypes,
        packingSizes,
        defaultPacking: packingSizes[0] || undefined, // keep legacy field in sync
        defaultOrigin: form.defaultOrigin || undefined,
        productSpecRemark: form.productSpecRemark || undefined,
        packingDetailRemark: form.packingDetailRemark || undefined,
        notes: form.notes || undefined,
      };
      const actor = user ? { id: user.id, name: user.fullName } : undefined;
      if (isEdit && id) {
        await brandService.update(id, data, actor);
      } else {
        await brandService.create(data, actor);
      }
      navigate('/brands');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
  };

  const buyerOptions = buyers
    .sort((a, b) => a.code.localeCompare(b.code) || a.companyName.localeCompare(b.companyName))
    .map((b) => ({ value: b.id, label: `${b.code} — ${b.companyName}` }));

  if (loadingPage) return <LoadingSpinner message="Loading..." fullPage={false} />;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/brands')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
            {isEdit ? 'Edit Brand' : 'Add New Brand'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEdit ? `Editing ${form.brandName}` : 'Fill in the brand details below'}
          </p>
        </div>
      </div>

      {formError && (
        <div style={{ background: '#FDEDEC', border: '1px solid #F5C6CB', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--danger)' }}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={cardStyle}>
          <p style={sectionTitle}>Brand Information</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <Input label="Brand Name *" value={form.brandName} onChange={(e) => setField('brandName', e.target.value.toUpperCase())} placeholder="e.g. KING" error={errors.brandName} />
              <Select label="Linked Buyer *" value={form.buyerId} onChange={(e) => setField('buyerId', e.target.value)} options={buyerOptions} placeholder="Select buyer..." error={errors.buyerId} />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Product Types</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            เลือกประเภทสินค้าที่ใช้แบรนด์นี้ — เวลาสร้าง contract แบรนด์จะถูกกรองตามประเภทที่เลือก (ไม่เลือก = ใช้ได้ทุกประเภท)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {PRODUCT_TYPES.map((pt) => {
              const checked = form.productTypes.includes(pt);
              return (
                <label key={pt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '8px 10px', border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', background: checked ? '#EBF5FB' : 'var(--surface)', fontWeight: checked ? 600 : 400 }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleProductType(pt)} style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }} />
                  {pt}
                </label>
              );
            })}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Packing Sizes</p>
            <Button type="button" variant="ghost" size="sm" onClick={addPacking}><Plus size={13} /> Add Size</Button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            1 แบรนด์มีได้หลายขนาด packing — เวลาสร้าง contract เลือกแบรนด์แล้วขนาดจะเป็น dropdown
          </p>
          {form.packingSizes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '13px' }}>
              ยังไม่มีขนาด packing.{' '}
              <button type="button" onClick={addPacking} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>เพิ่มขนาดแรก</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {form.packingSizes.map((size, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input label="" value={size} onChange={(e) => updatePacking(idx, e.target.value)} placeholder="e.g. 12X450 g" />
                  </div>
                  <button type="button" onClick={() => removePacking(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: '8px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Other Defaults</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Default Origin" value={form.defaultOrigin ?? ''} onChange={(e) => setField('defaultOrigin', e.target.value)} placeholder="e.g. Thailand" />
            <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} placeholder="Internal notes..." style={{ minHeight: '70px' }} />
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>PO — รายละเอียดสินค้า (ข้อ 1)</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            จะถูกดึงไปเติมในใบ Production Order ของแบรนด์นี้ (แก้ต่อในแต่ละ PO ได้) — พิมพ์ "แบรนด์" เป็นชื่อรายการเพื่อดึงชื่อแบรนด์ด้านบนมาเติมอัตโนมัติ
          </p>
          <RequirementRows
            rows={form.productSpecRows}
            onChange={(rows) => setForm((p) => ({ ...p, productSpecRows: rows }))}
            presetLabels={PRODUCT_SPEC_PRESETS}
            brandName={form.brandName}
            listId="product-spec-presets"
          />
          <div style={{ marginTop: '14px' }}>
            <Input label="Remark (ข้อควรระวัง)" value={form.productSpecRemark ?? ''} onChange={(e) => setField('productSpecRemark', e.target.value)} placeholder="เช่น ข้อกำหนดซัลไฟล์ไม่เกินปริมาณข้อกำหนดไต้หวัน" />
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>PO — รายละเอียดและข้อกำหนดบรรจุภัณฑ์ (ข้อ 2)</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            จะถูกดึงไปเติมในใบ Production Order ของแบรนด์นี้ (แก้ต่อในแต่ละ PO ได้) — พิมพ์ "แบรนด์" เป็นชื่อรายการเพื่อดึงชื่อแบรนด์ด้านบนมาเติมอัตโนมัติ
          </p>
          <RequirementRows
            rows={form.packingDetailRows}
            onChange={(rows) => setForm((p) => ({ ...p, packingDetailRows: rows }))}
            presetLabels={PACKING_DETAIL_PRESETS}
            brandName={form.brandName}
            listId="packing-detail-presets"
          />
          <div style={{ marginTop: '14px' }}>
            <Input label="Remark" value={form.packingDetailRemark ?? ''} onChange={(e) => setField('packingDetailRemark', e.target.value)} placeholder="เช่น รายละเอียด Stamp ตาม packaging specification No. ..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={() => navigate('/brands')}>Cancel</Button>
          <Button type="submit" loading={saving}>
            <Save size={14} /> {isEdit ? 'Save Changes' : 'Create Brand'}
          </Button>
        </div>
      </form>
    </div>
  );
}
