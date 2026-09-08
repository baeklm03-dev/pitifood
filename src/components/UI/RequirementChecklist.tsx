import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { RequirementItem } from '../../types';
import { Button } from './Button';

interface Props {
  items: RequirementItem[];
  onChange: (next: RequirementItem[]) => void;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)',
};

// Shared editable checklist for PO section 3 (Loading requirement) and section 4 (Document
// requirement) — both are free-length, freely-worded lists in real POs rather than a fixed
// set of checkboxes, so this one component covers both instead of two rigid forms.
export function RequirementChecklist({ items, onChange }: Props) {
  const update = (id: string, patch: Partial<RequirementItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addItem = () => onChange([...items, { id: uid(), text: '', checked: true }]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item, i) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => update(item.id, { checked: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0 }}
          />
          <input
            value={item.text}
            onChange={(e) => update(item.id, { text: e.target.value })}
            placeholder="ระบุข้อกำหนด..."
            style={{
              flex: 1, padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
              fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', outline: 'none',
            }}
          />
          <button type="button" style={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
            <ChevronUp size={14} style={{ opacity: i === 0 ? 0.3 : 1 }} />
          </button>
          <button type="button" style={iconBtn} disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Move down">
            <ChevronDown size={14} style={{ opacity: i === items.length - 1 ? 0.3 : 1 }} />
          </button>
          <button type="button" style={{ ...iconBtn, color: 'var(--danger)' }} onClick={() => remove(item.id)} title="Remove">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={addItem}>
          <Plus size={13} /> Add item
        </Button>
      </div>
    </div>
  );
}
