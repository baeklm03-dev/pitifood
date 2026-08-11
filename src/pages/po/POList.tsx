import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Printer, Trash2, FileText } from 'lucide-react';
import { poService } from '../../services/poService';
import type { ProductionOrder, POStatus } from '../../types';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { ConfirmModal } from '../../components/UI/Modal';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

type BadgeVariant = 'neutral' | 'primary';
const statusVariant = (s: POStatus): BadgeVariant => (s === 'finalized' ? 'primary' : 'neutral');
const statusLabel: Record<POStatus, string> = { draft: 'Draft', finalized: 'Finalized' };

export function POList() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [pos, setPos] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrder | null>(null);

  const load = useCallback(() => {
    poService.getAll().then(setPos).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = pos.filter((p) => {
    const s = search.toLowerCase();
    return (!s || p.poNo.toLowerCase().includes(s) || p.contractNo.toLowerCase().includes(s) || (p.buyerName ?? '').toLowerCase().includes(s))
      && (!statusFilter || p.status === statusFilter);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await poService.delete(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (err) { console.error(err); }
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)', background: 'var(--bg)', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: '12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
  };
  const filterSelect: React.CSSProperties = {
    padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
    fontSize: '12px', background: 'var(--surface)', outline: 'none',
  };

  if (loading) return <LoadingSpinner message="Loading production orders..." fullPage={false} />;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>Production Orders</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {filtered.length} of {pos.length} order{pos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/po/new')}><Plus size={14} /> New PO</Button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: '240px', flex: isMobile ? '1 1 100%' : undefined }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO no., contract, buyer..." style={{ ...filterSelect, paddingLeft: '30px', width: '100%' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterSelect}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
        </select>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
            <thead>
              <tr>
                <th style={thStyle}>PO No.</th>
                <th style={thStyle}>Ref. Contract</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>PO Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>By</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <FileText size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                    {search || statusFilter ? 'No POs match your filters.' : 'No production orders yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>
                      <Link to={`/po/${p.id}/print`} style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>{p.poNo}</Link>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.contractNo}</td>
                    <td style={tdStyle}>{p.buyerName ?? '—'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(p.poDate)}</td>
                    <td style={tdStyle}><Badge variant={statusVariant(p.status)}>{statusLabel[p.status]}</Badge></td>
                    <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '120px' }}>
                      {p.createdByName ? (
                        <div>
                          <div>{p.createdByName}</div>
                          {p.updatedByName && p.updatedByName !== p.createdByName && <div style={{ fontSize: '10px' }}>✎ {p.updatedByName}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <Link to={`/po/${p.id}/print`}><Button variant="ghost" size="sm"><Printer size={12} /></Button></Link>
                        <Link to={`/po/${p.id}/edit`}><Button variant="secondary" size="sm"><Edit2 size={12} /> Edit</Button></Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)}><Trash2 size={12} /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Production Order"
        message={`ลบ ${deleteTarget?.poNo}? การกระทำนี้ย้อนกลับไม่ได้`}
        confirmLabel="Delete"
      />
    </div>
  );
}
