'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  LifeBuoy,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  StickyNote,
  UserCheck,
  X,
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { downloadFile } from '@/lib/download-file';

type EmailEntry = {
  id: number;
  email: string;
  password: string;
  auth: string;
  note: string;
  image_path: string;
  phone: string;
  recovery_email: string;
  linked_account_id: number | null;
  linked_company_id: number | null;
  source: 'vault' | 'account';
  used: boolean;
  app_count: number;
  apps: { id: number; name: string }[];
  account: {
    id: number;
    developer_name: string;
    developer_id: string;
    email: string;
    type: string;
    status: string;
    company_name: string;
    phone?: string;
  } | null;
  company: { id: number; name: string } | null;
};

const USED = '#eab308';
const FREE = '#22c55e';

export default function EmailDetailModal({
  email,
  onClose,
  onEdit,
}: {
  email: EmailEntry | null;
  onClose: () => void;
  onEdit: (e: EmailEntry) => void;
}) {
  const [revealPw, setRevealPw] = useState(false);
  const [revealAuth, setRevealAuth] = useState(false);
  const [copied, setCopied] = useState('');
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    // Re-hide secrets and close the lightbox every time a different email opens.
    setRevealPw(false);
    setRevealAuth(false);
    setCopied('');
    setImageOpen(false);
  }, [email?.id]);

  if (!email) return null;
  const e = email;
  const tone = e.used ? USED : FREE;
  const hasPw = e.password.trim().length > 0;
  const hasAuth = e.auth.trim().length > 0;

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
    <ModalPortal open={!!email}>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: 580, width: '100%' }}
          onClick={(ev) => ev.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <div
                style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: `${tone}1a`, border: `1px solid ${tone}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Mail size={22} color={tone} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.email}>
                  {e.email}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <Badge tone={tone} icon={e.used ? <UserCheck size={11} /> : <ShieldCheck size={11} />}>
                    {e.used ? 'Used in account' : 'Available'}
                  </Badge>
                  {e.source === 'account' && (
                    <Badge tone="#38bdf8" icon={<RefreshCw size={10} />}>Synced</Badge>
                  )}
                  {!hasPw && <Badge tone="#ef4444" icon={<AlertTriangle size={11} />}>No password</Badge>}
                  {!hasAuth && <Badge tone="#f59e0b" icon={<ShieldAlert size={11} />}>No 2FA</Badge>}
                </div>
              </div>
            </div>
            <button className="modal-close" onClick={onClose} type="button">
              <X size={24} />
            </button>
          </div>

          <div className="modal-body" style={{ gap: 18 }}>
            {/* Security warning banner */}
            {(!hasPw || !hasAuth) && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  fontSize: '0.82rem', color: '#fca5a5',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  {!hasPw && !hasAuth
                    ? 'Password and 2FA are not saved for this email.'
                    : !hasPw
                    ? 'Password is not saved for this email.'
                    : '2FA / authentication is not saved for this email.'}
                </span>
              </div>
            )}

            {/* Credentials */}
            <Section title="Credentials">
              <SecretLine
                icon={<KeyRound size={14} />}
                label="Password"
                value={e.password}
                revealed={revealPw}
                onToggle={() => setRevealPw((v) => !v)}
                onCopy={() => copy(e.password, 'pw')}
                copied={copied === 'pw'}
              />
              <SecretLine
                icon={hasAuth ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                label="Authentication / 2FA"
                value={e.auth}
                multiline
                revealed={revealAuth}
                onToggle={() => setRevealAuth((v) => !v)}
                onCopy={() => copy(e.auth, 'auth')}
                copied={copied === 'auth'}
              />
            </Section>

            {/* Recovery / contact */}
            <Section title="Recovery & Contact">
              <PlainLine icon={<Phone size={14} />} label="Phone" value={e.phone} onCopy={() => copy(e.phone, 'phone')} copied={copied === 'phone'} />
              <PlainLine icon={<LifeBuoy size={14} />} label="Security / Recovery Email" value={e.recovery_email} onCopy={() => copy(e.recovery_email, 'rec')} copied={copied === 'rec'} />
            </Section>

            {/* Linked account */}
            {e.used && e.account && (
              <Section title="Developer Account">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <InfoRow label="Account" value={e.account.developer_name || e.account.email || `#${e.account.id}`} />
                  <InfoRow label="Platform" value={e.account.type === 'apple' ? 'Apple Developer' : 'Google Play'} />
                  {e.account.developer_id && <InfoRow label="Developer ID" value={`#${e.account.developer_id}`} />}
                  {e.account.status && <InfoRow label="Status" value={e.account.status} />}
                  {e.company && <InfoRow label="Company" value={e.company.name} icon={<Building2 size={13} color="#ec4899" />} />}
                  {e.app_count > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Smartphone size={12} color={USED} /> {e.app_count} App{e.app_count !== 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {e.apps.map((ap) => (
                          <span
                            key={ap.id}
                            style={{
                              fontSize: '0.74rem', color: 'var(--muted)', padding: '3px 9px', borderRadius: 6,
                              background: 'var(--glass)', border: '1px solid var(--card-border)',
                            }}
                          >
                            {ap.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Note */}
            {e.note.trim() && (
              <Section title="Note">
                <div style={{ display: 'flex', gap: 8, fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  <StickyNote size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ whiteSpace: 'pre-wrap' }}>{e.note}</span>
                </div>
              </Section>
            )}

            {/* Image — shown only on demand (open / download), never inline */}
            {e.image_path && (
              <Section title="Screenshot">
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--glass)', border: '1px solid var(--card-border)',
                  }}
                >
                  <ImageIcon size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: '0.84rem', color: 'var(--muted)' }}>
                    Image attached
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => setImageOpen(true)}
                  >
                    <Eye size={14} />
                    View Image
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => downloadFile(e.image_path, `${e.email || 'email'}-image.jpg`)}
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </Section>
            )}

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onEdit(e)}>
                <Pencil size={15} />
                Edit
              </button>
              {e.source === 'account' && e.account && (
                <Link href={`/accounts/${e.account.id}`} className="btn btn-secondary">
                  <ExternalLink size={15} />
                  Open in Client Accounts
                </Link>
              )}
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>

    {/* Image lightbox — opens in-app, not a new tab */}
    <ModalPortal open={imageOpen && !!e.image_path}>
      <div
        className="modal-overlay"
        style={{ zIndex: 10001, padding: 24 }}
        onClick={() => setImageOpen(false)}
      >
        <div
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: '95vw', maxHeight: '95vh' }}
          onClick={(ev) => ev.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={e.image_path}
            alt={e.email}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, border: '1px solid var(--card-border)', background: '#000' }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => downloadFile(e.image_path, `${e.email || 'email'}-image.jpg`)}
            >
              <Download size={15} />
              Download
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setImageOpen(false)}>
              <X size={15} />
              Close
            </button>
          </div>
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            aria-label="Close image"
            style={{
              position: 'absolute', top: -10, right: -10,
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', border: '1px solid var(--card-border)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </ModalPortal>
    </>
  );
}

