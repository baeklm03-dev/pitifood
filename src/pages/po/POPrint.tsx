import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, ChevronLeft, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { poService } from '../../services/poService';
import { buyerService } from '../../services/buyerService';
import { contractService } from '../../services/contractService';
import type { ProductionOrder, POLine, Buyer } from '../../types';
import { formatDateTH } from '../../utils/thaiDate';
import { formatProductSpecLines, buildCombinedPackingBlock, buildCombinedSpecBlock, formatRequirementLines, type CombinedPackingBlock, type CombinedSpecBlock } from '../../utils/poRequirements';
import { getProductFullName } from '../../utils/productTypes';
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

// Product name as printed on the PO: full name plus the contract's Frozen Style, e.g.
// "Frozen Cooked Vannamei Shrimp Head On Shell On (Semi-IQF)". The quoted grade tag some product
// types carry on Sale Contracts (e.g. `" B Grade "`, `" White Cheek "`) is left off the PO.
function productName(productType: string, overrides?: Record<string, string>, frozenStyle?: string): string {
  const name = getProductFullName(productType, overrides).replace(/\s*"[^"]*"\s*$/, '');
  return frozenStyle ? `${name} (${frozenStyle})` : name;
}

interface LineSpanGroup { span: number; label: string; brand?: string; }

// For consecutive lines sharing the same product+brand, only the first line gets a
// visible entry (with the merged rowSpan); the label replaces the old row-number column.
function computeLineSpanGroups(lines: POLine[], overrides?: Record<string, string>, frozenStyle?: string): (LineSpanGroup | null)[] {
  const result: (LineSpanGroup | null)[] = new Array(lines.length).fill(null);
  let i = 0;
  while (i < lines.length) {
    let span = 1;
    while (i + span < lines.length && lines[i + span].productType === lines[i].productType && (lines[i + span].brand ?? '') === (lines[i].brand ?? '')) span++;
    result[i] = { span, label: productName(lines[i].productType, overrides, frozenStyle), brand: lines[i].brand || undefined };
    i += span;
  }
  return result;
}

interface ReqSectionEntry { label: string; lines: string[]; remark?: string; }

function collectSpecEntries(groups: LineGroup[], po: ProductionOrder, overrides?: Record<string, string>, frozenStyle?: string): ReqSectionEntry[] {
  return groups
    .map((g) => {
      const pr = po.productRequirements.find((p) => p.productType === g.productType && (p.brand ?? '') === (g.brand ?? ''));
      return {
        label: `${productName(g.productType, overrides, frozenStyle)}${g.brand ? ` "${g.brand}"` : ''}`,
        lines: pr ? formatProductSpecLines(pr.productSpec, '1') : [],
        remark: pr?.productSpecRemark,
      };
    })
    .filter((e) => e.lines.length > 0 || e.remark);
}

// With more than one brand, ข้อ 1 prints once without the per-brand name headings (order follows
// the product table); see buildCombinedSpecBlock.
function collectCombinedSpec(groups: LineGroup[], po: ProductionOrder): { block: CombinedSpecBlock; remarks: string[] } | null {
  const reqs = groups
    .map((g) => po.productRequirements.find((p) => p.productType === g.productType && (p.brand ?? '') === (g.brand ?? '')))
    .filter((pr): pr is NonNullable<typeof pr> => !!pr);
  if (reqs.length < 2) return null;
  const block = buildCombinedSpecBlock(reqs.map((pr) => pr.productSpec), '1');
  const remarks = Array.from(new Set(reqs.map((pr) => pr.productSpecRemark?.trim()).filter((r): r is string => !!r)));
  const hasContent = block.standardNo || block.colorNo || block.weightNo || block.extraLines.length > 0 || remarks.length > 0;
  return hasContent ? { block, remarks } : null;
}

