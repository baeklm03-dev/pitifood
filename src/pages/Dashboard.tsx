import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, Lock, DollarSign, Download, Plus, BarChart3 } from 'lucide-react';
import { contractService } from '../services/contractService';
import { exportToExcel } from '../utils/exportExcel';
import { exportSizeReport, exportCustomerPriceQtyReport } from '../utils/exportCustomerReports';
import { formatShipment } from '../utils/shipment';
import type { SaleContract, ContractStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const fmtNum = (n: number, dec = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtUSD = (n: number) => {
  if (n === 0) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type StatusVariant = 'neutral' | 'primary' | 'success' | 'locked';
const statusVariant = (s: ContractStatus): StatusVariant =>
  ({ draft: 'neutral', finalized: 'primary', signed: 'success', locked: 'locked' } as const)[s];

const statusLabel: Record<ContractStatus, string> = {
  draft: 'Draft', finalized: 'Finalized', signed: 'Signed', locked: 'Locked',
};

interface Filters { year: string; month: string; buyerCode: string; status: string; }

export function Dashboard() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<SaleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ year: '', month: '', buyerCode: '', status: '' });
  const [exportingSize, setExportingSize] = useState(false);
  const [exportingCustomer, setExportingCustomer] = useState(false);

  useEffect(() => {
    contractService.getAll()
      .then(setContracts)
      .finally(() => setLoading(false));
  }, []);

  const setFilter = (key: keyof Filters, val: string) => setFilters((prev) => ({ ...prev, [key]: val }));

  const handleExportSize = async () => {
    setExportingSize(true);
    try {
      await exportSizeReport(nonDraftContracts);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export size report');
    } finally {
      setExportingSize(false);
    }
  };

  const handleExportCustomer = async () => {
    setExportingCustomer(true);
    try {
      await exportCustomerPriceQtyReport(nonDraftContracts);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export customer report');
    } finally {
      setExportingCustomer(false);
    }
  };

  const globalStats = useMemo(() => {
    const totalVal = contracts.reduce((sum, c) => sum + c.productLines.reduce((s, p) => s + p.totalAmount, 0), 0);
    return {
      total: contracts.length,
      active: contracts.filter((c) => c.status === 'draft' || c.status === 'finalized').length,
      locked: contracts.filter((c) => c.status === 'locked' || c.status === 'signed').length,
      totalValue: totalVal,
    };
  }, [contracts]);

  const filtered = useMemo(() =>
    contracts.filter((c) => {
      const d = new Date(c.offerDate);
      return (
        (!filters.year || d.getFullYear().toString() === filters.year) &&
        (!filters.month || (d.getMonth() + 1).toString() === filters.month) &&
        (!filters.buyerCode || c.buyerCode === filters.buyerCode) &&
        (!filters.status || c.status === filters.status)
      );
    }).sort((a, b) => new Date(b.offerDate).getTime() - new Date(a.offerDate).getTime()),
    [contracts, filters]
  );

  const nonDraftContracts = useMemo(() => contracts.filter((c) => c.status !== 'draft'), [contracts]);

  const sizeRows = useMemo(() => {
    const map: Record<string, { size: string; sizeUnit: string; qty: number; netWt: number }> = {};
    filtered.forEach((c) =>
      c.productLines.forEach((p) => {
        const key = `${p.size}||${p.sizeUnit}`;
        if (!map[key]) map[key] = { size: p.size, sizeUnit: p.sizeUnit, qty: 0, netWt: 0 };
        map[key].qty += p.quantity;
        map[key].netWt += p.totalWeight;
      })
    );
    return Object.values(map).sort((a, b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0));
  }, [filtered]);

  const filteredTotals = useMemo(() => ({
    qty: filtered.reduce((s, c) => s + c.productLines.reduce((a, p) => a + p.quantity, 0), 0),
    wt:  filtered.reduce((s, c) => s + c.productLines.reduce((a, p) => a + p.totalWeight, 0), 0),
    amt: filtered.reduce((s, c) => s + c.productLines.reduce((a, p) => a + p.totalAmount, 0), 0),
  }), [filtered]);

  const availableYears = useMemo(() =>
    Array.from(new Set(contracts.map((c) => new Date(c.offerDate).getFullYear().toString()))).sort().reverse(),
    [contracts]
  );

  const buyerOptions = useMemo(() => Array.from(new Set(contracts.map((c) => c.buyerCode))).sort(), [contracts]);

  const hasFilters = filters.year || filters.month || filters.buyerCode || filters.status;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const thStyle: React.CSSProperties = {
    padding: '9px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 600,
    color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)', background: 'var(--bg)', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: '12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
  };
  const filterSelect: React.CSSProperties = {
    padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
    fontSize: '12px', background: 'var(--surface)', outline: 'none', cursor: 'pointer', color: 'var(--text)',
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." fullPage={false} />;

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginBottom: '2px' }}>
            {greeting}, {user?.fullName} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/contracts/new"><Button><Plus size={13} /> New Contract</Button></Link>
          <Link to="/buyers/new"><Button variant="secondary"><Plus size={13} /> Add Buyer</Button></Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Contracts', value: globalStats.total, icon: <FileText size={32} />, bg: 'var(--primary)', to: '/contracts' },
          { label: 'Active (Draft + Finalized)', value: globalStats.active, icon: <TrendingUp size={32} />, bg: 'var(--primary-light)', to: '/contracts' },
          { label: 'Locked / Signed', value: globalStats.locked, icon: <Lock size={32} />, bg: 'var(--locked)', to: '/contracts' },
          { label: 'Total Value (USD)', value: fmtUSD(globalStats.totalValue), icon: <DollarSign size={32} />, bg: 'var(--accent)', to: '/contracts' },
        ].map((card) => (
          <Link key={card.label} to={card.to} style={{ background: card.bg, borderRadius: 'var(--radius-lg)', padding: '22px', color: '#fff', textDecoration: 'none', position: 'relative', overflow: 'hidden', display: 'block', transition: 'filter 0.15s, transform 0.15s, box-shadow 0.15s', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <div style={{ position: 'absolute', right: '10px', bottom: '4px', opacity: 0.18, transform: 'scale(1.8)', transformOrigin: 'right bottom' }}>{card.icon}</div>
            <div style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1, marginBottom: '10px' }}>{card.value}</div>
            <div style={{ fontSize: '11px', opacity: 0.88, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Filter Panel */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>FILTERS</span>
        <select value={filters.year} onChange={(e) => setFilter('year', e.target.value)} style={filterSelect}>
          <option value="">All Years</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.month} onChange={(e) => setFilter('month', e.target.value)} style={filterSelect}>
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
        </select>
        <select value={filters.buyerCode} onChange={(e) => setFilter('buyerCode', e.target.value)} style={filterSelect}>
          <option value="">All Buyers</option>
          {buyerOptions.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} style={filterSelect}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="signed">Signed</option>
          <option value="locked">Locked</option>
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ year: '', month: '', buyerCode: '', status: '' })} style={{ ...filterSelect, border: 'none', background: 'none', color: 'var(--text-muted)' }}>
            ✕ Clear
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{filtered.length} of {contracts.length} contracts</span>
        <Button variant="primary" onClick={() => exportToExcel(filtered)} disabled={filtered.length === 0} style={{ background: 'var(--accent)', border: 'none' }}>
          <Download size={13} /> Export Excel
        </Button>
        <Button variant="secondary" onClick={handleExportSize} loading={exportingSize} disabled={nonDraftContracts.length === 0}>
          <Download size={13} /> Export by Size
        </Button>
        <Button variant="secondary" onClick={handleExportCustomer} loading={exportingCustomer} disabled={nonDraftContracts.length === 0}>
          <Download size={13} /> Export by Customer
        </Button>
      </div>

      {/* Contract Summary Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Contract Summary</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Contract No.</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Offer Date</th>
                <th style={thStyle}>Shipment</th>
                <th style={thStyle}>Products</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Qty</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Wt (kg)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount (USD)</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <FileText size={28} style={{ opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
                    {hasFilters ? 'No contracts match the current filters.' : 'No contracts yet.'}
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((c) => {
                    const totalQty = c.productLines.reduce((s, p) => s + p.quantity, 0);
                    const totalWt = c.productLines.reduce((s, p) => s + p.totalWeight, 0);
                    const totalAmt = c.productLines.reduce((s, p) => s + p.totalAmount, 0);
                    const products = [...new Set(c.productLines.map((p) => p.productType))].join(', ');
                    return (
                      <tr key={c.id}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={tdStyle}><Link to={`/contracts/${c.id}/print`} style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '12px' }}>{c.contractNo}</Link></td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500 }}>{c.buyerName}</div>
                          {c.subCompanyName && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.subCompanyName}</div>}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(c.offerDate)}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatShipment(c.shipmentPeriod, c.shipmentMonth, c.shipmentYear)}</td>
                        <td style={{ ...tdStyle, maxWidth: '200px' }}><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{products || '—'}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>{fmtNum(totalQty)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>{fmtNum(totalWt, 2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: 500, color: 'var(--primary)' }}>{fmtNum(totalAmt, 2)}</td>
                        <td style={tdStyle}><Badge variant={statusVariant(c.status)}>{c.isLocked && '🔒 '}{statusLabel[c.status]}</Badge></td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#EBF5FB', fontWeight: 700 }}>
                    <td colSpan={5} style={{ ...tdStyle, fontSize: '11px', color: 'var(--primary)', letterSpacing: '0.04em', textTransform: 'uppercase', borderTop: '2px solid var(--border)' }}>
                      TOTAL — {filtered.length} contract{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)', color: 'var(--primary)' }}>{fmtNum(filteredTotals.qty)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)', color: 'var(--primary)' }}>{fmtNum(filteredTotals.wt, 2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', borderTop: '2px solid var(--border)', color: 'var(--primary)' }}>{fmtNum(filteredTotals.amt, 2)}</td>
                    <td style={{ borderTop: '2px solid var(--border)' }} />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Size + Buyer breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Size Distribution</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(filtered)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Size</th><th style={thStyle}>Unit</th><th style={{ ...thStyle, textAlign: 'right' }}>Total Qty (Ctns)</th><th style={{ ...thStyle, textAlign: 'right' }}>Total Net Wt (kg)</th></tr></thead>
            <tbody>
              {sizeRows.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>No data</td></tr>
              ) : sizeRows.map((row) => (
                <tr key={`${row.size}|${row.sizeUnit}`}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace' }}>{row.size}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{row.sizeUnit}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(row.qty)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(row.netWt, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={15} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Buyer Breakdown</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(filtered)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Buyer</th><th style={{ ...thStyle, textAlign: 'right' }}>Contracts</th><th style={{ ...thStyle, textAlign: 'right' }}>Total Qty</th><th style={{ ...thStyle, textAlign: 'right' }}>Amount (USD)</th></tr></thead>
            <tbody>
              {(() => {
                const buyerMap: Record<string, { name: string; count: number; qty: number; amt: number }> = {};
                filtered.forEach((c) => {
                  if (!buyerMap[c.buyerCode]) buyerMap[c.buyerCode] = { name: c.buyerName, count: 0, qty: 0, amt: 0 };
                  buyerMap[c.buyerCode].count++;
                  buyerMap[c.buyerCode].qty += c.productLines.reduce((s, p) => s + p.quantity, 0);
                  buyerMap[c.buyerCode].amt += c.productLines.reduce((s, p) => s + p.totalAmount, 0);
                });
                const rows = Object.entries(buyerMap).sort((a, b) => b[1].amt - a[1].amt);
                if (!rows.length) return <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>No data</td></tr>;
                return rows.map(([code, row]) => (
                  <tr key={code}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}><div style={{ fontWeight: 500 }}>{row.name}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{code}</div></td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>{row.count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(row.qty)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: 'var(--primary)' }}>{fmtNum(row.amt, 2)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
