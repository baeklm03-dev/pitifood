import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, ChevronLeft, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { poService } from '../../services/poService';
import type { ProductionOrder, POLine } from '../../types';
import { formatDateTH } from '../../utils/thaiDate';
import { formatProductSpecLines, formatPackingDetailLines, formatLoadingRequirementLines, formatDocumentRequirementLines } from '../../utils/poRequirements';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { useResponsive } from '../../hooks/useMediaQuery';

const fmtNum = (n: number, decimals = 2) =>
  n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

const FOOTER_LINE1 = 'PITI FOODS CO.,LTD.  33/3 MOO 5  WAT KHANUN, SINGHANAKHON, SONGKHLA 90330, THAILAND';
const FOOTER_LINE2 = 'TEL : 66 74 536213 - 4   FAX : 66 74 536294   E-mail:info@pitifoods.com   website : www.pitifoods.com';

const COL_WIDTHS = ['22%', '14%', '9%', '9%', '11.5%', '11.5%', '11.5%', '11.5%'];

interface LineGroup {
  key: string;
  productType: string;
  brand?: string;
}

// Distinct product+brand pairs, in first-seen order (used to pull each product's ข้อ 1-2).
function groupLines(lines: POLine[]): LineGroup[] {
  const seen = new Set<string>();
  const out: LineGroup[] = [];
  lines.forEach((l) => {
    const key = `${l.productType}|${l.brand ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, productType: l.productType, brand: l.brand });
  });
  return out;
}

interface LineSpanGroup { span: number; label: string; }

// For consecutive lines sharing the same product+brand, only the first line gets a
// visible entry (with the merged rowSpan); the label replaces the old row-number column.
function computeLineSpanGroups(lines: POLine[]): (LineSpanGroup | null)[] {
  const result: (LineSpanGroup | null)[] = new Array(lines.length).fill(null);
  let i = 0;
  while (i < lines.length) {
    let span = 1;
    while (i + span < lines.length && lines[i + span].productType === lines[i].productType && (lines[i + span].brand ?? '') === (lines[i].brand ?? '')) span++;
    const label = `${lines[i].productType}${lines[i].brand ? ` "${lines[i].brand}"` : ''}`;
    result[i] = { span, label };
    i += span;
  }
  return result;
}

interface ReqSectionEntry { label: string; lines: string[]; }

function collectSpecEntries(groups: LineGroup[], po: ProductionOrder): ReqSectionEntry[] {
  return groups
    .map((g) => {
      const pr = po.productRequirements.find((p) => p.productType === g.productType && (p.brand ?? '') === (g.brand ?? ''));
      return { label: `${g.productType}${g.brand ? ` "${g.brand}"` : ''}`, lines: pr ? formatProductSpecLines(pr.productSpec) : [] };
    })
    .filter((e) => e.lines.length > 0);
}

function collectPackingEntries(groups: LineGroup[], po: ProductionOrder): ReqSectionEntry[] {
  return groups
    .map((g) => {
      const pr = po.productRequirements.find((p) => p.productType === g.productType && (p.brand ?? '') === (g.brand ?? ''));
      return { label: `${g.productType}${g.brand ? ` "${g.brand}"` : ''}`, lines: pr ? formatPackingDetailLines(pr.packingDetail) : [] };
    })
    .filter((e) => e.lines.length > 0);
}

// One heading; flat text if only one product has content, otherwise a bullet per product
// (so identical or differing per-product details are always clearly attributed).
function RequirementSection({ sectionNo, title, entries }: { sectionNo: number; title: string; entries: ReqSectionEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div style={{ marginBottom: '6pt' }}>
      <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>{sectionNo}. {title}</div>
      {entries.length === 1 ? (
        <div style={{ fontSize: '8pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '4pt' }}>{entries[0].lines.join('\n')}</div>
      ) : (
        entries.map((e, i) => (
          <div key={i} style={{ marginTop: '2pt', paddingLeft: '4pt' }}>
            <div style={{ fontSize: '8pt', fontWeight: 600 }}>• {e.label}</div>
            <div style={{ fontSize: '7.5pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '10pt' }}>{e.lines.join('\n')}</div>
          </div>
        ))
      )}
    </div>
  );
}

interface RemarkEntry { label: string; text: string; }

export function POPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [po, setPo] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) { navigate('/po'); return; }
    poService.getById(id).then((p) => {
      if (!p) { navigate('/po'); return; }
      setPo(p);
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <LoadingSpinner message="Loading production order..." />;
  if (!po) return null;

  const totals = po.lines.reduce(
    (acc, l) => ({ ctn: acc.ctn + l.qtyCtn, kg: acc.kg + l.qtyKg, stock: acc.stock + l.inStock, add: acc.add + l.produceAdd }),
    { ctn: 0, kg: 0, stock: 0, add: 0 }
  );

  const groups = groupLines(po.lines);
  const spanGroups = computeLineSpanGroups(po.lines);
  const specEntries = collectSpecEntries(groups, po);
  const packingEntries = collectPackingEntries(groups, po);
  const loadingLines = formatLoadingRequirementLines(po.loadingRequirement);
  const documentLines = formatDocumentRequirementLines(po.documentRequirement);

  const remarks: RemarkEntry[] = [];
  po.productRequirements.forEach((pr) => {
    const label = `${pr.productType}${pr.brand ? ` "${pr.brand}"` : ''}`;
    if (pr.productSpecRemark) remarks.push({ label: `${label} — รายละเอียดสินค้า`, text: pr.productSpecRemark });
    if (pr.packingDetailRemark) remarks.push({ label: `${label} — บรรจุภัณฑ์`, text: pr.packingDetailRemark });
  });
  if (po.loadingRequirementRemark) remarks.push({ label: 'ข้อกำหนดการโหลด', text: po.loadingRequirementRemark });
  if (po.documentRequirementRemark) remarks.push({ label: 'เอกสารและภาพถ่าย', text: po.documentRequirementRemark });

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
      pdf.save(`${po.poNo}.pdf`);
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
      <button onClick={() => navigate('/po')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
        <ChevronLeft size={20} />
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{po.poNo}</span>
        {(po.createdByName || po.updatedByName) && (
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
            {po.createdByName && `Created by ${po.createdByName}`}
            {po.updatedByName && po.updatedByName !== po.createdByName && ` · Updated by ${po.updatedByName}`}
          </span>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => navigate(`/po/${id}/edit`)} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
        <Edit2 size={13} /> Edit
      </Button>
      <Button size="sm" loading={exporting} onClick={handleExportPdf} style={{ background: 'var(--accent)', border: 'none' }}>
        <FileDown size={14} /> Export PDF
      </Button>
    </div>
  );

  const border = '0.5pt solid #333';
  const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border, padding: '2pt 5pt', fontSize: '7.5pt', verticalAlign: 'middle', ...extra,
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
            padding: '30px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', Arial, sans-serif", fontSize: '8.5pt', color: '#000',
          }}
        >
          {/* Header — Attn first, no logo */}
          <div style={{ marginBottom: '10pt' }}>
            {po.attn && (
              <div style={{ fontSize: '8.5pt', fontWeight: 600, marginBottom: '6pt' }}>Attn : {po.attn}</div>
            )}

            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '15pt', fontWeight: 700, verticalAlign: 'middle' }}>
                    Production Order (ใบสั่งผลิต)
                  </td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    วันที่ <strong>{formatDateTH(po.poDate)}</strong>
                  </td>
                  <td style={{ padding: '1.5pt 0 1.5pt 12pt', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '8.5pt' }}>เลขที่ </span>
                    <span style={{ border: '1pt solid #B03A2E', borderRadius: '3pt', padding: '2pt 8pt', color: '#B03A2E', fontWeight: 700, fontSize: '9pt', display: 'inline-block' }}>{po.poNo}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '6pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', width: '38%' }}>
                    <strong>ลูกค้า :</strong> {po.buyerName || '—'}
                  </td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', width: '32%' }}>
                    <strong>ปลายทาง :</strong> {po.destination || '—'}
                  </td>
                  <td style={{ padding: '1.5pt 0', fontSize: '8.5pt', textAlign: 'right', color: '#B03A2E' }}>
                    <strong>Ref. Contract. NO :</strong> {po.contractNo}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Product table — one continuous table; Product "Brand" (merged) replaces the row-number column */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '8pt' }}>
            <colgroup>
              {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>รายการสินค้า</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>Packing size</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>mark</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>size r/m</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>จำนวน (กล่อง)</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>จำนวน (ก.ก.)</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>สินค้าในสต็อก</th>
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>ผลิตเพิ่ม</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l, idx) => {
                const span = spanGroups[idx];
                return (
                  <tr key={l.id}>
                    {span && (
                      <td rowSpan={span.span} style={cell({ fontWeight: 600, verticalAlign: 'middle' })}>{span.label}</td>
                    )}
                    <td style={cell()}>{l.packing || '—'}</td>
                    <td style={cell({ textAlign: 'center' })}>{l.mark || '—'}</td>
                    <td style={cell({ textAlign: 'center' })}>{l.sizeRm || '—'}</td>
                    <td style={cell({ textAlign: 'right' })}>{fmtNum(l.qtyCtn, 0)}</td>
                    <td style={cell({ textAlign: 'right' })}>{fmtNum(l.qtyKg)}</td>
                    <td style={cell({ textAlign: 'right' })}>{fmtNum(l.inStock)}</td>
                    <td style={cell({ textAlign: 'right' })}>{fmtNum(l.produceAdd)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td style={cell()} colSpan={4}>Total</td>
                <td style={cell({ textAlign: 'right' })}>{fmtNum(totals.ctn, 0)}</td>
                <td style={cell({ textAlign: 'right' })}>{fmtNum(totals.kg)}</td>
                <td style={cell({ textAlign: 'right' })}>{fmtNum(totals.stock)}</td>
                <td style={cell({ textAlign: 'right' })}>{fmtNum(totals.add)}</td>
              </tr>
            </tbody>
          </table>

          {/* Delivery */}
          {po.deliveryNote && (
            <div style={{ fontSize: '8.5pt', marginBottom: '8pt' }}>
              <strong>กำหนดส่งมอบ :</strong> {po.deliveryNote}
            </div>
          )}

          {/* Requirements — flat text for one product, bulleted per product when there's more than one */}
          <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '3pt' }}>ข้อกำหนดอื่นๆ</div>
          <RequirementSection sectionNo={1} title="รายละเอียดสินค้า (Product specification)" entries={specEntries} />
          <RequirementSection sectionNo={2} title="รายละเอียดและข้อกำหนดบรรจุภัณฑ์" entries={packingEntries} />

          {loadingLines.length > 0 && (
            <div style={{ marginBottom: '6pt' }}>
              <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>3. ข้อกำหนดการโหลด (Loading requirement)</div>
              <div style={{ fontSize: '8pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '4pt' }}>{loadingLines.join('\n')}</div>
            </div>
          )}
          <div style={{ marginBottom: '6pt' }}>
            <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>4. การจัดเตรียมเอกสารและภาพถ่าย</div>
            <div style={{ fontSize: '8pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '4pt' }}>{documentLines.join('\n')}</div>
          </div>

          {/* Signatures — left shows the preparer's name (no signing needed), right is a blank signature space */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16pt', marginBottom: '10pt' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontSize: '9pt', fontWeight: 600, minHeight: '18pt', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>{po.preparedBy || ' '}</div>
              <div style={{ borderTop: '0.5pt solid #000', marginTop: '3pt', paddingTop: '3pt', fontSize: '8.5pt' }}>ผู้จัดทำ</div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderBottom: '0.5pt dotted #000', minHeight: '20pt' }} />
              <div style={{ fontSize: '8.5pt', marginTop: '3pt' }}>ผู้อนุมัติ</div>
            </div>
          </div>

          {/* Remark — consolidated below the signature area */}
          {remarks.length > 0 && (
            <div style={{ marginBottom: '10pt' }}>
              <div style={{ fontWeight: 700, fontSize: '8.5pt', marginBottom: '2pt' }}>Remark</div>
              {remarks.map((r, i) => (
                <div key={i} style={{ fontSize: '7.5pt', color: '#C0392B', lineHeight: 1.5 }}>- [{r.label}] {r.text}</div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '10pt', fontSize: '7pt', color: '#333', textAlign: 'center', borderTop: '0.5pt solid #999', paddingTop: '5pt' }}>
            {FOOTER_LINE1}<br />{FOOTER_LINE2}
          </div>
        </div>
      </div>
    </div>
  );
}
