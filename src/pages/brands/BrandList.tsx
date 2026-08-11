import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Eye, Tag } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { buyerService } from '../../services/buyerService';
import type { Brand, Buyer } from '../../types';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

export function BrandList() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');

  useEffect(() => {
    Promise.all([brandService.getAll(), buyerService.getAll()])
      .then(([b, bu]) => { setBrands(b); setBuyers(bu); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const getBuyerName = (buyerId: string) => buyers.find((b) => b.id === buyerId)?.companyName ?? '';

  const filtered = brands.filter((br) => {
    const matchSearch =
      br.brandName.toLowerCase().includes(search.toLowerCase()) ||
      br.buyerCode.toLowerCase().includes(search.toLowerCase()) ||
      getBuyerName(br.buyerId).toLowerCase().includes(search.toLowerCase());
    const matchBuyer = !filterBuyer || br.buyerCode === filterBuyer;
    return matchSearch && matchBuyer;
  });

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)', background: 'var(--bg)', whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)',
    color: 'var(--text)', verticalAlign: 'middle',
  };

  const buyerOptions = Array.from(new Set(brands.map((b) => b.buyerCode))).sort();

  if (loading) return <LoadingSpinner message="Loading brands..." fullPage={false} />;
  if (error) return <div style={{ padding: '40px', color: 'var(--danger)' }}>Error: {error}</div>;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>Brands</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{brands.length} brand{brands.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => navigate('/brands/new')}>
          <Plus size={14} /> Add Brand
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', outline: 'none', background: 'var(--surface)' }}
          />
        </div>
        <select
          value={filterBuyer}
          onChange={(e) => setFilterBuyer(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', outline: 'none', background: 'var(--surface)', minWidth: '160px' }}
        >
          <option value="">All Buyers</option>
          {buyerOptions.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
          <thead>
            <tr>
              <th style={thStyle}>Brand Name</th>
              <th style={thStyle}>Linked Buyer</th>
              <th style={thStyle}>Product Types</th>
              <th style={thStyle}>Packing Sizes</th>
              <th style={thStyle}>By</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Tag size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                  {search || filterBuyer ? 'No brands match your filters.' : 'No brands yet. Add one to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((brand) => (
                <tr key={brand.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{brand.brandName}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary)', background: '#EBF5FB', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                        {brand.buyerCode}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{getBuyerName(brand.buyerId)}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {brand.productTypes?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {brand.productTypes.map((pt) => (
                          <span key={pt} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)' }}>{pt}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>ทุกประเภท</span>}
                  </td>
                  <td style={tdStyle}>{brand.packingSizes?.length ? brand.packingSizes.join(', ') : (brand.defaultPacking || '—')}</td>
                  <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '130px' }}>
                    {brand.createdByName ? (
                      <div>
                        <div title={`Created by ${brand.createdByName}`}>{brand.createdByName}</div>
                        {brand.updatedByName && brand.updatedByName !== brand.createdByName && (
                          <div style={{ fontSize: '10px' }} title={`Updated by ${brand.updatedByName}`}>✎ {brand.updatedByName}</div>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link to={`/brands/${brand.id}`}>
                        <Button variant="ghost" size="sm"><Eye size={13} /> View</Button>
                      </Link>
                      <Link to={`/brands/${brand.id}/edit`}>
                        <Button variant="secondary" size="sm"><Edit2 size={13} /> Edit</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
