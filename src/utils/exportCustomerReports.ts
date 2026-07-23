import ExcelJS from 'exceljs';
import type { ProductLine, SaleContract } from '../types';
import { formatShipment } from './shipment';

// ─── Style tokens (lifted directly from Customer_Size_TEMPLATE.xlsx and
// Customer_Price_Quantity_TEMPLATE.xlsx — do not eyeball new colors here,
// re-check the templates' README/cell styles if these ever need to change) ──
const FONT = 'Arial';
const DARK_BLUE = 'FF1F4E78';
const WHITE = 'FFFFFFFF';
const FILL_TITLE = 'FF1F4E78';   // buyer name banner (Price & Quantity report)
const FILL_SECTION = 'FFD9E1F2'; // column headers / PRICE·QUANTITY label / product-type title
const FILL_CODE = 'FFFFF2CC';    // contract-code / metadata rows
const FILL_DATA = 'FFE2EFDA';    // actual quantity/price input cells
const BORDER_COLOR = 'FFB7B7B7';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleCell(cell: ExcelJS.Cell, opts: { fill?: string; bold?: boolean; color?: string; size?: number; border?: boolean }) {
  cell.font = { name: FONT, size: opts.size ?? 10, bold: opts.bold ?? false, color: opts.color ? { argb: opts.color } : undefined };
  if (opts.fill) cell.fill = solidFill(opts.fill);
  if (opts.border) cell.border = thinBorder;
}

function styleRow(ws: ExcelJS.Worksheet, row: number, fromCol: number, toCol: number, opts: { fill?: string; bold?: boolean; color?: string; size?: number; border?: boolean }) {
  for (let c = fromCol; c <= toCol; c++) styleCell(ws.getRow(row).getCell(c), opts);
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
}

function uniqueSheetName(base: string, used: Set<string>): string {
  let name = sanitizeSheetName(base) || 'Sheet';
  let i = 2;
  while (used.has(name)) {
    const suffix = ` (${i++})`;
    name = sanitizeSheetName(base).slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name);
  return name;
}

