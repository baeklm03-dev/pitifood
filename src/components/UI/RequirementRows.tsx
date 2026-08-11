import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { RequirementRow } from '../../types';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface Props {
  rows: RequirementRow[];
  onChange: (rows: RequirementRow[]) => void;
  presetLabels?: string[];
  /** When a row's label is exactly "แบรนด์" and detail is still empty, auto-fill detail with this. */
  brandName?: string;
  listId: string;
}

export function RequirementRows({ rows, onChange, presetLabels, brandName, listId }: Props) {
  const addRow = () => onChange([...rows, { id: uid(), label: '', detail: '' }]);
  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const updateDetail = (id: string, detail: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, detail } : r)));
  const updateLabel = (id: string, label: string) =>
    onChange(rows.map((r) => {
      if (r.id !== id) return r;
      const autoDetail = brandName && !r.detail && label.trim() === 'แบรนด์' ? brandName : r.detail;
      return { ...r, label, detail: autoDetail };
    }));

  const cellInput: React.CSSProperties = {
    padding: '7px 9px', border: '1px solid var(--border)', borderRadius: '4px',
    fontSize: '12.5px', width: '100%', background: 'var(--surface)', color: 'var(--text)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '14px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '13px' }}>
          ยังไม่มีรายการ
        </div>
      )}
      {rows.map((row) => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '8px', alignItems: 'center' }}>
          <input
            list={presetLabels ? listId : undefined}
            value={row.label}
            onChange={(e) => updateLabel(row.id, e.target.value)}
            placeholder="รายการ"
            style={cellInput}
          />
          <input
            value={row.detail}
            onChange={(e) => updateDetail(row.id, e.target.value)}
            placeholder="รายละเอียด"
            style={cellInput}
          />
          <button type="button" onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: '6px' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {presetLabels && (
        <datalist id={listId}>
          {presetLabels.map((l) => <option key={l} value={l} />)}
        </datalist>
      )}
      <button type="button" onClick={addRow} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: '12.5px', padding: '4px 0' }}>
        <Plus size={13} /> เพิ่มรายการ
      </button>
    </div>
  );
}
