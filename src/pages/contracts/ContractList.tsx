import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Printer, Upload, FileUp, RefreshCw, FileText, Lock } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { buyerService } from '../../services/buyerService';
import { generateRevisionContractNo } from '../../utils/contractNumber';
import { formatShipment } from '../../utils/shipment';
import { useAuth } from '../../hooks/useAuth';
import type { SaleContract, ContractStatus, Buyer } from '../../types';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Input, Select } from '../../components/UI/Input';
import { Modal, ConfirmModal } from '../../components/UI/Modal';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

const TODAY = new Date().toISOString().split('T')[0];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtUSD = (n: number) =>
  'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning';
const statusVariant = (s: ContractStatus): BadgeVariant =>
  ({ draft: 'neutral', finalized: 'primary', signed: 'success' } as const)[s];

const statusLabel: Record<ContractStatus, string> = {
  draft: 'Draft', finalized: 'Finalized', signed: 'Signed',
};

export function ContractList() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<SaleContract[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [uploadTarget, setUploadTarget] = useState<SaleContract | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [rewriteTarget, setRewriteTarget] = useState<SaleContract | null>(null);
  const [rewriting, setRewriting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState({ contractNo: '', buyerId: '', offerDate: TODAY });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(() => {
    contractService.getAll()
      .then(setContracts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { buyerService.getAll().then(setBuyers); }, []);

  const availableYears = Array.from(new Set(
    contracts.map((c) => { const m = c.contractNo.match(/-(\d{2})\d{2}/); return m ? `20${m[1]}` : ''; }).filter(Boolean)
  )).sort().reverse();

  const filtered = contracts.filter((c) => {
    const s = search.toLowerCase();
    return (!s || c.contractNo.toLowerCase().includes(s) || c.buyerName.toLowerCase().includes(s) || c.buyerCode.toLowerCase().includes(s))
      && (!statusFilter || c.status === statusFilter)
      && (!buyerFilter || c.buyerCode === buyerFilter)
      && (!yearFilter || c.contractNo.includes(`-${yearFilter.slice(-2)}`));
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalAmount = (c: SaleContract) => c.productLines.reduce((sum, p) => sum + p.totalAmount, 0);

  const handleUploadConfirm = async () => {
    if (!uploadTarget || !uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      await contractService.uploadSignedFile(uploadTarget.id, uploadFile);
      setUploadTarget(null);
      setUploadFile(null);
      load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRewrite = async () => {
    if (!rewriteTarget) return;
    setRewriting(true);
    try {
      const all = await contractService.getAll();
      const newNo = generateRevisionContractNo(rewriteTarget, all);
      const revision = await contractService.create({
        ...rewriteTarget,
        contractNo: newNo,
        revision: rewriteTarget.revision + 1,
        parentContractId: rewriteTarget.id,
        status: 'draft',
        isLocked: false,
        signedFileUrl: undefined,
        signedFileName: undefined,
        signedAt: undefined,
      });
      setRewriteTarget(null);
      navigate(`/contracts/${revision.id}/edit`);
    } catch (err) {
      console.error('Rewrite failed:', err);
    } finally {
      setRewriting(false);
    }
  };

  const openImport = () => {
    setImportForm({ contractNo: '', buyerId: '', offerDate: TODAY });
    setImportFile(null);
    setImportError(null);
    setImportOpen(true);
  };

  // Creates a minimal, already-locked record for a contract that existed before this
  // system (paper/Excel) — no product lines are required. Its contractNo counts toward
  // generateContractNo's per-buyer sequence, so newly generated numbers continue on from it.
  const handleImportConfirm = async () => {
    const contractNo = importForm.contractNo.trim();
    const buyer = buyers.find((b) => b.id === importForm.buyerId);
    if (!contractNo || !buyer) {
      setImportError('กรอกเลขที่ contract และเลือกลูกค้า');
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const actor = user ? { id: user.id, name: user.fullName } : undefined;
      const created = await contractService.create({
        contractNo,
        buyerId: buyer.id,
        buyerCode: buyer.code,
        buyerName: buyer.companyName,
        offerDate: importForm.offerDate || TODAY,
        paymentTerms: buyer.paymentTerms ?? '',
        productLines: [],
        signatories: [],
        status: 'finalized',
        isLocked: false,
        revision: 0,
      }, actor);

      if (importFile) {
        await contractService.uploadSignedFile(created.id, importFile);
      }

      setImportOpen(false);
      load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
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

  const buyerOptions = Array.from(new Set(contracts.map((c) => c.buyerCode))).sort();
  const importBuyerOptions = buyers
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((b) => ({ value: b.id, label: `${b.code} — ${b.companyName}` }));

  if (loading) return <LoadingSpinner message="Loading contracts..." fullPage={false} />;

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>Sale Contracts</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {filtered.length} of {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={openImport}><FileUp size={14} /> Import Contract</Button>
          <Button onClick={() => navigate('/contracts/new')}><Plus size={14} /> New Contract</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contract no. or buyer..." style={{ ...filterSelect, paddingLeft: '30px', width: '100%' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterSelect}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="signed">Signed</option>
        </select>
        <select value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)} style={filterSelect}>
          <option value="">All Buyers</option>
          {buyerOptions.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={filterSelect}>
          <option value="">All Years</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {(search || statusFilter || buyerFilter || yearFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setBuyerFilter(''); setYearFilter(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Contract No.</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Offer Date</th>
                <th style={thStyle}>Shipment</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total (USD)</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>By</th>
                <th style={thStyle}>Signed File</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <FileText size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                    {search || statusFilter || buyerFilter || yearFilter ? 'No contracts match your filters.' : 'No contracts yet. Create your first one.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {c.isLocked && <Lock size={12} style={{ color: 'var(--locked)', flexShrink: 0 }} />}
                        <Link to={`/contracts/${c.id}/print`} style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {c.contractNo}
                        </Link>
                        {c.revision > 0 && <span style={{ fontSize: '10px', color: 'var(--accent)', background: '#FEF5E7', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>rev</span>}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{c.buyerName}</div>
                      {c.subCompanyName && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.subCompanyName}</div>}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(c.offerDate)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatShipment(c.shipmentPeriod, c.shipmentMonth, c.shipmentYear)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{fmtUSD(totalAmount(c))}</td>
                    <td style={tdStyle}>
                      <Badge variant={statusVariant(c.status)}>{c.isLocked && '🔒 '}{statusLabel[c.status]}</Badge>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '130px' }}>
                      {c.createdByName ? (
                        <div>
                          <div title={`Created by ${c.createdByName}`}>{c.createdByName}</div>
                          {c.updatedByName && c.updatedByName !== c.createdByName && (
                            <div style={{ fontSize: '10px' }} title={`Updated by ${c.updatedByName}`}>✎ {c.updatedByName}</div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '140px' }}>
                      {c.signedFileName ? (
                        <span style={{ color: 'var(--success)' }} title={c.signedFileName}>
                          ✓ {c.signedFileName.length > 18 ? c.signedFileName.slice(0, 16) + '…' : c.signedFileName}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <Link to={`/contracts/${c.id}/print`}>
                          <Button variant="ghost" size="sm"><Printer size={12} /></Button>
                        </Link>
                        {!c.isLocked && (
                          <Link to={`/contracts/${c.id}/edit`}>
                            <Button variant="secondary" size="sm"><Edit2 size={12} /> Edit</Button>
                          </Link>
                        )}
                        {c.status === 'finalized' && !c.isLocked && (
                          <Button variant="success" size="sm" onClick={() => { setUploadTarget(c); setUploadFile(null); setUploadError(null); }}>
                            <Upload size={12} /> Upload Sign File
                          </Button>
                        )}
                        {c.isLocked && (
                          <Button variant="ghost" size="sm" onClick={() => setRewriteTarget(c)}>
                            <RefreshCw size={12} /> Rewrite
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Signed File Modal */}
      <Modal
        open={!!uploadTarget}
        onClose={() => { setUploadTarget(null); setUploadFile(null); setUploadError(null); }}
        title="Upload Signed Contract"
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setUploadTarget(null); setUploadFile(null); }}>Cancel</Button>
            <Button variant="success" onClick={handleUploadConfirm} loading={uploading} disabled={!uploadFile}>
              <Upload size={14} /> Upload & Lock Contract
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Upload the signed file for <strong style={{ color: 'var(--text)' }}>{uploadTarget?.contractNo}</strong>.
            The contract will be locked after upload.
          </p>
          <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '24px', textAlign: 'center', background: 'var(--bg)' }}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="signed-file-input" style={{ display: 'none' }} onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            <label htmlFor="signed-file-input" style={{ cursor: 'pointer' }}>
              <Upload size={24} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
              {uploadFile ? (
                <span style={{ color: 'var(--success)', fontWeight: 500, fontSize: '13px' }}>✓ {uploadFile.name}</span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Click to select PDF or image</span>
              )}
            </label>
          </div>
          {uploadError && <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{uploadError}</p>}
          <p style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 500 }}>
            ⚠ This action is irreversible. The contract will be locked and can only be rewritten as a new revision.
          </p>
        </div>
      </Modal>

      {/* Import Contract Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Contract"
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button loading={importing} onClick={handleImportConfirm} disabled={!importForm.contractNo.trim() || !importForm.buyerId}>
              <FileUp size={14} /> Import
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            สำหรับ contract เก่าที่มีอยู่ก่อนสร้างระบบนี้ — กรอกเลขที่ contract เดิมและแนบไฟล์ (ถ้ามี)
            เพื่อให้เลขที่ contract ใหม่ที่ระบบรันอัตโนมัติต่อจากนี้ถูกต้อง
          </p>
          <Input
            label="เลขที่ Contract เดิม *"
            value={importForm.contractNo}
            onChange={(e) => setImportForm((p) => ({ ...p, contractNo: e.target.value }))}
            placeholder="เช่น A01-2412"
          />
          <Select
            label="ลูกค้า *"
            value={importForm.buyerId}
            onChange={(e) => setImportForm((p) => ({ ...p, buyerId: e.target.value }))}
            options={importBuyerOptions}
            placeholder="— เลือกลูกค้า —"
          />
          <Input
            label="วันที่ (Offer Date)"
            type="date"
            value={importForm.offerDate}
            onChange={(e) => setImportForm((p) => ({ ...p, offerDate: e.target.value }))}
          />
          <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '24px', textAlign: 'center', background: 'var(--bg)' }}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="import-file-input" style={{ display: 'none' }} onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            <label htmlFor="import-file-input" style={{ cursor: 'pointer' }}>
              <FileUp size={24} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
              {importFile ? (
                <span style={{ color: 'var(--success)', fontWeight: 500, fontSize: '13px' }}>✓ {importFile.name}</span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>แนบไฟล์ contract เดิม (ไม่บังคับ)</span>
              )}
            </label>
          </div>
          {importError && <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{importError}</p>}
        </div>
      </Modal>

      <ConfirmModal
        open={!!rewriteTarget}
        onClose={() => setRewriteTarget(null)}
        onConfirm={handleRewrite}
        title="Create Revision"
        message={`สร้าง revision ใหม่จาก ${rewriteTarget?.contractNo}?\n\nThis will create a new draft copy of this contract for editing.`}
        confirmLabel={rewriting ? 'Creating...' : 'Create Revision'}
        confirmVariant="primary"
      />
    </div>
  );
}
