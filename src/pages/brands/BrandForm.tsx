import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { buyerService } from '../../services/buyerService';
import type { Brand, Buyer } from '../../types';
import { Button } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

interface FormErrors {
  brandName?: string;
  buyerId?: string;
}

type BrandData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>;

export function BrandForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && id !== 'new';

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [form, setForm] = useState<BrandData>({
    brandName: '', buyerId: '', buyerCode: '',
    defaultPacking: '', defaultOrigin: 'Thailand', defaultSpec: '', notes: '',
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
          defaultPacking: existing.defaultPacking ?? '',
          defaultOrigin: existing.defaultOrigin ?? 'Thailand',
          defaultSpec: existing.defaultSpec ?? '',
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
      const data: BrandData = {
        ...form,
        brandName: form.brandName.trim(),
        buyerCode: buyer?.code ?? form.buyerCode,
        defaultPacking: form.defaultPacking || undefined,
        defaultOrigin: form.defaultOrigin || undefined,
        defaultSpec: form.defaultSpec || undefined,
        notes: form.notes || undefined,
      };
      if (isEdit && id) {
        await brandService.update(id, data);
      } else {
        await brandService.create(data);
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
    <div style={{ padding: '28px 32px', maxWidth: '680px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input label="Brand Name *" value={form.brandName} onChange={(e) => setField('brandName', e.target.value.toUpperCase())} placeholder="e.g. KING" error={errors.brandName} />
              <Select label="Linked Buyer *" value={form.buyerId} onChange={(e) => setField('buyerId', e.target.value)} options={buyerOptions} placeholder="Select buyer..." error={errors.buyerId} />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}>Defaults (auto-filled in contracts)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input label="Default Packing" value={form.defaultPacking ?? ''} onChange={(e) => setField('defaultPacking', e.target.value)} placeholder="e.g. 12X450 g" />
              <Input label="Default Origin" value={form.defaultOrigin ?? ''} onChange={(e) => setField('defaultOrigin', e.target.value)} placeholder="e.g. Thailand" />
            </div>
            <Textarea label="Default Specification" value={form.defaultSpec ?? ''} onChange={(e) => setField('defaultSpec', e.target.value)} placeholder="Product specification text..." />
            <Textarea label="Notes" value={form.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} placeholder="Internal notes..." style={{ minHeight: '70px' }} />
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
