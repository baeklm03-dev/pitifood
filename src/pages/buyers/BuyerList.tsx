import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Eye, Building2 } from 'lucide-react';
import { buyerService } from '../../services/buyerService';
import type { Buyer } from '../../types';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';

export function BuyerList() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    buyerService.getAll()
      .then(setBuyers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = buyers.filter(
    (b) =>
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (b.country ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '13px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)',
    verticalAlign: 'middle',
  };

  if (loading) return <LoadingSpinner message="Loading buyers..." fullPage={false} />;
  if (error) return <div style={{ padding: '40px', color: 'var(--danger)' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>Buyers</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{buyers.length} buyer{buyers.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => navigate('/buyers/new')}>
          <Plus size={14} /> Add Buyer
        </Button>
      </div>

      <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '340px' }}>
        <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, company, or country..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 32px',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            outline: 'none',
            background: 'var(--surface)',
          }}
        />
      </div>

      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Company Name</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>Sub-Companies</th>
              <th style={thStyle}>Payment Terms</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Building2 size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                  {search ? 'No buyers match your search.' : 'No buyers yet. Add one to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((buyer) => (
                <tr key={buyer.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', background: '#EBF5FB', padding: '2px 8px', borderRadius: '4px' }}>
                      {buyer.code}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{buyer.companyName}</td>
                  <td style={tdStyle}>{buyer.country || '—'}</td>
                  <td style={tdStyle}>
                    {buyer.hasSubCompanies && buyer.subCompanies.length > 0 ? (
                      <Badge variant="primary">{buyer.subCompanies.length} sub-co.</Badge>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: '260px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {buyer.paymentTerms || '—'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link to={`/buyers/${buyer.id}`}>
                        <Button variant="ghost" size="sm"><Eye size={13} /> View</Button>
                      </Link>
                      <Link to={`/buyers/${buyer.id}/edit`}>
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
  );
}
