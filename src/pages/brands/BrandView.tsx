import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Edit2 } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { buyerService } from '../../services/buyerService';
import type { Brand, Buyer } from '../../types';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

export function BrandView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { navigate('/brands'); return; }
    brandService.getById(id).then((b) => {
      if (!b) { navigate('/brands'); return; }
      setBrand(b);
      return buyerService.getById(b.buyerId).then(setBuyer);
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '1px' }}>{label}</span>
        <span style={{ fontSize: '13px' }}>{value}</span>
      </div>
    ) : null;

  if (loading) return <LoadingSpinner message="Loading brand..." fullPage={false} />;
  if (!brand) return null;

  return (
    <div style={{ padding: '28px 32px', maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/brands')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{brand.brandName}</h1>
        </div>
        <Link to={`/brands/${brand.id}/edit`}>
          <Button variant="secondary"><Edit2 size={13} /> Edit</Button>
        </Link>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <Row label="Brand Name" value={brand.brandName} />
        <Row label="Linked Buyer" value={buyer ? `${buyer.code} — ${buyer.companyName}` : brand.buyerCode} />
        <Row label="Default Packing" value={brand.defaultPacking} />
        <Row label="Default Origin" value={brand.defaultOrigin} />
        <Row label="Specification" value={brand.defaultSpec} />
        <Row label="Notes" value={brand.notes} />
        <div style={{ padding: '10px 0', display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(brand.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
