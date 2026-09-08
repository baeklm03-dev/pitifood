import React, { useState } from 'react';

interface Props {
  label: string;
  prefix: 'I' | 'M'; // I = inner box, M = master/outer box
  buyerCode: string;
  value: string;
  onChange: (next: string) => void;
}

// Matches "I-A01-C-01-R7" / "M-A08-C-02-R0" — prefix, buyer code, Cooked/Raw, 2-digit packing
// format, revision number.
const CODE_PATTERN = /^([IM])-(.+)-(C|R)-(\d+)-R(\d+)$/;

const inputStyle: React.CSSProperties = {
  padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: '4px',
  fontSize: '12.5px', background: 'var(--surface)', color: 'var(--text)', outline: 'none',
};

// Builds the box-code string following the factory's fixed pattern
// "{I|M}-{buyer code}-{C|R}-{packing format}-R{revision}" — buyer code and prefix are known
// from context, so only the C/R choice and the two team-assigned numbers need typing.
//
// Segments are held as local state, seeded once from `value` on mount, rather than re-parsed
// from `value` every render — a partially-typed code (e.g. format filled but revision still
// empty) doesn't match CODE_PATTERN, and re-deriving from it would wipe what was just typed.
export function BoxCodeInput({ label, prefix, buyerCode, value, onChange }: Props) {
  const initial = value.match(CODE_PATTERN);
  const [cr, setCr] = useState<'C' | 'R'>((initial?.[3] as 'C' | 'R') ?? 'C');
  const [format, setFormat] = useState(initial?.[4] ?? '');
  const [revision, setRevision] = useState(initial?.[5] ?? '');

  const compose = (nextCr: string, nextFormat: string, nextRevision: string) => {
    setCr(nextCr as 'C' | 'R');
    setFormat(nextFormat);
    setRevision(nextRevision);
    onChange(`${prefix}-${buyerCode || 'Axx'}-${nextCr}-${nextFormat}-R${nextRevision}`);
  };

  return (
    <div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{label}</span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {prefix}-{buyerCode || 'Axx'}-
        </span>
        <select value={cr} onChange={(e) => compose(e.target.value, format, revision)} style={{ ...inputStyle, width: '78px' }}>
          <option value="C">C (Cooked)</option>
          <option value="R">R (Raw)</option>
        </select>
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>-</span>
        <input
          value={format}
          onChange={(e) => compose(cr, e.target.value.replace(/\D/g, ''), revision)}
          placeholder="01"
          style={{ ...inputStyle, width: '48px', textAlign: 'center', fontFamily: 'monospace' }}
        />
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>-R</span>
        <input
          value={revision}
          onChange={(e) => compose(cr, format, e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          style={{ ...inputStyle, width: '48px', textAlign: 'center', fontFamily: 'monospace' }}
        />
      </div>
    </div>
  );
}
