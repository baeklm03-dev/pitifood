import React from 'react';
import type { LoadingRequirement } from '../../types';

interface Props {
  value: LoadingRequirement;
  onChange: (next: LoadingRequirement) => void;
}

export function LoadingRequirementFields({ value, onChange }: Props) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
      <input
        type="checkbox"
        checked={value.temperatureRecorder}
        onChange={(e) => onChange({ ...value, temperatureRecorder: e.target.checked })}
        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', marginTop: '1px' }}
      />
      <span>
        Temperature Recorder — กำหนดใส่ Temperature Recorder ในตู้สินค้า
        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>(ให้ระบุหมายเลขอุณหภูมิใน B/L และใน packing list)</span>
      </span>
    </label>
  );
}
