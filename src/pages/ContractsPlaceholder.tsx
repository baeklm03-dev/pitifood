import React from 'react';
import { FileText } from 'lucide-react';

export function ContractsPlaceholder() {
  return (
    <div style={{
      padding: '80px 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: '#EAFAF1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
        color: 'var(--success)',
      }}>
        <FileText size={28} />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
        Contracts — Coming in Phase 2
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: 1.7 }}>
        The full Sale Contract creation, finalization, and signing workflow will be built in Phase 2.
        Master data (Buyers & Brands) is ready to use.
      </p>
    </div>
  );
}
