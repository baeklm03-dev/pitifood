import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Edit2, Building2, Phone, Mail, MapPin, CreditCard, Ship, Anchor } from 'lucide-react';
import { buyerService } from '../../services/buyerService';
import type { Buyer, RequirementRow } from '../../types';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

export function BuyerView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { navigate('/buyers'); return; }
    buyerService.getById(id)
      .then((b) => { if (!b) navigate('/buyers'); else setBuyer(b); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) =>
    value ? (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-muted)', marginTop: '1px', flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>{value}</div>
        </div>
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

  if (loading) return <LoadingSpinner message="Loading buyer..." fullPage={false} />;
  if (!buyer) return null;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: '760px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/buyers')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{buyer.companyName}</h1>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', background: '#EBF5FB', padding: '2px 10px', borderRadius: '4px', fontSize: '13px' }}>
                {buyer.code}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{buyer.country}</p>
          </div>
        </div>
        <Link to={`/buyers/${buyer.id}/edit`}>
          <Button variant="secondary"><Edit2 size={13} /> Edit</Button>
        </Link>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <InfoRow icon={<Building2 size={15} />} label="Company" value={buyer.companyName} />
        <InfoRow icon={<MapPin size={15} />} label="Address" value={buyer.address} />
        <InfoRow icon={<MapPin size={15} />} label="Country" value={buyer.country} />
        <InfoRow icon={<Phone size={15} />} label="Phone" value={buyer.phone} />
        <InfoRow icon={<Mail size={15} />} label="Email" value={buyer.email} />
        <InfoRow icon={<Ship size={15} />} label="Shipped From" value={buyer.portOfLoading} />
        <InfoRow icon={<Anchor size={15} />} label="Destination" value={buyer.portOfDischarge} />
        <InfoRow icon={<Building2 size={15} />} label="Incoterm" value={buyer.incoterm} />
        <InfoRow icon={<CreditCard size={15} />} label="Payment Terms" value={buyer.paymentTerms} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: buyer.updatedByName && buyer.updatedByName !== buyer.createdByName ? '1px solid var(--border)' : 'none' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</div>
            <div style={{ fontSize: '13px', marginTop: '2px', color: 'var(--text-muted)' }}>
              {new Date(buyer.createdAt).toLocaleDateString()}{buyer.createdByName ? ` by ${buyer.createdByName}` : ''}
            </div>
          </div>
        </div>
        {buyer.updatedByName && buyer.updatedByName !== buyer.createdByName && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Edited</div>
              <div style={{ fontSize: '13px', marginTop: '2px', color: 'var(--text-muted)' }}>
                {new Date(buyer.updatedAt).toLocaleDateString()} by {buyer.updatedByName}
              </div>
            </div>
          </div>
        )}
      </div>

      {buyer.hasSubCompanies && buyer.subCompanies.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)' }}>
            Sub-Companies <Badge variant="primary">{buyer.subCompanies.length}</Badge>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {buyer.subCompanies.map((sub) => (
              <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', background: 'var(--bg)' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>{sub.name}</div>
                {sub.contactPerson && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Contact: {sub.contactPerson}</div>}
                {sub.phone && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone: {sub.phone}</div>}
                {sub.email && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email: {sub.email}</div>}
                {sub.address && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Address: {sub.address}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <RowsBlock label="PO ข้อ 3 — Loading Requirement" rows={buyer.loadingRequirementRows} remark={buyer.loadingRequirementRemark} />
        <RowsBlock label="PO ข้อ 4 — Document Requirement" rows={buyer.documentRequirementRows} remark={buyer.documentRequirementRemark} />
      </div>
    </div>
  );
}
