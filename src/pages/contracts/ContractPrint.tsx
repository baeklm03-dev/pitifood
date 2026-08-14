import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, ChevronLeft, Edit2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { contractService } from '../../services/contractService';
import { buyerService } from '../../services/buyerService';
import type { Buyer, ProductLine, SaleContract } from '../../types';
import { formatShipment } from '../../utils/shipment';
import { getProductFullName } from '../../utils/productTypes';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

const fmtDateLong = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const SELLER = {
  name: 'PITI FOODS CO.,LTD.',
  addressLines: ['33/3 MOO.5  WAT KHANUN, SINGHANAKHON,', 'SONGKHLA 90330 THAILAND'],
  tel: '+66 74 536213',
  fax: '+66 74 536294',
  email: 'INFO@PITIFOODS.COM',
};

const BANK = {
  name: 'KASIKORNBANK PUBLIC COMPANY LIMITED',
  branchLines: ['KASIKORNBANK THANON PHETKASEM BRANCH', '426/1  PHETKASEM RD., HAT YAI, SONGKHLA 90110 THAILAND'],
  swift: 'KASITHBK',
  account: '263-1-17991-9',
  beneficiary: 'PITI FOODS CO.,LTD.',
};

const FOOTER_LINE1 = 'PITI FOODS CO.,LTD.  33/3 MOO 5  WAT KHANUN, SINGHANAKHON, SONGKHLA 90330, THAILAND';
const FOOTER_LINE2 = 'TEL : 66 74 536213 - 4   FAX : 66 74 536294   E-mail:info@pitifoods.com   website : www.pitifoods.com';

const GOODS_COL_WIDTHS = ['10%', '25%', '12%', '15%', '13%', '25%'];

const DISCLAIMER =
  'Please advise that both quantity and amount 10% more or less is allowed. Any independent inspection fees which or other special packagings, which required by the buyer are also in account of buyer.';

interface ProductGroup {
  productType: string;
  brand: string;
  lines: ProductLine[];
}

// Groups by product type + brand — same product type but a different brand stays as a
// separate group instead of merging into one table.
function groupByProductType(lines: ProductLine[]): ProductGroup[] {
  const order: string[] = [];
  const map = new Map<string, ProductGroup>();
  lines.forEach((p) => {
    const key = `${p.productType}|${p.brand}`;
    if (!map.has(key)) { map.set(key, { productType: p.productType, brand: p.brand, lines: [] }); order.push(key); }
    map.get(key)!.lines.push(p);
  });
  return order.map((key) => map.get(key)!);
}

