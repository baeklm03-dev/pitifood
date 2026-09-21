import React, { useState } from 'react';
import type { ProductSpecDetail } from '../../types';
import { Input, Select } from './Input';
import { RequirementChecklist } from './RequirementChecklist';
import { productFormLabel } from '../../utils/poRequirements';

interface Props {
  value: ProductSpecDetail;
  onChange: (next: ProductSpecDetail) => void;
}

const OTHER = '__other__';
// 22, 22.5, 23, ... 30 — colour sizes come in half steps too (e.g. 23.5+)
const COLOR_SIZE_OPTIONS = Array.from({ length: 17 }, (_, i) => String(22 + i * 0.5));
const PRODUCT_FORM_OPTIONS = [
  { value: 'cooked', label: 'กุ้งต้ม' },
  { value: 'raw', label: 'กุ้งดิบ' },
];

export function ProductSpecFields({ value, onChange }: Props) {
  const set = <K extends keyof ProductSpecDetail>(key: K, v: ProductSpecDetail[K]) =>
    onChange({ ...value, [key]: v });

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
  const groupLabel: React.CSSProperties = { fontSize: '12.5px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' };
  const inlineRow: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' };
  const previewStyle: React.CSSProperties = { fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' };

  // "อื่นๆ" must keep the custom box open even while it is still empty, so it is tracked
  // explicitly rather than inferred from the value.
  const [customColor, setCustomColor] = useState(false);
  const colorIsOther = customColor || (value.colorSizePlus !== '' && !COLOR_SIZE_OPTIONS.includes(value.colorSizePlus));
  const formLabel = productFormLabel(value.productForm);

  const standardParts = [
    formLabel && `มาตรฐานการผลิต${formLabel}`,
    value.standardCustomer && `ลูกค้า${value.standardCustomer}`,
    value.standardCode && `ตาม Production STD : QA.STD.${value.standardCode}`,
  ].filter(Boolean);
  const colorParts = [formLabel, value.colorSizePlus && `${value.colorSizePlus}+`].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={groupLabel}>มาตรฐาน</label>
        <div style={grid2}>
          <Select
            value={value.productForm}
            onChange={(e) => set('productForm', e.target.value as ProductSpecDetail['productForm'])}
            options={PRODUCT_FORM_OPTIONS}
            placeholder="— เลือกกุ้งต้ม/กุ้งดิบ —"
          />
          <Input value={value.standardCustomer} onChange={(e) => set('standardCustomer', e.target.value)} placeholder="ลูกค้า (ถ้ามี) เช่น ไต้หวัน" />
        </div>
        <div style={{ ...inlineRow, marginTop: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>ตาม Production STD : QA.STD.</span>
          <Input value={value.standardCode} onChange={(e) => set('standardCode', e.target.value)} placeholder="TW.003" style={{ width: '120px' }} />
        </div>
        {standardParts.length > 0 && <p style={previewStyle}>{standardParts.join(' ')}</p>}
      </div>

      <div>
        <label style={groupLabel}>สี</label>
        <div style={inlineRow}>
          <select
            value={colorIsOther ? OTHER : value.colorSizePlus}
            onChange={(e) => {
              const isOther = e.target.value === OTHER;
              setCustomColor(isOther);
              set('colorSizePlus', isOther ? '' : e.target.value);
            }}
            style={{ padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', background: 'var(--surface)' }}
          >
            <option value="">— เลือกไซส์ —</option>
            {COLOR_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}+</option>)}
            <option value={OTHER}>อื่นๆ</option>
          </select>
          {colorIsOther && (
            <Input value={value.colorSizePlus} onChange={(e) => set('colorSizePlus', e.target.value)} placeholder="ระบุไซส์" style={{ width: '90px' }} autoFocus />
          )}
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>+ (ดึงคำว่า{formLabel ? `"${formLabel}"` : '"กุ้งต้ม/กุ้งดิบ"'}จากมาตรฐานด้านบน)</span>
        </div>
        {colorParts.length > 0 && <p style={previewStyle}>สี : {colorParts.join(' ')}</p>}
      </div>

      <div>
        <label style={groupLabel}>น้ำหนักและการเคลือบน้ำ</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={inlineRow}>
            <Input type="number" value={value.netWeightGrams} onChange={(e) => set('netWeightGrams', e.target.value)} placeholder="0" style={{ width: '90px' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>กรัม · N.W. (ก่อนเคลือบน้ำ — ใช้ในหัวข้อ 2.1 ด้วย)</span>
          </div>
          <div style={inlineRow}>
            <Input type="number" value={value.boxWeightGrams} onChange={(e) => set('boxWeightGrams', e.target.value)} placeholder="0" style={{ width: '90px' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>กรัม · ระบุบนกล่อง</span>
          </div>
          <div style={inlineRow}>
            <Input value={value.afterGlazeWeightGrams} onChange={(e) => set('afterGlazeWeightGrams', e.target.value)} placeholder="เช่น 1000g+" style={{ width: '110px' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>หลังเคลือบน้ำ</span>
          </div>
          <div style={inlineRow}>
            <Input type="number" value={value.glazePercent} onChange={(e) => set('glazePercent', e.target.value)} placeholder="0" style={{ width: '70px' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>% · เคลือบน้ำ (ถ้ามี)</span>
            <Input value={value.glazeMethod} onChange={(e) => set('glazeMethod', e.target.value)} placeholder="วิธีการเคลือบ" style={{ flex: 1, minWidth: '140px' }} />
          </div>
        </div>
      </div>

      <div>
        <label style={groupLabel}>ข้อกำหนดเพิ่มเติม (custom)</label>
        <RequirementChecklist items={value.extraItems ?? []} onChange={(v) => set('extraItems', v)} />
      </div>
    </div>
  );
}
