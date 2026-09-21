import React from 'react';
import type { PackingDetail, ProductSpecDetail } from '../../types';
import { Input } from './Input';
import { BoxCodeInput } from './BoxCodeInput';
import { RequirementChecklist } from './RequirementChecklist';
import { composeInnerBoxLine, composeOuterBoxLine, productFormLabel } from '../../utils/poRequirements';

export interface PackingGroupInput {
  key: string;
  brand: string;
  buyerCode: string;
  productForm: ProductSpecDetail['productForm'];
  netWeightGrams: string;
  value: PackingDetail;
}

interface Props {
  groups: PackingGroupInput[];
  onChangeGroup: (index: number, next: PackingDetail) => void;
  remark: string;
  onRemarkChange: (v: string) => void;
}

const mmInput: React.CSSProperties = { width: '70px' };

// One ข้อ 2 for the whole PO. Inner/outer box size + code (and the strap colour) are entered per
// brand; lids, outer-box bullets, strap yes/no + count + style and custom extras are shared and
// stored on the first brand's PackingDetail (see buildCombinedPackingBlock).
export function PackingSectionFields({ groups, onChangeGroup, remark, onRemarkChange }: Props) {
  if (groups.length === 0) return null;
  const multi = groups.length > 1;
  const primary = groups[0];

  const setOwn = (idx: number, patch: Partial<PackingDetail>) =>
    onChangeGroup(idx, { ...groups[idx].value, ...patch });
  const setShared = (patch: Partial<PackingDetail>) => setOwn(0, patch);

  const groupLabel: React.CSSProperties = { fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '8px' };
  const subLabel: React.CSSProperties = { ...groupLabel, marginBottom: '6px', textDecoration: 'underline' };
  const block: React.CSSProperties = { paddingTop: '12px', borderTop: '1px dashed var(--border)' };
  const radioLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px' };
  const sizeRow: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' };
  const previewStyle: React.CSSProperties = { fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' };
  const brandTitle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' };
  const brandBox: React.CSSProperties = multi
    ? { border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px', background: 'var(--surface)', marginBottom: '8px' }
    : { marginBottom: '8px' };

  const sizeInputs = (
    idx: number,
    keys: ['innerBoxWidthMm' | 'outerBoxWidthMm', 'innerBoxLengthMm' | 'outerBoxLengthMm', 'innerBoxHeightMm' | 'outerBoxHeightMm'],
  ) => (
    <div style={sizeRow}>
      <Input type="number" value={groups[idx].value[keys[0]]} onChange={(e) => setOwn(idx, { [keys[0]]: e.target.value })} placeholder="กว้าง" style={mmInput} />
      <span style={{ color: 'var(--text-muted)' }}>x</span>
      <Input type="number" value={groups[idx].value[keys[1]]} onChange={(e) => setOwn(idx, { [keys[1]]: e.target.value })} placeholder="ยาว" style={mmInput} />
      <span style={{ color: 'var(--text-muted)' }}>x</span>
      <Input type="number" value={groups[idx].value[keys[2]]} onChange={(e) => setOwn(idx, { [keys[2]]: e.target.value })} placeholder="สูง" style={mmInput} />
      <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>mm</span>
    </div>
  );

  const ctxOf = (g: PackingGroupInput) => ({ productForm: g.productForm, brand: g.brand, netWeightGrams: g.netWeightGrams });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {multi && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
          มีหลายแบรนด์ — ข้อ 2 รวมเป็นอันเดียว: ขนาด/รหัสกล่อง (และสีสายรัด) กรอกแยกตามแบรนด์ ส่วนฝากล่อง สายรัด และข้อกำหนดเพิ่มเติมใช้ร่วมกันทุกแบรนด์
        </p>
      )}

      <div>
        <label style={groupLabel}>กล่องอินเนอร์</label>
        {groups.map((g, idx) => (
          <div key={g.key} style={brandBox}>
            {multi && <div style={brandTitle}>{g.brand ? `"${g.brand}"` : '—'}</div>}
            {sizeInputs(idx, ['innerBoxWidthMm', 'innerBoxLengthMm', 'innerBoxHeightMm'])}
            <div style={{ marginTop: '8px' }}>
              <BoxCodeInput label="รหัสกล่องอินเนอร์" prefix="I" buyerCode={g.buyerCode} value={g.value.innerBoxCode} onChange={(v) => setOwn(idx, { innerBoxCode: v })} />
            </div>
            <p style={previewStyle}>{composeInnerBoxLine(g.value, ctxOf(g))}</p>
          </div>
        ))}
      </div>

      <div style={block}>
        <label style={subLabel}>ฝาบน</label>
        <RequirementChecklist items={primary.value.topLidItems} onChange={(v) => setShared({ topLidItems: v })} />
      </div>

      <div style={block}>
        <label style={subLabel}>ฝาล่าง</label>
        <RequirementChecklist items={primary.value.bottomLidItems} onChange={(v) => setShared({ bottomLidItems: v })} />
      </div>

      <div style={block}>
        <label style={groupLabel}>กล่องนอก</label>
        {groups.map((g, idx) => (
          <div key={g.key} style={brandBox}>
            {multi && <div style={brandTitle}>{g.brand ? `"${g.brand}"` : '—'}</div>}
            <Input value={g.value.outerBoxDesc} onChange={(e) => setOwn(idx, { outerBoxDesc: e.target.value })} placeholder="เช่น ลูกฟูกขาว" />
            <div style={{ marginTop: '8px' }}>{sizeInputs(idx, ['outerBoxWidthMm', 'outerBoxLengthMm', 'outerBoxHeightMm'])}</div>
            <div style={{ marginTop: '8px' }}>
              <BoxCodeInput label="รหัสกล่องนอก" prefix="M" buyerCode={g.buyerCode} value={g.value.outerBoxCode} onChange={(v) => setOwn(idx, { outerBoxCode: v })} />
            </div>
            <p style={previewStyle}>{composeOuterBoxLine(g.value, ctxOf(g))}</p>
          </div>
        ))}
        <RequirementChecklist items={primary.value.outerBoxItems} onChange={(v) => setShared({ outerBoxItems: v })} />
      </div>

      <div style={block}>
        <label style={groupLabel}>เชือกสายรัด</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={radioLabel}>
            <input type="radio" name="po-strapped" checked={primary.value.strapped} onChange={() => setShared({ strapped: true })} style={{ accentColor: 'var(--primary)' }} />
            รัด
          </label>
          <label style={radioLabel}>
            <input type="radio" name="po-strapped" checked={!primary.value.strapped} onChange={() => setShared({ strapped: false })} style={{ accentColor: 'var(--primary)' }} />
            ไม่รัด
          </label>
          {primary.value.strapped && (
            <>
              <Input type="number" value={primary.value.strappingCount} onChange={(e) => setShared({ strappingCount: e.target.value })} placeholder="จำนวนเส้น" style={{ maxWidth: '110px' }} />
              <Input value={primary.value.strappingStyle} onChange={(e) => setShared({ strappingStyle: e.target.value })} placeholder="ลักษณะการรัด" style={{ maxWidth: '160px' }} />
            </>
          )}
        </div>
        {primary.value.strapped && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {groups.map((g, idx) => (
              <div key={g.key} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', minWidth: '90px' }}>
                  {productFormLabel(g.productForm) || (g.brand ? `"${g.brand}"` : 'สี')}
                  {multi && productFormLabel(g.productForm) && g.brand ? ` "${g.brand}"` : ''} :
                </span>
                <Input value={g.value.strappingColor} onChange={(e) => setOwn(idx, { strappingColor: e.target.value })} placeholder="สีสายรัด *" style={{ maxWidth: '160px' }} />
              </div>
            ))}
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              สีสายรัดแยกตามกุ้งต้ม/กุ้งดิบ · ถ้าไม่กรอกจำนวนเส้น จะไม่แสดงในใบ PO
            </span>
          </div>
        )}
      </div>

      <div style={block}>
        <label style={groupLabel}>ข้อกำหนดเพิ่มเติม (custom) — เช่น แผ่นรองพลาสติก, ตาราง barcode</label>
        <RequirementChecklist items={primary.value.extraItems ?? []} onChange={(v) => setShared({ extraItems: v })} />
      </div>

      <div style={{ marginTop: '8px' }}>
        <Input label="Remark" value={remark} onChange={(e) => onRemarkChange(e.target.value)} />
      </div>
    </div>
  );
}