function sizeSortKey(size: string): number {
  const n = parseInt(size, 10);
  return Number.isNaN(n) ? 9999 : n;
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Report 1: Export by Size ────────────────────────────────────────────
// One sheet per size. Within a sheet, one block per customer: a header row
// (customer name + that customer's contract numbers, Total = literal "Total"),
// then one row per brand+packing combination actually sold (Total = a real
// =SUM formula over that row's own quantity cells). The Total column is
// aligned to the same position for every customer in the sheet.

export async function exportSizeReport(contracts: SaleContract[]) {
  const wb = new ExcelJS.Workbook();

  const bySize = new Map<string, Map<string, {
    label: string;
    rows: Map<string, { brand: string; packing: string; byContract: Map<string, number> }>;
  }>>();

  contracts.forEach((c) => {
    c.productLines.forEach((p) => {
      if (!bySize.has(p.size)) bySize.set(p.size, new Map());
      const buyers = bySize.get(p.size)!;
      const buyerKey = c.buyerId || c.buyerCode;
      if (!buyers.has(buyerKey)) buyers.set(buyerKey, { label: `${c.buyerCode} ${c.buyerName}`, rows: new Map() });
      const buyer = buyers.get(buyerKey)!;
      const rowKey = `${p.brand}||${p.packing}`;
      if (!buyer.rows.has(rowKey)) buyer.rows.set(rowKey, { brand: p.brand, packing: p.packing, byContract: new Map() });
      const row = buyer.rows.get(rowKey)!;
      row.byContract.set(c.contractNo, (row.byContract.get(c.contractNo) ?? 0) + p.quantity);
    });
  });

  const sortedSizes = Array.from(bySize.keys()).sort((a, b) => sizeSortKey(a) - sizeSortKey(b));
  const usedNames = new Set<string>();

  const CUSTOMER_COL = 1, BRAND_COL = 2, PACKING_COL = 3, QTY_START_COL = 4;

  sortedSizes.forEach((size) => {
    const ws = wb.addWorksheet(uniqueSheetName(size.replace(/\//g, '-'), usedNames));

    const buyers = Array.from(bySize.get(size)!.entries()).sort((a, b) => a[1].label.localeCompare(b[1].label));
    const buyerContractNos = buyers.map(([, buyer]) => Array.from(new Set(
      Array.from(buyer.rows.values()).flatMap((r) => Array.from(r.byContract.keys()))
    )).sort());
    const maxContracts = Math.max(0, ...buyerContractNos.map((a) => a.length));
    const totalCol = QTY_START_COL + maxContracts; // fixed for the whole sheet
    const lastCol = totalCol;

    ws.columns = [
      { width: 22 }, { width: 14 }, { width: 14 },
      ...Array.from({ length: maxContracts }, () => ({ width: 12 })),
      { width: 10 },
    ];

    // Row 1: title, full width, no fill/border.
    ws.getCell(1, 1).value = `Size ${size}`;
    ws.mergeCells(1, 1, 1, lastCol);
    styleCell(ws.getCell(1, 1), { size: 12, bold: true });

    // Row 2: column headers.
    ws.getCell(2, CUSTOMER_COL).value = 'Customer';
    ws.getCell(2, BRAND_COL).value = 'Brand';
    ws.getCell(2, PACKING_COL).value = 'Packing';
    ws.getCell(2, QTY_START_COL).value = 'Sales Contract / Qty';
    if (lastCol > QTY_START_COL) ws.mergeCells(2, QTY_START_COL, 2, lastCol);
    styleRow(ws, 2, CUSTOMER_COL, lastCol, { fill: FILL_SECTION, bold: true, border: true });

    let r = 3;
    buyers.forEach(([, buyer], bi) => {
      const contractNos = buyerContractNos[bi];
      const headerRow = r;

      ws.getCell(headerRow, CUSTOMER_COL).value = buyer.label;
      contractNos.forEach((no, i) => { ws.getCell(headerRow, QTY_START_COL + i).value = no; });
      ws.getCell(headerRow, totalCol).value = 'Total';
      styleRow(ws, headerRow, CUSTOMER_COL, lastCol, { fill: FILL_CODE, bold: true, color: DARK_BLUE, border: true });
      r++;

      const rows = Array.from(buyer.rows.values()).sort((a, b) => a.brand.localeCompare(b.brand) || a.packing.localeCompare(b.packing));
      rows.forEach((row) => {
        const rIdx = r;
        ws.getCell(rIdx, BRAND_COL).value = row.brand;
        ws.getCell(rIdx, PACKING_COL).value = row.packing;
        styleCell(ws.getCell(rIdx, CUSTOMER_COL), { fill: FILL_CODE, bold: true, color: DARK_BLUE, border: true });
        styleCell(ws.getCell(rIdx, BRAND_COL), { border: true });
        styleCell(ws.getCell(rIdx, PACKING_COL), { border: true });

        contractNos.forEach((no, i) => {
          const cell = ws.getCell(rIdx, QTY_START_COL + i);
          const qty = row.byContract.get(no);
          if (qty !== undefined) cell.value = qty;
          styleCell(cell, { fill: FILL_DATA, border: true });
        });
        // Pad any columns beyond this buyer's own contract count up to the shared Total column.
        for (let c = QTY_START_COL + contractNos.length; c < totalCol; c++) {
          styleCell(ws.getCell(rIdx, c), { fill: FILL_DATA, border: true });
        }

        if (contractNos.length > 0) {
          const startAddr = ws.getCell(rIdx, QTY_START_COL).address;
          const endAddr = ws.getCell(rIdx, QTY_START_COL + contractNos.length - 1).address;
          const total = Array.from(row.byContract.values()).reduce((s, v) => s + v, 0);
          const totalCell = ws.getCell(rIdx, totalCol);
          totalCell.value = { formula: `SUM(${startAddr}:${endAddr})`, result: total };
        }
        styleCell(ws.getCell(rIdx, totalCol), { border: true });
        r++;
      });

      if (rows.length > 0) ws.mergeCells(headerRow, CUSTOMER_COL, headerRow + rows.length, CUSTOMER_COL);
      r++; // blank separator row
    });
  });

  if (sortedSizes.length === 0) {
    wb.addWorksheet('Sheet1').getCell(1, 1).value = 'No data';
  }

  await downloadWorkbook(wb, `PITI_FOODS_Size_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Report 2: Export by Customer (Price & Quantity) ─────────────────────
// Two sheets per buyer (PRICE / QUANTITY), grouped by product type. Each
// section repeats CONTRACT NO./OFFER DATE/ETD/BRAND/PACKING/SIZE rows, one
// column per contract. Sections with more contracts than fit on one A4
// landscape page split into side-by-side blocks on the same rows, each with
// its own repeated label column.

const MAX_CONTRACTS_PER_BLOCK = 15;

interface Block { labelCol: number; contracts: { col: number; no: string }[] }

function layoutBlocks(contractNos: string[]): Block[] {
  const blocks: Block[] = [];
  let col = 1;
  for (let i = 0; i < contractNos.length; i += MAX_CONTRACTS_PER_BLOCK) {
    const chunk = contractNos.slice(i, i + MAX_CONTRACTS_PER_BLOCK);
    const labelCol = col;
    blocks.push({ labelCol, contracts: chunk.map((no, idx) => ({ col: labelCol + 1 + idx, no })) });
    col = labelCol + 1 + chunk.length + 1; // +1 blank separator column before the next block
  }
  return blocks;
}

function sectionWidth(blocks: Block[]): number {
  if (blocks.length === 0) return 1;
  const last = blocks[blocks.length - 1];
  return last.labelCol + last.contracts.length; // last used column (1-indexed, inclusive)
}

function writeBlockedRow(
  ws: ExcelJS.Worksheet, row: number, label: string, blocks: Block[],
  valueOf: (no: string) => string | number, style: { fill?: string; bold?: boolean; color?: string; border?: boolean }
) {
  blocks.forEach((b) => {
    const labelCell = ws.getCell(row, b.labelCol);
    labelCell.value = label;
    styleCell(labelCell, style);
    b.contracts.forEach(({ col, no }) => {
      const cell = ws.getCell(row, col);
      cell.value = valueOf(no);
      styleCell(cell, style);
    });
  });
}

interface BuyerGroup { label: string; contracts: SaleContract[] }

function writeProductTypeSection(
  ws: ExcelJS.Worksheet, startRow: number, productType: string,
  lines: { contract: SaleContract; line: ProductLine }[],
  aggregate: (matches: ProductLine[]) => number,
  width: number
): number {
  const contractNos = Array.from(new Set(lines.map((l) => l.contract.contractNo))).sort();
  const byContract = new Map(lines.map((l) => [l.contract.contractNo, l.contract]));
  const blocks = layoutBlocks(contractNos);
  const firstLineFor = (no: string) => lines.find((l) => l.contract.contractNo === no)?.line;

  let r = startRow;
  ws.getCell(r, 1).value = productType;
  ws.mergeCells(r, 1, r, width);
  styleCell(ws.getCell(r, 1), { fill: FILL_SECTION, bold: true, size: 11 });
  r++;

  writeBlockedRow(ws, r, 'CONTRACT NO.', blocks, (no) => no, { fill: FILL_CODE, bold: true, color: DARK_BLUE, border: true }); r++;
  writeBlockedRow(ws, r, 'OFFER DATE :', blocks, (no) => fmtDate(byContract.get(no)!.offerDate), { fill: FILL_CODE, bold: true, border: true }); r++;
  // Contracts no longer track a literal ETD date; the "ETD :" row (matching the template label) shows the shipment period instead.
  writeBlockedRow(ws, r, 'ETD :', blocks, (no) => {
    const c = byContract.get(no)!;
    return formatShipment(c.shipmentPeriod, c.shipmentMonth, c.shipmentYear);
  }, { fill: FILL_CODE, bold: true, border: true }); r++;
  writeBlockedRow(ws, r, 'BRAND', blocks, (no) => firstLineFor(no)?.brand ?? '', { fill: FILL_CODE, bold: true, border: true }); r++;
  writeBlockedRow(ws, r, 'PACKING', blocks, (no) => firstLineFor(no)?.packing ?? '', { fill: FILL_CODE, bold: true, border: true }); r++;
  writeBlockedRow(ws, r, 'SIZE/kg', blocks, () => '', { fill: FILL_CODE, bold: true, border: true }); r++;

  const sizes = Array.from(new Set(lines.map((l) => l.line.size))).sort((a, b) => sizeSortKey(a) - sizeSortKey(b));
  sizes.forEach((size) => {
    blocks.forEach((b) => {
      const labelCell = ws.getCell(r, b.labelCol);
      labelCell.value = size;
      styleCell(labelCell, { border: true });
      b.contracts.forEach(({ col, no }) => {
        const matches = lines.filter((l) => l.contract.contractNo === no && l.line.size === size).map((l) => l.line);
        const cell = ws.getCell(r, col);
        if (matches.length > 0) cell.value = aggregate(matches);
        styleCell(cell, { fill: FILL_DATA, border: true });
      });
    });
    r++;
  });

  return r + 1; // leave one blank separator row
}

export async function exportCustomerPriceQtyReport(contracts: SaleContract[]) {
  const wb = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  const buyers = new Map<string, BuyerGroup>();
  contracts.forEach((c) => {
    const key = c.buyerId || c.buyerCode;
    if (!buyers.has(key)) buyers.set(key, { label: `${c.buyerCode} ${c.buyerName}`, contracts: [] });
    buyers.get(key)!.contracts.push(c);
  });

  const sortedBuyers = Array.from(buyers.values()).sort((a, b) => a.label.localeCompare(b.label));
  const avgPrice = (matches: ProductLine[]) => matches.reduce((s, l) => s + l.unitPrice, 0) / matches.length;
  const sumQty = (matches: ProductLine[]) => matches.reduce((s, l) => s + l.quantity, 0);

  sortedBuyers.forEach((buyer) => {
    const linesByType = new Map<string, { contract: SaleContract; line: ProductLine }[]>();
    buyer.contracts.forEach((contract) => {
      contract.productLines.forEach((line) => {
        if (!linesByType.has(line.productType)) linesByType.set(line.productType, []);
        linesByType.get(line.productType)!.push({ contract, line });
      });
    });
    if (linesByType.size === 0) return;

    const productTypes = Array.from(linesByType.keys()).sort();
    const sectionWidths = productTypes.map((pt) => {
      const nos = Array.from(new Set(linesByType.get(pt)!.map((l) => l.contract.contractNo)));
      return sectionWidth(layoutBlocks(nos));
    });
    const buyerWidth = Math.max(1, ...sectionWidths);

    const buildSheet = (kind: 'PRICE' | 'QUANTITY', aggregate: (m: ProductLine[]) => number) => {
      const ws = wb.addWorksheet(uniqueSheetName(`${buyer.label} (${kind})`, usedNames));
      ws.columns = Array.from({ length: buyerWidth }, (_, i) => ({ width: i === 0 ? 16 : 13 }));

      ws.getCell(1, 1).value = buyer.label;
      ws.mergeCells(1, 1, 2, buyerWidth);
      styleRow(ws, 1, 1, buyerWidth, { fill: FILL_TITLE, bold: true, color: WHITE, size: 14 });
      styleRow(ws, 2, 1, buyerWidth, { fill: FILL_TITLE, bold: true, color: WHITE, size: 14 });

      ws.getCell(3, 1).value = kind;
      ws.mergeCells(3, 1, 3, buyerWidth);
      styleRow(ws, 3, 1, buyerWidth, { fill: FILL_SECTION, bold: true, size: 11 });

      let r = 4;
      productTypes.forEach((productType, i) => {
        r = writeProductTypeSection(ws, r, productType, linesByType.get(productType)!, aggregate, sectionWidths[i]);
      });
    };

    buildSheet('PRICE', avgPrice);
    buildSheet('QUANTITY', sumQty);
  });

  if (sortedBuyers.length === 0) {
    wb.addWorksheet('Sheet1').getCell(1, 1).value = 'No data';
  }

  await downloadWorkbook(wb, `PITI_FOODS_Customer_Price_Quantity_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
