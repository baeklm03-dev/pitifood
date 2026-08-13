import React from 'react';
import type { DocumentRequirement } from '../../types';

interface Props {
  value: DocumentRequirement;
  onChange: (next: DocumentRequirement) => void;
}

const ITEMS: { key: keyof DocumentRequirement; label: string }[] = [
  { key: 'photoInnerBoxCorrugated', label: 'ภาพถ่ายกล่องอินเนอร์ และลูกฟูก เมื่อกล่องมาถึงโรงงาน' },
  { key: 'inspectionReport', label: 'จัดทำ Finished Product Inspection Report ตามแบบฟอร์มที่ลูกค้ากำหนด' },
  { key: 'loadingReport', label: 'จัดทำรายงานการโหลด ระบุรายละเอียด รายการสินค้า, วันหมดอายุ, lot number, ภาพถ่ายสินค้าระหว่างโหลด และตำแหน่ง' },
];

export function DocumentRequirementFields({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {ITEMS.map(({ key, label }) => (
        <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={value[key] as boolean}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', marginTop: '1px', flexShrink: 0 }}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}