function CombinedSpecSection({ data }: { data: { block: CombinedSpecBlock; remarks: string[] } }) {
  const { block, remarks } = data;
  const line: React.CSSProperties = { fontSize: '8pt', lineHeight: 1.5 };
  const numbered = (no: string | null, children: React.ReactNode) => no && (
    <div style={{ ...line, display: 'flex' }}>
      <span style={{ width: '18pt', flexShrink: 0 }}>{no}</span>
      <div>{children}</div>
    </div>
  );
  return (
    <div style={{ marginBottom: '6pt' }}>
      <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>1. รายละเอียดสินค้า (Product specification)</div>
      <div style={{ paddingLeft: '4pt' }}>
        {numbered(block.standardNo, block.standardLines.map((t, i) => <div key={i}>{t}</div>))}
        {numbered(block.colorNo, block.colorLine)}
        {numbered(block.weightNo, (
          <>
            <div>น้ำหนักและการเคลือบน้ำ:{block.weightHead ? ` ${block.weightHead}` : ''}</div>
            {block.weightLabels.length > 0 && (
              // Borderless table so each value sits under its underlined column label.
              <table style={{ borderCollapse: 'collapse', fontSize: '8pt', lineHeight: 1.5 }}>
                <thead>
                  <tr>
                    {block.weightLabels.map((l, i) => (
                      <th key={i} style={{ textAlign: 'left', fontWeight: 400, padding: '0 14pt 0 0' }}>
                        <span style={{ textDecoration: 'underline' }}>{l}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.weightRows.map((cells, r) => (
                    <tr key={r}>
                      {cells.map((c, i) => <td key={i} style={{ padding: '0 14pt 0 0' }}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ))}
        {block.extraLines.map((t, i) => <div key={i} style={line}>{t}</div>)}
        {remarks.map((r, i) => <RemarkLine key={i} text={r} />)}
      </div>
    </div>
  );
}

// Remark rendered right under the section content it belongs to, instead of a separate
// consolidated remarks block — keeps a remark visually attached to the item it's about.
function RemarkLine({ text }: { text?: string }) {
  if (!text) return null;
  return <div style={{ fontSize: '7.5pt', color: '#C0392B', fontStyle: 'italic', marginTop: '1pt' }}>หมายเหตุ: {text}</div>;
}

// One heading; flat text if only one product has content, otherwise a bullet per product
// (so identical or differing per-product details are always clearly attributed).
function RequirementSection({ sectionNo, title, entries }: { sectionNo: number; title: string; entries: ReqSectionEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div style={{ marginBottom: '6pt' }}>
      <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>{sectionNo}. {title}</div>
      {entries.length === 1 ? (
        <>
          <div style={{ fontSize: '8pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '4pt' }}>{entries[0].lines.join('\n')}</div>
          <div style={{ paddingLeft: '4pt' }}><RemarkLine text={entries[0].remark} /></div>
        </>
      ) : (
        entries.map((e, i) => (
          <div key={i} style={{ marginTop: '2pt', paddingLeft: '4pt' }}>
            <div style={{ fontSize: '8pt', fontWeight: 600 }}>• {e.label}</div>
            <div style={{ fontSize: '7.5pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '10pt' }}>{e.lines.join('\n')}</div>
            <div style={{ paddingLeft: '10pt' }}><RemarkLine text={e.remark} /></div>
          </div>
        ))
      )}
    </div>
  );
}

// ข้อ 2 is ONE section for the whole PO. Per-brand inner/outer box lines sit under a single
// 2.1 / 2.2 heading (indented), followed by the shared ฝาบน/ฝาล่าง, outer-box bullets, the
// one-line strap description (colours bold) and custom extras, then a single remark.
function collectPackingBlock(groups: LineGroup[], po: ProductionOrder): { block: CombinedPackingBlock; remark?: string } | null {
  const reqs = groups
    .map((g) => po.productRequirements.find((p) => p.productType === g.productType && (p.brand ?? '') === (g.brand ?? '')))
    .filter((pr): pr is NonNullable<typeof pr> => !!pr);
  if (reqs.length === 0) return null;
  const block = buildCombinedPackingBlock(
    reqs.map((pr) => ({
      detail: pr.packingDetail,
      ctx: { productForm: pr.productSpec.productForm, brand: pr.brand ?? '', netWeightGrams: pr.productSpec.netWeightGrams },
    })),
    '2',
  );
  const remark = reqs[0].packingDetailRemark;
  const hasContent = block.innerHeadline || block.outerHeadline || block.strap.strapped || block.tailLines.length > 0 || remark;
  return hasContent ? { block, remark } : null;
}

function PackingRequirementSection({ data }: { data: { block: CombinedPackingBlock; remark?: string } | null }) {
  if (!data) return null;
  const { block, remark } = data;
  const line: React.CSSProperties = { fontSize: '8pt', lineHeight: 1.5 };
  const bulletList = (lines: string[]) => lines.map((t, i) => (
    <div key={i} style={{ fontSize: '7.5pt', lineHeight: 1.5, paddingLeft: '10pt' }}>- {t}</div>
  ));
  const boxLines = (lines: string[]) => lines.map((t, i) => (
    <div key={i} style={{ ...line, paddingLeft: '10pt' }}>{t}</div>
  ));
  return (
    <div style={{ marginBottom: '6pt' }}>
      <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>2. รายละเอียดและข้อกำหนดบรรจุภัณฑ์</div>
      <div style={{ paddingLeft: '4pt' }}>
        {block.innerHeadline && <div style={line}>{block.innerHeadline}</div>}
        {boxLines(block.innerLines)}
        {block.topLidLines.length > 0 && (
          <div style={{ paddingLeft: '6pt' }}>
            <div style={{ fontSize: '7.5pt', fontWeight: 600, textDecoration: 'underline' }}>ฝาบน</div>
            {bulletList(block.topLidLines)}
          </div>
        )}
        {block.bottomLidLines.length > 0 && (
          <div style={{ paddingLeft: '6pt' }}>
            <div style={{ fontSize: '7.5pt', fontWeight: 600, textDecoration: 'underline' }}>ฝาล่าง</div>
            {bulletList(block.bottomLidLines)}
          </div>
        )}
        {block.outerHeadline && <div style={{ ...line, marginTop: '2pt' }}>{block.outerHeadline}</div>}
        {boxLines(block.outerLines)}
        {bulletList(block.outerItemLines)}
        <div style={line}>
          {block.strap.no} เชือกสายรัด
          {block.strap.strapped ? (
            <>
              {block.strap.parts.map((p, i) => (
                <React.Fragment key={i}> {p.label ? `${p.label} : ` : ''}<strong>สี{p.color}</strong></React.Fragment>
              ))}
              {block.strap.suffix}
            </>
          ) : ': ไม่รัด'}
        </div>
        {block.tailLines.map((t, i) => <div key={i} style={line}>{t}</div>)}
        <RemarkLine text={remark} />
      </div>
    </div>
  );
}

export function POPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [po, setPo] = useState<ProductionOrder | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [frozenStyle, setFrozenStyle] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) { navigate('/po'); return; }
    poService.getById(id).then((p) => {
      if (!p) { navigate('/po'); return; }
      setPo(p);
      // Frozen Style (e.g. Semi-IQF) lives on the referenced Sale Contract.
      const contractLoad = p.contractId
        ? contractService.getById(p.contractId).then((c) => setFrozenStyle(c?.packingStyle || undefined)).catch(() => undefined)
        : undefined;
      const buyerLoad = p.buyerId ? buyerService.getById(p.buyerId).then(setBuyer) : undefined;
      return Promise.all([contractLoad, buyerLoad]);
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <LoadingSpinner message="Loading production order..." />;
  if (!po) return null;

  const sumLines = (ls: POLine[]) => ls.reduce(
    (acc, l) => ({ ctn: acc.ctn + l.qtyCtn, kg: acc.kg + l.qtyKg, stock: acc.stock + l.inStock, add: acc.add + l.produceAdd }),
    { ctn: 0, kg: 0, stock: 0, add: 0 }
  );
  const totals = sumLines(po.lines);

  const overrides = buyer?.productTypeNameOverrides;
  const groups = groupLines(po.lines);
  const spanGroups = computeLineSpanGroups(po.lines, overrides, frozenStyle);
  const multiBlock = spanGroups.filter(Boolean).length > 1;
  const specEntries = collectSpecEntries(groups, po, overrides, frozenStyle);
  const combinedSpec = collectCombinedSpec(groups, po);
  const packingData = collectPackingBlock(groups, po);
  const loadingLines = formatRequirementLines(po.loadingRequirement, '3');
  const documentLines = formatRequirementLines(po.documentRequirement, '4');

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
                <th style={cell({ textAlign: 'center', fontWeight: 700 })}>size mark</th>
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
                // Each brand block (consecutive lines of one product+brand) ends with its own Total row —
                // skipped when the PO has only one block, where it would just repeat the grand total.
                const blockStart = spanGroups.slice(0, idx + 1).map((g, i) => (g ? i : -1)).filter((i) => i >= 0).pop() as number;
                const blockSpan = spanGroups[blockStart]!.span;
                const isBlockEnd = idx === blockStart + blockSpan - 1;
                const blockTotals = isBlockEnd && multiBlock ? sumLines(po.lines.slice(blockStart, idx + 1)) : null;
                return (
                  <React.Fragment key={l.id}>
                    <tr>
                      {span && (
                        <td rowSpan={span.span} style={cell({ fontWeight: 600, verticalAlign: 'middle' })}>
                          <div>{span.label}</div>
                          {span.brand && <div style={{ textAlign: 'center', marginTop: '2pt' }}>"{span.brand}"</div>}
                        </td>
                      )}
                      <td style={cell()}>{l.packing || '—'}</td>
                      <td style={cell({ textAlign: 'center' })}>{l.mark || '—'}</td>
                      <td style={cell({ textAlign: 'center' })}>{l.sizeRm || '—'}</td>
                      <td style={cell({ textAlign: 'right' })}>{fmtNum(l.qtyCtn, 0)}</td>
                      <td style={cell({ textAlign: 'right' })}>{fmtNum(l.qtyKg)}</td>
                      <td style={cell({ textAlign: 'right' })}>{fmtNum(l.inStock)}</td>
                      <td style={cell({ textAlign: 'right' })}>{fmtNum(l.produceAdd)}</td>
                    </tr>
                    {blockTotals && (
                      <tr style={{ fontWeight: 700, background: '#F2F2F2' }}>
                        <td style={cell({ textAlign: 'right' })} colSpan={4}>Total</td>
                        <td style={cell({ textAlign: 'right' })}>{fmtNum(blockTotals.ctn, 0)}</td>
                        <td style={cell({ textAlign: 'right' })}>{fmtNum(blockTotals.kg)}</td>
                        <td style={cell({ textAlign: 'right' })}>{blockTotals.stock > 0 ? fmtNum(blockTotals.stock) : '0.00'}</td>
                        <td style={cell({ textAlign: 'right' })}>{fmtNum(blockTotals.add)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td style={cell({ textAlign: 'right' })} colSpan={4}>{multiBlock ? 'Grand Total' : 'Total'}</td>
                <td style={cell({ textAlign: 'right' })}>{fmtNum(totals.ctn, 0)}</td>
                <td style={cell({ textAlign: 'right' })}>{fmtNum(totals.kg)}</td>
                <td style={cell({ textAlign: 'right' })}>{totals.stock > 0 ? fmtNum(totals.stock) : '0.00'}</td>
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

          {/* Requirements — flat text for one product, bulleted per product when there's more than one.
              Each section's remark renders directly under that section instead of a consolidated block. */}
          <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '3pt' }}>ข้อกำหนดอื่นๆ</div>
          {groups.length > 1
            ? (combinedSpec && <CombinedSpecSection data={combinedSpec} />)
            : <RequirementSection sectionNo={1} title="รายละเอียดสินค้า (Product specification)" entries={specEntries} />}
          <PackingRequirementSection data={packingData} />

          {loadingLines.length > 0 && (
            <div style={{ marginBottom: '6pt' }}>
              <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>3. ข้อกำหนดการโหลด (Loading requirement)</div>
              <div style={{ fontSize: '8pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '4pt' }}>{loadingLines.join('\n')}</div>
              <div style={{ paddingLeft: '4pt' }}><RemarkLine text={po.loadingRequirementRemark} /></div>
            </div>
          )}
          {documentLines.length > 0 && (
            <div style={{ marginBottom: '6pt' }}>
              <div style={{ fontWeight: 600, fontSize: '8.5pt' }}>4. การจัดเตรียมเอกสารและภาพถ่าย</div>
              <div style={{ fontSize: '8pt', lineHeight: 1.5, whiteSpace: 'pre-line', paddingLeft: '4pt' }}>{documentLines.join('\n')}</div>
              <div style={{ paddingLeft: '4pt' }}><RemarkLine text={po.documentRequirementRemark} /></div>
            </div>
          )}

          {/* Signatures — one line: preparer flush left, approver flush right (blank to sign) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '60pt', marginTop: '16pt', marginBottom: '10pt', fontSize: '8.5pt' }}>
            <div>ผู้จัดทำ &nbsp;{po.preparedBy || ' '}</div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span>ผู้อนุมัติ</span>
              <span style={{ display: 'inline-block', minWidth: '120pt', borderBottom: '0.5pt dotted #000', marginLeft: '6pt' }}>&nbsp;</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '10pt', fontSize: '7pt', color: '#333', textAlign: 'center', borderTop: '0.5pt solid #999', paddingTop: '5pt' }}>
            {FOOTER_LINE1}<br />{FOOTER_LINE2}
          </div>
        </div>
      </div>
    </div>
  );
}
