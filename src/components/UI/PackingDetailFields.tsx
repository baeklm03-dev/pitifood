import React from 'react';
import type { PackingDetail, ProductSpecDetail } from '../../types';
import { Input } from './Input';
import { BoxCodeInput } from './BoxCodeInput';
import { RequirementChecklist } from './RequirementChecklist';
import { composeInnerBoxLine, composeOuterBoxLine, type BoxLineContext } from '../../utils/poRequirements';

interface Props {
  value: PackingDetail;
  onChange: (next: PackingDetail) => void;
  /** Unique per rendered instance — this form can appear multiple times on one page (one per product group). */
  fieldId: string;
  buyerCode: string;
  brand: string;
  productForm: ProductSpecDetail['productForm'];
  netWeightGrams: string;
}

const mmInput: React.CSSProperties = { width: '70px' };

export function PackingDetailFields({ value, onChange, fieldId, buyerCode, brand, productForm, netWeightGrams }: Props) {
  const set = <K extends keyof PackingDetail>(key: K, v: PackingDetail[K]) =>
    onChange({ ...value, [key]: v });

  const groupLabel: React.CSSProperties = { fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '8px' };
  const subLabel: React.CSSProperties = { fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px', textDecoration: 'underline' };
  const block: React.CSSProperties = { paddingTop: '12px', borderTop: '1px dashed var(--border)' };
  const radioLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px' };
  const sizeRow: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' };
  const previewStyle: React.CSSProperties = { fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' };

  const ctx: BoxLineContext = { productForm, brand, netWeightGrams };
  const outerPlaceholder = 'เช่น ลูกฟูกขาว';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div>
        <label style={groupLabel}>กล่องอินเนอร์</label>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
          ชื่อสินค้าดึงจาก "มาตรฐาน" ในข้อ 1 โดยอัตโนมัติ — กรอกแค่ขนาดและรหัสกล่อง
        </p>
        <div style={sizeRow}>
          <Input type="number" value={value.innerBoxWidthMm} onChange={(e) => set('innerBoxWidthMm', e.target.value)} placeholder="กว้าง" style={mmInput} />
          <span style={{ color: 'var(--text-muted)' }}>x</span>
          <Input type="number" value={value.innerBoxLengthMm} onChange={(e) => set('innerBoxLengthMm', e.target.value)} placeholder="ยาว" style={mmInput} />
          <span style={{ color: 'var(--text-muted)' }}>x</span>
          <Input type="number" value={value.innerBoxHeightMm} onChange={(e) => set('innerBoxHeightMm', e.target.value)} placeholder="สูง" style={mmInput} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>mm</span>
        </div>
        <div style={{ marginTop: '8px' }}>
          <BoxCodeInput label="รหัสกล่องอินเนอร์" prefix="I" buyerCode={buyerCode} value={value.innerBoxCode} onChange={(v) => set('innerBoxCode', v)} />
        </div>
        <p style={previewStyle}>2.1 {composeInnerBoxLine(value, ctx)}</p>
      </div>

      <div style={block}>
        <label style={subLabel}>ฝาบน</label>
        <RequirementChecklist items={value.topLidItems} onChange={(v) => set('topLidItems', v)} />
      </div>

      <div style={block}>
        <label style={subLabel}>ฝาล่าง</label>
        <RequirementChecklist items={value.bottomLidItems} onChange={(v) => set('bottomLidItems', v)} />
      </div>

      <div style={block}>
        <label style={groupLabel}>กล่องนอก</label>
        <Input value={value.outerBoxDesc} onChange={(e) => set('outerBoxDesc', e.target.value)} placeholder={outerPlaceholder} />
        <div style={{ ...sizeRow, marginTop: '8px' }}>
          <Input type="number" value={value.outerBoxWidthMm} onChange={(e) => set('outerBoxWidthMm', e.target.value)} placeholder="กว้าง" style={mmInput} />
          <span style={{ color: 'var(--text-muted)' }}>x</span>
          <Input type="number" value={value.outerBoxLengthMm} onChange={(e) => set('outerBoxLengthMm', e.target.value)} placeholder="ยาว" style={mmInput} />
          <span style={{ color: 'var(--text-muted)' }}>x</span>
          <Input type="number" value={value.outerBoxHeightMm} onChange={(e) => set('outerBoxHeightMm', e.target.value)} placeholder="สูง" style={mmInput} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>mm</span>
        </div>
        <div style={{ marginTop: '8px' }}>
          <BoxCodeInput label="รหัสกล่องนอก" prefix="M" buyerCode={buyerCode} value={value.outerBoxCode} onChange={(v) => set('outerBoxCode', v)} />
        </div>
        <p style={previewStyle}>2.2 {composeOuterBoxLine(value, ctx)}</p>
        <div style={{ marginTop: '10px' }}>
          <RequirementChecklist items={value.outerBoxItems} onChange={(v) => set('outerBoxItems', v)} />
        </div>
      </div>

      <div style={block}>
        <label style={groupLabel}>เชือกสายรัด</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={radioLabel}>
            <input type="radio" name={`${fieldId}-strapped`} checked={value.strapped} onChange={() => set('strapped', true)} style={{ accentColor: 'var(--primary)' }} />
            รัด
          </label>
          <label style={radioLabel}>
            <input type="radio" name={`${fieldId}-strapped`} checked={!value.strapped} onChange={() => set('strapped', false)} style={{ accentColor: 'var(--primary)' }} />
            ไม่รัด
          </label>
          {value.strapped && (
            <>
              <Input value={value.strappingColor} onChange={(e) => set('strappingColor', e.target.value)} placeholder="สีสายรัด" style={{ maxWidth: '160px' }} />
              <Input type="number" value={value.strappingCount} onChange={(e) => set('strappingCount', e.target.value)} placeholder="จำนวนเส้น" style={{ maxWidth: '110px' }} />
              <Input value={value.strappingStyle} onChange={(e) => set('strappingStyle', e.target.value)} placeholder="ลักษณะการรัด" style={{ maxWidth: '160px' }} />
            </>
          )}
        </div>
      </div>

      <div style={block}>
        <label style={groupLabel}>ข้อกำหนดเพิ่มเติม (custom) — เช่น แผ่นรองพลาสติก, ตาราง barcode</label>
        <RequirementChecklist items={value.extraItems ?? []} onChange={(v) => set('extraItems', v)} />
      </div>
    </div>
  );
}
