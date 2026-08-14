import type { SaleContract } from '../types';

export function generateContractNo(buyerCode: string, existingContracts: SaleContract[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `${buyerCode}-${year}`;
  const sameBuyerSameYear = existingContracts.filter(
    (c) => c.buyerCode === buyerCode && c.contractNo.startsWith(prefix) && c.revision === 0
  );
  // Continues from the highest existing sequence number rather than a plain count, so
  // imported legacy contracts (which may have gaps — voided/missing numbers) don't cause
  // a newly generated number to collide with one that was already used on paper.
  const maxSeq = sameBuyerSameYear.reduce((max, c) => {
    const seq = parseInt(c.contractNo.slice(prefix.length), 10);
    return Number.isFinite(seq) ? Math.max(max, seq) : max;
  }, 0);
  const next = (maxSeq + 1).toString().padStart(2, '0');
  return `${prefix}${next}`;
}

export function generateRevisionContractNo(
  parentContract: SaleContract,
  existingContracts: SaleContract[]
): string {
  const baseNo = parentContract.contractNo.split(' rev.')[0];
  // Count only prior rewrites (not the base contract itself), so the first rewrite is rev.1.
  const priorRevisions = existingContracts.filter((c) => c.contractNo.startsWith(`${baseNo} rev.`));
  return `${baseNo} rev.${priorRevisions.length + 1}`;
}
