'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Key, ShieldCheck, FileText } from 'lucide-react';

function SecureField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '16px 20px',
      background: 'var(--card-bg, rgba(255,255,255,0.04))',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          flex: 1,
          fontFamily: revealed ? 'monospace' : 'inherit',
          fontSize: '0.95rem',
          letterSpacing: revealed ? '0.04em' : '0.15em',
          color: revealed ? 'var(--foreground, #fff)' : 'var(--muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {revealed ? value : '•'.repeat(Math.min(value.length, 24))}
        </span>
        <button
          type="button"
          onClick={() => setRevealed(r => !r)}
          title={revealed ? 'Hide' : 'Reveal'}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            flexShrink: 0,
          }}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
    </div>
  );
}

export default function AccountSecureInfo({ account }: { account: any }) {
  const hasSecureData = account.dev_password || account.dev_2fa_secret || account.dev_security_notes;
  if (!hasSecureData) return null;

  return (
    <section className="glass-card" style={{ marginTop: '32px' }}>
      <div className="section-head-row" style={{ marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={20} /> Secure Credentials
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          Sensitive — click Reveal to view
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {account.dev_password && (
          <SecureField
            label="Account Password"
            value={account.dev_password}
            icon={<Key size={13} />}
          />
        )}
        {account.dev_2fa_secret && (
          <SecureField
            label="2FA / Backup Code"
            value={account.dev_2fa_secret}
            icon={<ShieldCheck size={13} />}
          />
        )}
      </div>

      {account.dev_security_notes && (
        <div style={{
          marginTop: '14px',
          padding: '16px 20px',
          background: 'var(--card-bg, rgba(255,255,255,0.04))',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            <FileText size={13} />
            <span>Security Notes</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {account.dev_security_notes}
          </p>
        </div>
      )}
    </section>
  );
}