/* ── Sub-components ── */

function Badge({ tone, icon, children }: { tone: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase',
        color: tone, background: `${tone}1a`, border: `1px solid ${tone}40`,
        padding: '2px 8px', borderRadius: 20,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.84rem' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, textAlign: 'right' }}>
        {icon}
        {value}
      </span>
    </div>
  );
}

function rowShell(children: React.ReactNode, alignTop = false): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex', alignItems: alignTop ? 'flex-start' : 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--glass)', border: '1px solid var(--card-border)',
      }}
    >
      {children}
    </div>
  );
}

function SecretLine({
  icon, label, value, revealed, onToggle, onCopy, copied, multiline = false,
}: {
  icon: React.ReactNode; label: string; value: string;
  revealed: boolean; onToggle: () => void; onCopy: () => void; copied: boolean; multiline?: boolean;
}) {
  const has = value.trim().length > 0;
  return rowShell(
    <>
      <span style={{ color: 'var(--muted)', display: 'flex', flexShrink: 0, marginTop: multiline && revealed ? 2 : 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        {has ? (
          <div
            style={{
              fontSize: '0.88rem', fontFamily: revealed ? 'monospace' : 'inherit',
              wordBreak: 'break-all', whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
              overflow: multiline ? 'visible' : 'hidden', textOverflow: 'ellipsis', marginTop: 2,
            }}
          >
            {revealed ? value : '•••••••••••••'}
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={12} /> Not saved
          </div>
        )}
      </div>
      {has && (
        <>
          <IconBtn title={revealed ? 'Hide' : 'Show'} onClick={onToggle}>
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </IconBtn>
          <IconBtn title="Copy" onClick={onCopy} color={copied ? '#22c55e' : undefined}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </IconBtn>
        </>
      )}
    </>,
    multiline && revealed,
  );
}

function PlainLine({ icon, label, value, onCopy, copied }: { icon: React.ReactNode; label: string; value: string; onCopy: () => void; copied: boolean }) {
  const has = value.trim().length > 0;
  return rowShell(
    <>
      <span style={{ color: 'var(--muted)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '0.86rem', color: has ? 'inherit' : 'var(--muted)', marginTop: 2, wordBreak: 'break-all' }}>
          {has ? value : '—'}
        </div>
      </div>
      {has && (
        <IconBtn title="Copy" onClick={onCopy} color={copied ? '#22c55e' : undefined}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </IconBtn>
      )}
    </>,
  );
}

function IconBtn({ children, title, onClick, color }: { children: React.ReactNode; title: string; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 7,
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color || 'var(--muted)',
      }}
    >
      {children}
    </button>
  );
}
