import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Edit2 } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { buyerService } from '../../services/buyerService';
import type { Brand, Buyer, RequirementRow } from '../../types';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

export function BrandView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
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
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '140px 1fr', gap: isMobile ? '2px' : '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '1px' }}>{label}</span>
        <span style={{ fontSize: '13px' }}>{value}</span>
      </div>
    ) : null;

  const RowsBlock = ({ label, rows, remark }: { label: string; rows: RequirementRow[]; remark?: string }) =>
    (rows.length > 0 || remark) ? (
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        {rows.length > 0 && (
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {rows.map((r) => (
              <div key={r.id} style={{ fontSize: '13px' }}><strong>{r.label || '—'}:</strong> {r.detail || '—'}</div>
            ))}
          </div>
        )}
        {remark && <div style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '6px' }}>Remark: {remark}</div>}
      </div>
    ) : null;

  if (loading) return <LoadingSpinner message="Loading brand..." fullPage={false} />;
  if (!brand) return null;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: '680px' }}>
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
        <Row label="Product Types" value={brand.productTypes?.length ? brand.productTypes.join(', ') : 'ทุกประเภท'} />
        <Row label="Packing Sizes" value={brand.packingSizes?.length ? brand.packingSizes.join(', ') : brand.defaultPacking} />
        <Row label="Default Origin" value={brand.defaultOrigin} />
        <RowsBlock label="PO ข้อ 1 — Product Spec" rows={brand.productSpecRows} remark={brand.productSpecRemark} />
        <RowsBlock label="PO ข้อ 2 — Packing Detail" rows={brand.packingDetailRows} remark={brand.packingDetailRemark} />
        <Row label="Notes" value={brand.notes} />
        <div style={{ padding: '10px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '140px 1fr', gap: isMobile ? '2px' : '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {new Date(brand.createdAt).toLocaleDateString()}{brand.createdByName ? ` by ${brand.createdByName}` : ''}
          </span>
        </div>
        {brand.updatedByName && brand.updatedByName !== brand.createdByName && (
          <div style={{ padding: '10px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '140px 1fr', gap: isMobile ? '2px' : '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Edited</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {new Date(brand.updatedAt).toLocaleDateString()} by {brand.updatedByName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
