import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, Save } from 'lucide-react';
import { buyerService } from '../../services/buyerService';
import { useAuth } from '../../hooks/useAuth';
import type { Buyer, SubCompany } from '../../types';
import { Button } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { LoadingRequirementFields } from '../../components/UI/LoadingRequirementFields';
import { DocumentRequirementFields } from '../../components/UI/DocumentRequirementFields';
import { ConfirmModal } from '../../components/UI/Modal';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';
import { emptyLoadingRequirement, emptyDocumentRequirement } from '../../utils/poRequirements';
import { PRODUCT_TYPES, PRODUCT_TYPE_FULL_NAMES } from '../../utils/productTypes';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface FormErrors {
  code?: string;
  companyName?: string;
}

type BuyerFormData = Omit<Buyer, 'id' | 'createdAt' | 'updatedAt'>;

const INCOTERM_OPTIONS = ['FOB', 'CNF', 'CFR', 'CIF', 'EXW', 'DDP'].map((v) => ({ value: v, label: v }));

export function BuyerForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';
  const { isMobile } = useResponsive();
  const { user } = useAuth();

  const [form, setForm] = useState<BuyerFormData>({
    code: '', companyName: '', country: '', address: '',
    contactPerson: '', phone: '', email: '',
    paymentTerms: '', portOfLoading: '', portOfDischarge: '', incoterm: '',
    loadingRequirement: emptyLoadingRequirement(), loadingRequirementRemark: '',
    documentRequirement: emptyDocumentRequirement(), documentRequirementRemark: '',
    productTypeNameOverrides: {},
    hasSubCompanies: false, subCompanies: [],
  });
  const [loadingPage, setLoadingPage] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      buyerService.getById(id).then((existing) => {
        if (!existing) { navigate('/buyers'); return; }
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
        setForm({
          ...rest,
          loadingRequirement: rest.loadingRequirement ?? emptyLoadingRequirement(),
          documentRequirement: rest.documentRequirement ?? emptyDocumentRequirement(),
        });
        setLoadingPage(false);
      });
    }
  }, [id, isEdit, navigate]);

  const setField = <K extends keyof BuyerFormData>(key: K, value: BuyerFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  // Keeps the override map sparse — an emptied field removes its key rather than storing ''.
  const setProductTypeNameOverride = (productType: string, value: string) => {
    setForm((prev) => {
      const next = { ...(prev.productTypeNameOverrides ?? {}) };
      if (value) next[productType] = value; else delete next[productType];
      return { ...prev, productTypeNameOverrides: next };
    });
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.code.trim()) newErrors.code = 'Buyer code is required';
    if (!form.companyName.trim()) newErrors.companyName = 'Company name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const data: BuyerFormData = { ...form, code: form.code.toUpperCase() };
      const actor = user ? { id: user.id, name: user.fullName } : undefined;
      if (isEdit && id) {
        await buyerService.update(id, data, actor);
      } else {
        await buyerService.create(data, actor);
      }
      navigate('/buyers');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save buyer');
    } finally {
      setSaving(false);
    }
  };

  const addSubCompany = () => {
    setForm((prev) => ({
      ...prev,
      subCompanies: [...prev.subCompanies, { id: uid(), name: '', address: '', contactPerson: '', phone: '', email: '' }],
    }));
  };

  const updateSub = (subId: string, field: keyof SubCompany, value: string) => {
    setForm((prev) => ({
      ...prev,
      subCompanies: prev.subCompanies.map((s) => s.id === subId ? { ...s, [field]: value } : s),
    }));
  };

  const removeSub = (subId: string) => {
    setForm((prev) => ({ ...prev, subCompanies: prev.subCompanies.filter((s) => s.id !== subId) }));
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)',
  };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' };

  if (loadingPage) return <LoadingSpinner message="Loading buyer..." fullPage={false} />;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/buyers')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
            {isEdit ? 'Edit Buyer' : 'Add New Buyer'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {isEdit ? `Editing ${form.companyName}` : 'Fill in the buyer details below'}
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
          <p style={sectionTitle}>Basic Information</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={grid2}>
              <Input label="Buyer Code *" value={form.code} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder="e.g. A01" readOnly={isEdit} error={errors.code} hint={isEdit ? 'Buyer code cannot be changed' : undefined} />
              <Input label="Company Name *" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} placeholder="e.g. DUO FEN TRADING CO." error={errors.companyName} />
            </div>
            <div style={grid2}>
              <Input label="Country" value={form.country ?? ''} onChange={(e) => setField('country', e.target.value)} placeholder="e.g. China" />
              <Input label="Contact Person" value={form.contactPerson ?? ''} onChange={(e) => setField('contactPerson', e.target.value)} placeholder="e.g. Mr. Wang" />
            </div>
            <Textarea label="Address" value={form.address ?? ''} onChange={(e) => setField('address', e.target.value)} placeholder="Full business address" />
            <div style={grid2}>
              <Input label="Phone" value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} placeholder="+86 xxx xxxx xxxx" />
              <Input label="Email" type="email" value={form.email ?? ''} onChange={(e) => setField('email', e.target.value)} placeholder="contact@company.com" />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Sub-Companies</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input type="checkbox" checked={form.hasSubCompanies} onChange={(e) => setField('hasSubCompanies', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
              Has sub-companies
            </label>
          </div>

          {form.hasSubCompanies && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {form.subCompanies.map((sub, idx) => (
                <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>Sub-Company #{idx + 1}</span>
                    <button type="button" onClick={() => setDeleteSubId(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Input label="Sub-Company Name *" value={sub.name} onChange={(e) => updateSub(sub.id, 'name', e.target.value)} placeholder="Company name" />
                    <div style={grid2}>
                      <Input label="Contact Person" value={sub.contactPerson ?? ''} onChange={(e) => updateSub(sub.id, 'contactPerson', e.target.value)} placeholder="Contact name" />
                      <Input label="Phone" value={sub.phone ?? ''} onChange={(e) => updateSub(sub.id, 'phone', e.target.value)} placeholder="Phone number" />
                    </div>
                    <div style={grid2}>
                      <Input label="Email" value={sub.email ?? ''} onChange={(e) => updateSub(sub.id, 'email', e.target.value)} placeholder="Email address" />
                      <Input label="Address" value={sub.address ?? ''} onChange={(e) => updateSub(sub.id, 'address', e.target.value)} placeholder="Address" />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={addSubCompany}>
                <Plus size={14} /> Add Sub-Company
              </Button>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Shipping &amp; Payment Terms</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            These are fixed per buyer — new contracts auto-fill from here and can't be edited per contract.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={grid2}>
              <Input label="Shipped From (Port of Loading)" value={form.portOfLoading ?? ''} onChange={(e) => setField('portOfLoading', e.target.value)} placeholder="e.g. Songkhla, Thailand" />
              <Input label="Destination (Port of Discharge)" value={form.portOfDischarge ?? ''} onChange={(e) => setField('portOfDischarge', e.target.value)} placeholder="e.g. Kaohsiung, Taiwan" />
            </div>
            <Select label="Incoterm" value={form.incoterm ?? ''} onChange={(e) => setField('incoterm', e.target.value)} options={INCOTERM_OPTIONS} placeholder="— Select —" />
            <Textarea label="Payment Terms" value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)} placeholder={'e.g. T/T 20% advance payment against Sales Contract\nThe balance 80% by DP'} style={{ minHeight: '70px' }} />
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>PO — ข้อกำหนดการโหลด (ข้อ 3)</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            จะถูกดึงไปเติมในใบ Production Order ของลูกค้ารายนี้ (แก้ต่อในแต่ละ PO ได้)
          </p>
          <LoadingRequirementFields value={form.loadingRequirement} onChange={(v) => setField('loadingRequirement', v)} />
          <div style={{ marginTop: '14px' }}>
            <Input label="Remark" value={form.loadingRequirementRemark ?? ''} onChange={(e) => setField('loadingRequirementRemark', e.target.value)} placeholder="เช่น สินค้าไซด์ใหญ่วางด้านล่างเพื่อป้องกันปัญหากล่องยุบ" />
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>PO — การจัดเตรียมเอกสารและภาพถ่าย (ข้อ 4)</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            จะถูกดึงไปเติมในใบ Production Order ของลูกค้ารายนี้ (แก้ต่อในแต่ละ PO ได้)
          </p>
          <DocumentRequirementFields value={form.documentRequirement} onChange={(v) => setField('documentRequirement', v)} />
          <div style={{ marginTop: '14px' }}>
            <Input label="Remark" value={form.documentRequirementRemark ?? ''} onChange={(e) => setField('documentRequirementRemark', e.target.value)} placeholder="เช่น ..." />
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>ชื่อเต็มสินค้า (Contract / PO)</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            ชื่อที่พิมพ์ใน Sale Contract และ PO ของลูกค้ารายนี้ — เว้นว่างไว้เพื่อใช้ชื่อ default
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PRODUCT_TYPES.map((pt) => (
              <div key={pt} style={grid2}>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{pt}</div>
                <Input
                  value={form.productTypeNameOverrides?.[pt] ?? ''}
                  onChange={(e) => setProductTypeNameOverride(pt, e.target.value)}
                  placeholder={PRODUCT_TYPE_FULL_NAMES[pt]}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={() => navigate('/buyers')}>Cancel</Button>
          <Button type="submit" loading={saving}>
            <Save size={14} /> {isEdit ? 'Save Changes' : 'Create Buyer'}
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={!!deleteSubId}
        onClose={() => setDeleteSubId(null)}
        onConfirm={() => { if (deleteSubId) removeSub(deleteSubId); }}
        title="Remove Sub-Company"
        message="Are you sure you want to remove this sub-company?"
        confirmLabel="Remove"
      />
    </div>
  );
}
