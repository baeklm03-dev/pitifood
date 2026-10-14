import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, ChevronLeft, Edit2, Download } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { contractService } from '../../services/contractService';
import { buyerService } from '../../services/buyerService';
import type { Buyer, ProductLine, SaleContract } from '../../types';
import { formatShipment } from '../../utils/shipment';
import { buyerProductNames, getProductFullName, groupSizeUnitLabel } from '../../utils/productTypes';
import { baseContractNo } from '../../utils/contractNumber';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

const fmtDateLong = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Fixed, line-for-line as it must appear on the printed contract.
const SELLER_LINES = [
  'PITI FOODS CO.,LTD.',
  '33/3 MOO.5 WAT KHANUN, SINGHANAKHON',
  'SONGKHLA 90330 THAILAND',
  'TEL: +66 74 536213',
  'FAX: +66 74 536294',
  'E-MAIL : INFO@PITIFOODS.COM',
];

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
  const productNames = buyerProductNames(buyer?.code, buyer?.productTypeNameOverrides);
  const buyerDisplay = {
    name: subCompany?.name || contract.subCompanyName || contract.buyerName,
    address: subCompany?.address || buyer?.address,
    phone: subCompany?.phone || buyer?.phone,
    email: subCompany?.email || buyer?.email,
  };
  // The address is a free-text field — keep whatever line breaks were typed into it.
  const buyerAddressLines = (buyerDisplay.address ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const groups = groupByProductType(contract.productLines);

  // A brand label after the commodity name tells the reader which of a contract's several
  // brands a table belongs to. When the contract has just one brand and that brand is the
  // buyer's own name — AU01 SEABOSS sells brand SEABOSS — the label only repeats the name
  // already at the top of the contract, so it's dropped. It stays whenever there is more
  // than one brand to tell apart, since hiding one of them would leave two tables under
  // headings that read identically.
  const contractBrands = new Set(contract.productLines.map((p) => p.brand).filter(Boolean));
  const buyerOwnNames = [contract.buyerName, buyer?.companyName]
    .filter((n): n is string => Boolean(n))
    .map((n) => n.trim().toUpperCase());
  const brandEchoesBuyer =
    contractBrands.size === 1 &&
    buyerOwnNames.includes([...contractBrands][0].trim().toUpperCase());

  const grandQty = contract.productLines.reduce((s, p) => s + p.quantity, 0);
  const grandWeight = contract.productLines.reduce((s, p) => s + p.totalWeight, 0);
  const grandAmount = contract.productLines.reduce((s, p) => s + p.totalAmount, 0);
  const uniquePacking = Array.from(new Set(contract.productLines.map((p) => p.packing).filter(Boolean)));
  const currency = contract.currency || 'USD';
  const containerLabel = contract.containerQty && contract.containerType
    ? `${contract.containerQty} x ${contract.containerType.replace(/^(\d+)(?=[^\s\d])/, '$1 ')}.`
    : '—';

  const handleExportPdf = async () => {
    if (!pageRef.current) return;
    setExporting(true);
    try {
      // html-to-image hands the node to the browser inside an <svg><foreignObject>, so the
      // browser lays the text out itself. html2canvas estimated text widths instead, which
      // left every right-aligned figure a few pixels off its column, each row by a different
      // amount, and drew the collapsed table borders twice over.
      const node = pageRef.current;
      // The clone is laid out in a box as wide as the window, where the page's own
      // `margin: 0 auto` resolves to a real left margin and pushes it off the canvas.
      // Pinning the margin to 0 and fixing the size keeps the capture on the page itself.
      const canvas = await toCanvas(node, {
        pixelRatio: 2,
        backgroundColor: '#fff',
        cacheBust: true,
        width: node.offsetWidth,
        height: node.offsetHeight,
        style: { margin: '0', boxShadow: 'none' },
      });
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
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
          {contract.contractNo}
          {contract.docType === 'proforma_invoice' && (
            <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 600, color: 'var(--primary)', background: '#fff', padding: '2px 6px', borderRadius: '3px', verticalAlign: 'middle' }}>
              PROFORMA INVOICE
            </span>
          )}
        </span>
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
            <div style={{ fontSize: '18pt', fontWeight: 700, marginBottom: '10pt' }}>
              {contract.docType === 'proforma_invoice' ? 'Proforma Invoice' : 'Sales Contract'}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', fontWeight: 700, verticalAlign: 'top', width: '78pt' }}>Reference No.</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', fontWeight: 700 }} colSpan={3}>{baseContractNo(contract.contractNo)}</td>
                </tr>
                {/* P/O No. sits on the Date row, and Buyer on the Seller row. The whole
                    P/O line lives in the buyer's content column, so it starts where the
                    buyer's own details start rather than in the label column. */}
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', fontWeight: 700, verticalAlign: 'top' }}>Date :</td>
                  <td style={{ padding: '1.5pt 20pt 1.5pt 0', fontSize: '8.5pt' }}>{fmtDateLong(contract.offerDate)}</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', verticalAlign: 'top', width: '48pt' }} />
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', verticalAlign: 'top' }}>
                    {contract.buyerPoNo && <>P/O No. : {contract.buyerPoNo}</>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', fontWeight: 700, verticalAlign: 'top', width: '78pt' }}>Seller :</td>
                  <td style={{ padding: '1.5pt 20pt 1.5pt 0', fontSize: '8.5pt', lineHeight: 1.5, verticalAlign: 'top' }}>
                    {SELLER_LINES.map((l) => <React.Fragment key={l}>{l}<br /></React.Fragment>)}
                  </td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', fontWeight: 700, verticalAlign: 'top', width: '48pt' }}>Buyer :</td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', lineHeight: 1.5, verticalAlign: 'top' }}>
                    {buyerDisplay.name}<br />
                    {buyerAddressLines.map((l, i) => <React.Fragment key={`${l}-${i}`}>{l}<br /></React.Fragment>)}
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
            const brandLabel = group.brand && !brandEchoesBuyer ? ` "${group.brand}"` : '';
            // Size marks are counted per pound on an Lb line, so the Size header follows the
            // group's unit. Quantity(n.w) and the unit price are always kg, so theirs don't.
            const sizeUnit = groupSizeUnitLabel(group.lines.map((p) => p.sizeUnit));
            return (
              <div key={group.productType + group.brand + gi} style={{ marginBottom: '4pt' }}>
                <div style={{ fontWeight: 600, fontSize: '8.5pt', marginBottom: '2pt' }}>
                  {gi + 1}.&nbsp;&nbsp;{getProductFullName(group.productType, productNames)}{brandLabel}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    {GOODS_COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={cell({ textAlign: 'center', fontWeight: 700, borderBottom: 'none' })}>Size/{sizeUnit}</th>
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
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>{currency}/kg</th>
                      <th style={cell({ textAlign: 'center', fontWeight: 600, borderTop: 'none' })}>{currency}</th>
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
                // The gross weight is typed in by hand and rides on the end of the packing
                // line. The packing figure is only labelled as the net weight once a gross
                // weight sits beside it to tell it apart from.
                ['Packing', uniquePacking.length
                  ? `${contract.packingStyle ? contract.packingStyle + ' ' : ''}${uniquePacking.join(', ')}`
                    + (contract.grossWeight ? ` (Net Weight), ${contract.grossWeight} (Gross Weight)` : '')
                  : '—'],
                ['Total Quantity', `${containerLabel}   ( ${fmtNum(grandQty, 0)} Ctns Or ${fmtNum(grandWeight, 0)} Kgs)`],
                ['Total Amount', `${currency} ${fmtNum(grandAmount)}`],
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
