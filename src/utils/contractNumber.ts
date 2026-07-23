import type { SaleContract } from '../types';

export function generateContractNo(buyerCode: string, existingContracts: SaleContract[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const sameBuyerSameYear = existingContracts.filter(
    (c) =>
      c.buyerCode === buyerCode &&
      c.contractNo.startsWith(`${buyerCode}-${year}`) &&
      c.revision === 0
  );
  const next = (sameBuyerSameYear.length + 1).toString().padStart(2, '0');
  return `${buyerCode}-${year}${next}`;
}

export function generateRevisionContractNo(
  parentContract: SaleContract,
  existingContracts: SaleContract[]
): string {
  const baseNo = parentContract.contractNo.split(' rev.')[0];
  const related = existingContracts.filter(
    (c) => c.contractNo === baseNo || c.contractNo.startsWith(`${baseNo} rev.`)
  );
  return `${baseNo} rev.${related.length + 1}`;
}
