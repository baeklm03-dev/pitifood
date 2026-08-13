import React from 'react';
import type { ProductSpecDetail } from '../../types';
import { Input } from './Input';

interface Props {
  value: ProductSpecDetail;
  onChange: (next: ProductSpecDetail) => void;
}

export function ProductSpecFields({ value, onChange }: Props) {
  const set = <K extends keyof ProductSpecDetail>(key: K, v: ProductSpecDetail[K]) =>
    onChange({ ...value, [key]: v });

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
  const groupLabel: React.CSSProperties = { fontSize: '12.5px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' };
  const inlineRow: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={grid2}>
        <Input label="มาตรฐาน" value={value.standard} onChange={(e) => set('standard', e.target.value)} />
        <Input label="สี" value={value.color} onChange={(e) => set('color', e.target.value)} placeholder="เช่น กุ้งต้ม 24+" />
      </div>

      <div>
        <label style={groupLabel}>น้ำหนัก (Net weight) — ขนาด กว้าง x ยาว x สูง (mm)</label>
        <div style={inlineRow}>
          <Input type="number" value={value.netWeightWidthMm} onChange={(e) => set('netWeightWidthMm', e.target.value)} placeholder="กว้าง" style={{ width: '90px' }} />
          <span style={{ color: 'var(--text-muted)' }}>x</span>
          <Input type="number" value={value.netWeightLengthMm} onChange={(e) => set('netWeightLengthMm', e.target.value)} placeholder="ยาว" style={{ width: '90px' }} />
          <span style={{ color: 'var(--text-muted)' }}>x</span>
          <Input type="number" value={value.netWeightHeightMm} onChange={(e) => set('netWeightHeightMm', e.target.value)} placeholder="สูง" style={{ width: '90px' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>mm</span>
        </div>
      </div>

      <div>
        <label style={groupLabel}>น้ำหนัก (ระบุบนกล่อง)</label>
        <div style={inlineRow}>
          <Input type="number" value={value.boxWeightGrams} onChange={(e) => set('boxWeightGrams', e.target.value)} placeholder="0" style={{ width: '90px' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>กรัม · เคลือบน้ำ</span>
          <Input type="number" value={value.glazePercent} onChange={(e) => set('glazePercent', e.target.value)} placeholder="0" style={{ width: '70px' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>% · วิธีเคลือบน้ำ</span>
          <Input value={value.glazeMethod} onChange={(e) => set('glazeMethod', e.target.value)} placeholder="วิธีเคลือบน้ำ" style={{ flex: 1, minWidth: '140px' }} />
        </div>
      </div>
    </div>
  );
}
