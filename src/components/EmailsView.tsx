'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Check,
  CircleCheck,
  Copy,
  ExternalLink,
  Eye,
  KeyRound,
  LifeBuoy,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { deleteEmail } from '@/lib/actions';
import EmailModal from './EmailModal';
import EmailDetailModal from './EmailDetailModal';

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

const USED = '#eab308'; // gold — already used to open a developer account
const FREE = '#22c55e'; // green — available, not used yet

export default function EmailsView({
  initialEmails,
  accounts,
  companies,
}: {
  initialEmails: EmailEntry[];
  accounts: any[];
  companies: any[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'used' | 'available' | 'attention'>('all');
  const [copied, setCopied] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit'; email: EmailEntry | null }>({
    open: false,
    mode: 'add',
    email: null,
  });
  const [detail, setDetail] = useState<EmailEntry | null>(null);

  const emails = initialEmails;

  const stats = useMemo(() => {
    const used = emails.filter((e) => e.used).length;
    const withAuth = emails.filter((e) => e.auth.trim()).length;
    const linkedApps = emails.reduce((sum, e) => sum + (e.app_count || 0), 0);
    const attention = emails.filter((e) => !e.password.trim() || !e.auth.trim()).length;
    return {
      total: emails.length,
      used,
      available: emails.length - used,
      withAuth,
      linkedApps,
      attention,
    };
  }, [emails]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emails.filter((e) => {
      if (filter === 'used' && !e.used) return false;
      if (filter === 'available' && e.used) return false;
      if (filter === 'attention' && e.password.trim() && e.auth.trim()) return false;
      if (!q) return true;
      return (
        e.email.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.recovery_email.toLowerCase().includes(q) ||
        (e.account?.developer_name || '').toLowerCase().includes(q) ||
        (e.account?.email || '').toLowerCase().includes(q) ||
        (e.company?.name || '').toLowerCase().includes(q) ||
        e.apps.some((ap) => ap.name.toLowerCase().includes(q))
      );
    });
  }, [emails, search, filter]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  function openEdit(e: EmailEntry) {
    setDetail(null);
    // Synced account-emails aren't real vault rows yet — editing one saves it
    // into the emails table (add), pre-filled and linked back to its account.
    setModal({ open: true, mode: e.source === 'account' ? 'add' : 'edit', email: e });
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this email from the vault?')) return;
    setDeletingId(id);
    const result = await deleteEmail(id);
    setDeletingId(null);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Statistics ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '14px',
        }}
      >
        <StatCard icon={<Mail size={20} />} label="Total Emails" value={stats.total} color="#3b82f6" />
        <StatCard icon={<UserCheck size={20} />} label="Used in Account" value={stats.used} color={USED} />
        <StatCard icon={<CircleCheck size={20} />} label="Available" value={stats.available} color={FREE} />
        <StatCard icon={<ShieldCheck size={20} />} label="With 2FA" value={stats.withAuth} color="#a855f7" />
        <StatCard icon={<Smartphone size={20} />} label="Linked Apps" value={stats.linkedApps} color="#ec4899" />
        <StatCard icon={<AlertTriangle size={20} />} label="Need Attention" value={stats.attention} color="#ef4444" />
      </section>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'add', email: null })}>
          <Plus size={18} />
          Add Email
        </button>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            className="form-input"
            placeholder="Search email, account, company, phone, app…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {([
            ['all', 'All'],
            ['used', 'Used'],
            ['available', 'Available'],
            ['attention', 'Need Attention'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: '0.83rem' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div
          className="glass-card"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '16px', padding: '64px 32px', textAlign: 'center',
          }}
        >
          <Mail size={48} color="var(--muted)" />
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No emails found</p>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {search || filter !== 'all'
                ? 'Try a different search or filter.'
                : 'Add your first email using the button above.'}
            </p>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {filtered.length > 0 && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((e, i) => {
            const tone = e.used ? USED : FREE;
            const hasPw = e.password.trim().length > 0;
            const hasAuth = e.auth.trim().length > 0;
            return (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', cursor: 'pointer',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                  borderLeft: `3px solid ${tone}`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(ev) => ((ev.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: `${tone}1a`, border: `1px solid ${tone}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Mail size={18} color={tone} />
                </div>

                {/* Main */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* line 1: email + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{ fontWeight: 700, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
                      title={e.email}
                    >
                      {e.email}
                    </span>
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); copy(e.email, `em-${e.id}`); }}
                      title="Copy email"
                      style={miniBtn(copied === `em-${e.id}` ? '#22c55e' : 'var(--muted)')}
                    >
                      {copied === `em-${e.id}` ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <Pill tone={tone} icon={e.used ? <UserCheck size={10} /> : <CircleCheck size={10} />}>
                      {e.used ? 'Used' : 'Available'}
                    </Pill>
                    {e.source === 'account' && <Pill tone="#38bdf8" icon={<RefreshCw size={9} />}>Synced</Pill>}
                    {!hasPw && <Pill tone="#ef4444" icon={<AlertTriangle size={10} />}>No password</Pill>}
                    {!hasAuth && <Pill tone="#f59e0b" icon={<ShieldAlert size={10} />}>No 2FA</Pill>}
                  </div>

                  {/* line 2: meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 5, fontSize: '0.76rem', color: 'var(--muted)' }}>
                    {e.used && e.account && (
                      <Meta icon={<UserCheck size={12} color={USED} />}>
                        {e.account.developer_name || e.account.email || `#${e.account.id}`}
                        <span style={{ opacity: 0.7 }}> · {e.account.type === 'apple' ? 'Apple' : 'Google Play'}</span>
                      </Meta>
                    )}
                    {e.company && <Meta icon={<Building2 size={12} color="#ec4899" />}>{e.company.name}</Meta>}
                    {e.app_count > 0 && <Meta icon={<Smartphone size={12} color={USED} />}>{e.app_count} app{e.app_count !== 1 ? 's' : ''}</Meta>}
                    {e.phone && <Meta icon={<Phone size={12} />}>{e.phone}</Meta>}
                    {e.recovery_email && <Meta icon={<LifeBuoy size={12} />}>{e.recovery_email}</Meta>}
                  </div>
                </div>

                {/* Security indicators (secrets hidden — open to reveal) */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} className="email-sec-pills">
                  <SecPill ok={hasPw} okIcon={<Lock size={12} />} label={hasPw ? 'Password' : 'No pwd'} />
                  <SecPill ok={hasAuth} okIcon={<ShieldCheck size={12} />} label={hasAuth ? '2FA' : 'No 2FA'} purple />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={(ev) => ev.stopPropagation()}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.8rem' }}
                    onClick={() => setDetail(e)}
                    title="View everything"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '7px 10px' }}
                    onClick={() => openEdit(e)}
                    title={e.source === 'account' ? 'Edit & save to vault' : 'Edit'}
                  >
                    <Pencil size={14} />
                  </button>
                  {e.source !== 'account' && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '7px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EmailModal
        open={modal.open}
        mode={modal.mode}
        email={modal.email}
        accounts={accounts}
        companies={companies}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />

      <EmailDetailModal email={detail} onClose={() => setDetail(null)} onEdit={openEdit} />
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: `${color}1a`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function Pill({ tone, icon, children }: { tone: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase',
        color: tone, background: `${tone}1a`, border: `1px solid ${tone}40`,
        padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {icon}
      {children}
    </span>
  );
}

function SecPill({ ok, okIcon, label, purple = false }: { ok: boolean; okIcon: React.ReactNode; label: string; purple?: boolean }) {
  const color = ok ? (purple ? '#a855f7' : '#22c55e') : '#ef4444';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: '0.68rem', fontWeight: 600, color,
        background: `${color}14`, border: `1px solid ${color}33`,
        padding: '4px 9px', borderRadius: 8, whiteSpace: 'nowrap',
      }}
      title={ok ? `${label} saved` : `${label} not saved`}
    >
      {ok ? okIcon : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

function miniBtn(color: string): React.CSSProperties {
  return {
    flexShrink: 0, width: 24, height: 24, borderRadius: 6,
    background: 'transparent', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color,
  };
}
