import React from 'react';
import type { ProductSpecDetail } from '../../types';
import { Input } from './Input';
import { RequirementChecklist } from './RequirementChecklist';

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
        <label style={groupLabel}>น้ำหนักและการเคลือบน้ำ</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={inlineRow}>
            <Input type="number" value={value.netWeightGrams} onChange={(e) => set('netWeightGrams', e.target.value)} placeholder="0" style={{ width: '90px' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>กรัม · N.W. (ก่อนเคลือบน้ำ — ใช้ในหัวข้อ 2.1/2.2 ด้วย)</span>
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
