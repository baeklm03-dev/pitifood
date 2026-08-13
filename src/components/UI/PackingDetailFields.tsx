import React from 'react';
import type { PackingDetail } from '../../types';
import { Input } from './Input';

interface Props {
  value: PackingDetail;
  onChange: (next: PackingDetail) => void;
  /** Unique per rendered instance — this form can appear multiple times on one page (one per product group). */
  fieldId: string;
}

export function PackingDetailFields({ value, onChange, fieldId }: Props) {
  const set = <K extends keyof PackingDetail>(key: K, v: PackingDetail[K]) =>
    onChange({ ...value, [key]: v });

  const groupLabel: React.CSSProperties = { fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '8px' };
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
  const block: React.CSSProperties = { paddingTop: '12px', borderTop: '1px dashed var(--border)' };
  const checkboxLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12.5px' };
  const radioLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div>
        <label style={groupLabel}>กล่องอินเนอร์</label>
        <div style={grid2}>
          <Input value={value.innerBoxDesc} onChange={(e) => set('innerBoxDesc', e.target.value)} placeholder="เช่น กุ้ง PDTO" />
          <Input value={value.innerBoxCode} onChange={(e) => set('innerBoxCode', e.target.value)} placeholder="รหัสกล่อง" />
        </div>
      </div>

      <div style={block}>
        <label style={groupLabel}>ฝาบน</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Input value={value.topLidChecklist} onChange={(e) => set('topLidChecklist', e.target.value)} placeholder="กาเครื่องหมายถูกต้องที่ช่อง — เช่น size" />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input value={value.topLidStampCode} onChange={(e) => set('topLidStampCode', e.target.value)} placeholder="stamp code (12 หลัก)" style={{ maxWidth: '200px' }} />
            <label style={checkboxLabel}>
              <input type="checkbox" checked={value.topLidStampDate} onChange={(e) => set('topLidStampDate', e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }} />
              stamp Production date (YYYY.MM.DD)
            </label>
          </div>
        </div>
      </div>

      <div style={block}>
        <label style={groupLabel}>ฝาล่าง</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={radioLabel}>
            <input type="radio" name={`${fieldId}-bottomLidType`} checked={value.bottomLidType === 'printed'} onChange={() => set('bottomLidType', 'printed')} style={{ accentColor: 'var(--primary)' }} />
            พิมพ์ระบุ
          </label>
          <label style={radioLabel}>
            <input type="radio" name={`${fieldId}-bottomLidType`} checked={value.bottomLidType === 'blank'} onChange={() => set('bottomLidType', 'blank')} style={{ accentColor: 'var(--primary)' }} />
            ไม่มีข้อความใดๆ
          </label>
          {value.bottomLidType === 'printed' && (
            <Input value={value.bottomLidDetail} onChange={(e) => set('bottomLidDetail', e.target.value)} placeholder="ระบุข้อความ" style={{ flex: 1, minWidth: '160px' }} />
          )}
        </div>
      </div>

      <div style={block}>
        <label style={groupLabel}>กล่องนอก</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={grid2}>
            <Input value={value.outerBoxType} onChange={(e) => set('outerBoxType', e.target.value)} placeholder="เช่น ลูกฟูกขาว" />
            <Input value={value.outerBoxCode} onChange={(e) => set('outerBoxCode', e.target.value)} placeholder="รหัสกล่อง" />
          </div>
          <Input value={value.outerBoxChecklist} onChange={(e) => set('outerBoxChecklist', e.target.value)} placeholder="กาเครื่องหมายถูกต้องที่ช่อง — เช่น size" />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input value={value.outerBoxStampCode} onChange={(e) => set('outerBoxStampCode', e.target.value)} placeholder="stamp code (12 หลัก)" style={{ maxWidth: '200px' }} />
            <label style={checkboxLabel}>
              <input type="checkbox" checked={value.outerBoxDateMatchInner} onChange={(e) => set('outerBoxDateMatchInner', e.target.checked)} style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }} />
              วันผลิต/วันหมดอายุตรงกับกล่องอินเนอร์
            </label>
          </div>
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
              <Input value={value.strappingStyle} onChange={(e) => set('strappingStyle', e.target.value)} placeholder="ลักษณะการรัด" style={{ maxWidth: '160px' }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