export function ContractPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [contract, setContract] = useState<SaleContract | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) { navigate('/contracts'); return; }
    contractService.getById(id).then((c) => {
      if (!c) { navigate('/contracts'); return; }
      setContract(c);
      if (c.buyerId) {
        buyerService.getById(c.buyerId).then(setBuyer).catch(() => null);
      }
      if (c.signedFileUrl) {
        contractService.getSignedFileUrl(c.signedFileUrl)
          .then(setSignedUrl)
          .catch(() => null);
      }
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <LoadingSpinner message="Loading contract..." />;
  if (!contract) return null;

  const subCompany = contract.subCompanyId
    ? buyer?.subCompanies.find((s) => s.id === contract.subCompanyId)
    : undefined;
  const buyerDisplay = {
    name: subCompany?.name || contract.subCompanyName || contract.buyerName,
    address: subCompany?.address || buyer?.address,
    phone: subCompany?.phone || buyer?.phone,
    email: subCompany?.email || buyer?.email,
  };

  const groups = groupByProductType(contract.productLines);
  const grandQty = contract.productLines.reduce((s, p) => s + p.quantity, 0);
  const grandWeight = contract.productLines.reduce((s, p) => s + p.totalWeight, 0);
  const grandAmount = contract.productLines.reduce((s, p) => s + p.totalAmount, 0);
  const uniquePacking = Array.from(new Set(contract.productLines.map((p) => p.packing).filter(Boolean)));
  const containerLabel = contract.containerQty && contract.containerType
    ? `${contract.containerQty} x ${contract.containerType}.`
    : '—';

  const handleExportPdf = async () => {
    if (!pageRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true });
      const pageWidthMM = 210;
      const pageHeightMM = 297;

      // Shrink the whole page to fit within a single A4 sheet, whatever its actual height.
      let imgWidthMM = pageWidthMM;
      let imgHeightMM = (canvas.height / canvas.width) * imgWidthMM;
      if (imgHeightMM > pageHeightMM) {
        const scale = pageHeightMM / imgHeightMM;
        imgWidthMM *= scale;
        imgHeightMM = pageHeightMM;
      }
      const xOffset = (pageWidthMM - imgWidthMM) / 2;

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', xOffset, 0, imgWidthMM, imgHeightMM);
      pdf.save(`${contract.contractNo}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const ActionBar = () => (
    <div className="no-print" style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: isMobile ? '10px 14px' : '12px 24px', background: 'var(--primary)',
      position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap',
    }}>
      <button onClick={() => navigate('/contracts')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
        <ChevronLeft size={20} />
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{contract.contractNo}</span>
        {(contract.createdByName || contract.updatedByName) && (
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            {contract.createdByName && `Created by ${contract.createdByName}`}
            {contract.updatedByName && contract.updatedByName !== contract.createdByName && ` · Updated by ${contract.updatedByName}`}
          </span>
        )}
      </div>
      {signedUrl && (
        <a href={signedUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
            <Download size={13} /> Signed File
          </Button>
        </a>
      )}
      {!contract.isLocked && (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/${id}/edit`)} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
          <Edit2 size={13} /> Edit
        </Button>
      )}
      <Button size="sm" loading={exporting} onClick={handleExportPdf} style={{ background: 'var(--accent)', border: 'none' }}>
        <FileDown size={14} /> Export PDF
      </Button>
    </div>
  );

  const border = '0.5pt solid #333';
  const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border, padding: '2pt 5pt', fontSize: '8pt', verticalAlign: 'middle', ...extra,
  });

  return (
    <div>
      <ActionBar />
      <div style={{ background: '#E5E7EB', padding: isMobile ? '16px 12px' : '32px 24px', minHeight: 'calc(100vh - 56px)', overflowX: 'auto' }}>
        <div
          ref={pageRef}
          className="print-page"
          style={{
            width: '794px', minHeight: '1123px', margin: '0 auto', background: '#fff',
            padding: '32px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', Arial, sans-serif", fontSize: '8.5pt', color: '#000',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header (logo overlaps center, doesn't push content down) */}
          <div style={{ position: 'relative' }}>
            <img src="/logo-notext.png" alt="PITI FOODS" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: '70pt', objectFit: 'contain' }} />
            <div style={{ fontSize: '18pt', fontWeight: 700, marginBottom: '10pt' }}>Sales Contract</div>
            <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', verticalAlign: 'top', width: '78pt' }}>Reference No.</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', fontWeight: 600 }} colSpan={3}>{contract.contractNo}</td>
                </tr>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', verticalAlign: 'top' }}>Date :</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt' }} colSpan={3}>{fmtDateLong(contract.offerDate)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', verticalAlign: 'top', width: '78pt' }}>Seller :</td>
                  <td style={{ padding: '1.5pt 20pt 1.5pt 0', fontSize: '8.5pt', lineHeight: 1.5, verticalAlign: 'top' }}>
                    {SELLER.name}<br />
                    {SELLER.addressLines.map((l) => <React.Fragment key={l}>{l}<br /></React.Fragment>)}
                    TEL: {SELLER.tel}&nbsp;&nbsp;FAX: {SELLER.fax}<br />
                    E-MAIL : {SELLER.email}
                  </td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', verticalAlign: 'top', width: '48pt' }}>Buyer :</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', lineHeight: 1.5, verticalAlign: 'top' }}>
                    <span style={{ fontWeight: 700 }}>{buyerDisplay.name}</span><br />
                    {buyerDisplay.address && <>{buyerDisplay.address}<br /></>}
                    {buyerDisplay.phone && <>TEL: {buyerDisplay.phone}<br /></>}
                    {buyerDisplay.email && <>E-MAIL : {buyerDisplay.email}</>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Goods Description */}
          <div style={{ fontWeight: 600, fontSize: '9pt', textDecoration: 'underline', marginBottom: '6pt' }}>Goods Description</div>

          {groups.map((group, gi) => {
            const groupQty = group.lines.reduce((s, p) => s + p.quantity, 0);
            const groupWeight = group.lines.reduce((s, p) => s + p.totalWeight, 0);
            const groupAmount = group.lines.reduce((s, p) => s + p.totalAmount, 0);
            const brandLabel = group.brand ? ` "${group.brand}"` : '';
            return (
              <div key={group.productType + group.brand + gi} style={{ marginBottom: '4pt' }}>
                <div style={{ fontWeight: 600, fontSize: '8.5pt', marginBottom: '2pt' }}>
                  {gi + 1}.&nbsp;&nbsp;{getProductFullName(group.productType, buyer?.productTypeNameOverrides)}{brandLabel}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    {GOODS_COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Size/kg</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Packing</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Quantity</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Quantity(n.w)</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Price</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Amount</th>
                    </tr>
                    <tr>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}></th>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>{contract.packingStyle || ''}</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>ctns</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>kg</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>USD/kg</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lines.map((p) => (
                      <tr key={p.id}>
                        <td style={cell({ borderTop: 'none', borderBottom: 'none' })}>{p.size}</td>
                        <td style={cell({ borderTop: 'none', borderBottom: 'none' })}>{p.packing}</td>
                        <td style={cell({ borderTop: 'none', borderBottom: 'none', textAlign: 'right' })}>{fmtNum(p.quantity, 0)}</td>
                        <td style={cell({ borderTop: 'none', borderBottom: 'none', textAlign: 'right' })}>{fmtNum(p.totalWeight)}</td>
                        <td style={cell({ borderTop: 'none', borderBottom: 'none', textAlign: 'right' })}>{fmtNum(p.unitPrice)}</td>
                        <td style={cell({ borderTop: 'none', borderBottom: 'none', textAlign: 'right' })}>{fmtNum(p.totalAmount)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700 }}>
                      <td style={cell({ borderTop: '1pt solid #333' })}></td>
                      <td style={cell({ borderTop: '1pt solid #333' })}>Total</td>
                      <td style={cell({ borderTop: '1pt solid #333', textAlign: 'right' })}>{fmtNum(groupQty, 0)}</td>
                      <td style={cell({ borderTop: '1pt solid #333', textAlign: 'right' })}>{fmtNum(groupWeight)}</td>
                      <td style={cell({ borderTop: '1pt solid #333' })}></td>
                      <td style={cell({ borderTop: '1pt solid #333', textAlign: 'right' })}>{fmtNum(groupAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2pt', tableLayout: 'fixed' }}>
            <colgroup>
              {GOODS_COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <tbody>
              <tr style={{ fontWeight: 700, background: '#F2F2F2' }}>
                <td style={cell({ borderTop: '1pt solid #333' })}></td>
                <td style={cell({ borderTop: '1pt solid #333' })}>Grand Total</td>
                <td style={cell({ borderTop: '1pt solid #333', textAlign: 'right' })}>{fmtNum(grandQty, 0)}</td>
                <td style={cell({ borderTop: '1pt solid #333', textAlign: 'right' })}>{fmtNum(grandWeight)}</td>
                <td style={cell({ borderTop: '1pt solid #333' })}></td>
                <td style={cell({ borderTop: '1pt solid #333', textAlign: 'right' })}>{fmtNum(grandAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'right', fontSize: '8.5pt', fontWeight: 600, marginBottom: '10pt' }}>
            Incoterm : {contract.incoterm || '—'} {contract.portOfDischarge || ''}
          </div>

          {/* Summary block */}
          <table style={{ borderCollapse: 'collapse', marginBottom: '10pt' }}>
            <tbody>
              {[
                ['Packing', uniquePacking.join(', ') || '—'],
                ['Total Quantity', `${containerLabel}   ( ${fmtNum(grandQty, 0)} Ctns Or ${fmtNum(grandWeight, 0)} Kgs)`],
                ['Total Amount', `USD ${fmtNum(grandAmount)}`],
                ['Shipment', formatShipment(contract.shipmentPeriod, contract.shipmentMonth, contract.shipmentYear)],
                ['Shipped From', contract.portOfLoading || '—'],
                ['Destination', contract.portOfDischarge || '—'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '1.5pt 10pt 1.5pt 0', fontSize: '8.5pt', fontWeight: 600, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt' }}>{value}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '1.5pt 10pt 1.5pt 0', fontSize: '8.5pt', fontWeight: 600, verticalAlign: 'top', whiteSpace: 'nowrap' }}>Payment</td>
                <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', whiteSpace: 'pre-line' }}>{contract.paymentTerms || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '1.5pt 10pt 1.5pt 0', fontSize: '8.5pt', fontWeight: 600, verticalAlign: 'top', whiteSpace: 'nowrap' }}>Advising Bank</td>
                <td style={{ padding: '1.5pt 0', fontSize: '8.5pt' }}>
                  {BANK.name}<br />
                  {BANK.branchLines.map((l) => <React.Fragment key={l}>{l}<br /></React.Fragment>)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '1.5pt 10pt 1.5pt 0', fontSize: '8.5pt', fontWeight: 600, whiteSpace: 'nowrap' }}>SWIFT CODE :</td>
                <td style={{ padding: '1.5pt 0', fontSize: '8.5pt' }}>{BANK.swift}</td>
              </tr>
              <tr>
                <td style={{ padding: '1.5pt 10pt 1.5pt 0', fontSize: '8.5pt', fontWeight: 600, whiteSpace: 'nowrap' }}>Account No.</td>
                <td style={{ padding: '1.5pt 0', fontSize: '8.5pt' }}>{BANK.account}</td>
              </tr>
              <tr>
                <td style={{ padding: '1.5pt 10pt 1.5pt 0', fontSize: '8.5pt', fontWeight: 600, whiteSpace: 'nowrap' }}>Beneficiary Name :</td>
                <td style={{ padding: '1.5pt 0', fontSize: '8.5pt' }}>{BANK.beneficiary}</td>
              </tr>
            </tbody>
          </table>

          {/* Disclaimer */}
          <div style={{ fontSize: '8pt', lineHeight: 1.5, marginBottom: '18pt' }}>{DISCLAIMER}</div>

          {/* Pushes the signature block + footer to the bottom of the page when content is short */}
          <div style={{ flex: 1 }} />

          {/* Signature line */}
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '8.5pt', marginBottom: '4pt' }}>
            <span style={{ flexShrink: 0 }}>Acknowledged by</span>
            <span style={{ flex: 1, borderBottom: '0.5pt dotted #000', margin: '0 4pt', minWidth: '40pt' }} />
            <span style={{ flexShrink: 0 }}>(Seller)</span>
            <span style={{ flex: 1, borderBottom: '0.5pt dotted #000', margin: '0 4pt', minWidth: '40pt' }} />
            <span style={{ flexShrink: 0 }}>(Buyer)</span>
          </div>
          {(contract.signatories[0]?.fullName || contract.signatories[1]?.fullName) && (
            <div style={{ display: 'flex', fontSize: '7.5pt', color: '#555', marginBottom: '18pt' }}>
              <span style={{ flex: '0 0 100pt' }}></span>
              <span style={{ flex: 1, textAlign: 'center' }}>{contract.signatories[0]?.fullName}{contract.signatories[0]?.title ? ` — ${contract.signatories[0].title}` : ''}</span>
              <span style={{ flex: 1, textAlign: 'center' }}>{contract.signatories[1]?.fullName}{contract.signatories[1]?.title ? ` — ${contract.signatories[1].title}` : ''}</span>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '18pt', fontSize: '7pt', color: '#333', textAlign: 'center', borderTop: '0.5pt solid #999', paddingTop: '5pt' }}>
            {FOOTER_LINE1}<br />{FOOTER_LINE2}
          </div>
        </div>
      </div>
    </div>
  );
}
