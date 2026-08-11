import * as XLSX from 'xlsx';
import type { SaleContract } from '../types';
import { formatShipment } from './shipment';

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

function autoWidth(data: Record<string, unknown>[]): { wch: number }[] {
  if (data.length === 0) return [];
  const headers = Object.keys(data[0]);
  return headers.map((h) => {
    const maxVal = Math.max(
      h.length,
      ...data.map((row) => String(row[h] ?? '').length)
    );
    return { wch: Math.min(maxVal + 2, 40) };
  });
}

export function exportToExcel(contracts: SaleContract[]) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Contract Summary ─────────────────────────────────────────────
  const sheet1Data = contracts.map((c) => {
    const totalQty = c.productLines.reduce((s, p) => s + p.quantity, 0);
    const totalNetWt = +c.productLines.reduce((s, p) => s + p.totalWeight, 0).toFixed(3);
    const totalAmt = +c.productLines.reduce((s, p) => s + p.totalAmount, 0).toFixed(2);
    return {
      'Contract No.': c.contractNo,
      'Buyer Code': c.buyerCode,
      'Buyer Name': c.buyerName,
      'Sub-company': c.subCompanyName ?? '',
      'Offer Date': fmtDate(c.offerDate),
      'Shipment': formatShipment(c.shipmentPeriod, c.shipmentMonth, c.shipmentYear),
      'Port of Loading': c.portOfLoading ?? '',
      'Port of Discharge': c.portOfDischarge ?? '',
      'Incoterm': c.incoterm ?? '',
      'Payment Terms': c.paymentTerms,
      'Status': c.status.charAt(0).toUpperCase() + c.status.slice(1),
      'Total Qty (Ctns)': totalQty,
      'Total Net Wt (kg)': totalNetWt,
      'Total Amount (USD)': totalAmt,
      'Signed File': c.signedFileName ?? '',
      'Signed Date': fmtDate(c.signedAt),
      'Created By': c.createdByName ?? '',
      'Updated By': c.updatedByName ?? '',
    };
  });
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  ws1['!cols'] = autoWidth(sheet1Data as unknown as Record<string, unknown>[]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Contract Summary');

  // ── Sheet 2: Product Details ──────────────────────────────────────────────
  const sheet2Data = contracts.flatMap((c) =>
    c.productLines.map((p) => ({
      'Contract No.': c.contractNo,
      'Buyer': c.buyerName,
      'Product Type': p.productType,
      'Size': p.size,
      'Size Unit': p.sizeUnit,
      'Brand': p.brand,
      'Packing': p.packing,
      'Qty (Ctns)': p.quantity,
      'Net Wt/Ctn (kg)': p.netWeightPerCarton,
      'Total Net Wt (kg)': +p.totalWeight.toFixed(3),
      'Unit Price (USD)': p.unitPrice,
      'Amount (USD)': +p.totalAmount.toFixed(2),
    }))
  );
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  ws2['!cols'] = autoWidth(sheet2Data as unknown as Record<string, unknown>[]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Product Details');

  // ── Sheet 3: Size Summary ─────────────────────────────────────────────────
  const sizeMap: Record<string, { size: string; sizeUnit: string; qty: number; netWt: number }> = {};
  contracts.forEach((c) =>
    c.productLines.forEach((p) => {
      const key = `${p.size}||${p.sizeUnit}`;
      if (!sizeMap[key]) sizeMap[key] = { size: p.size, sizeUnit: p.sizeUnit, qty: 0, netWt: 0 };
      sizeMap[key].qty += p.quantity;
      sizeMap[key].netWt += p.totalWeight;
    })
  );
  const sheet3Data = Object.values(sizeMap)
    .sort((a, b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0))
    .map((s) => ({
      'Size': s.size,
      'Size Unit': s.sizeUnit,
      'Total Qty (Ctns)': s.qty,
      'Total Net Wt (kg)': +s.netWt.toFixed(3),
    }));
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  ws3['!cols'] = autoWidth(sheet3Data as unknown as Record<string, unknown>[]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Size Summary');

  const filename = `PITI_FOODS_Contracts_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
