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

interface Segment { cr: 'C' | 'R'; format: string; revision: string; }

const blankSegment = (): Segment => ({ cr: 'C', format: '', revision: '' });

// A PO can list several box codes for one box (e.g. two outer-box codes); they are stored
// in the same single string, separated by " / ".
const SEPARATOR = ' / ';

function parseSegments(value: string): Segment[] {
  const segments = value
    .split('/')
    .map((part) => part.trim().match(CODE_PATTERN))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ cr: m[3] as 'C' | 'R', format: m[4], revision: m[5] }));
  return segments.length > 0 ? segments : [blankSegment()];
}

// Builds the box-code string following the factory's fixed pattern
// "{I|M}-{buyer code}-{C|R}-{packing format}-R{revision}" — buyer code and prefix are known
// from context, so only the C/R choice and the two team-assigned numbers need typing.
// "+ เพิ่มรหัส" adds another code; all codes are joined with " / ".
//
// Segments are held as local state, seeded once from `value` on mount, rather than re-parsed
// from `value` every render — a partially-typed code (e.g. format filled but revision still
// empty) doesn't match CODE_PATTERN, and re-deriving from it would wipe what was just typed.
export function BoxCodeInput({ label, prefix, buyerCode, value, onChange }: Props) {
  const [segments, setSegments] = useState<Segment[]>(() => parseSegments(value));

  const emit = (next: Segment[]) => {
    setSegments(next);
    onChange(
      next
        .map((sg) => `${prefix}-${buyerCode || 'Axx'}-${sg.cr}-${sg.format}-R${sg.revision}`)
        .join(SEPARATOR)
    );
  };

  const update = (idx: number, patch: Partial<Segment>) =>
    emit(segments.map((sg, i) => (i === idx ? { ...sg, ...patch } : sg)));

  return (
    <div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {segments.map((sg, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              {prefix}-{buyerCode || 'Axx'}-
            </span>
            <select value={sg.cr} onChange={(e) => update(idx, { cr: e.target.value as 'C' | 'R' })} style={{ ...inputStyle, width: '78px' }}>
              <option value="C">C (Cooked)</option>
              <option value="R">R (Raw)</option>
            </select>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>-</span>
            <input
              value={sg.format}
              onChange={(e) => update(idx, { format: e.target.value.replace(/\D/g, '') })}
              placeholder="01"
              style={{ ...inputStyle, width: '48px', textAlign: 'center', fontFamily: 'monospace' }}
            />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>-R</span>
            <input
              value={sg.revision}
              onChange={(e) => update(idx, { revision: e.target.value.replace(/\D/g, '') })}
              placeholder="0"
              style={{ ...inputStyle, width: '48px', textAlign: 'center', fontFamily: 'monospace' }}
            />
            {segments.length > 1 && (
              <button
                type="button"
                onClick={() => emit(segments.filter((_, i) => i !== idx))}
                title="ลบรหัสนี้"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '16px', lineHeight: 1, padding: '2px 6px' }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => emit([...segments, blankSegment()])}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', padding: '2px 0' }}
        >
          + เพิ่มรหัส
        </button>
      </div>
    </div>
  );
}
