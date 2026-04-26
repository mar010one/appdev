'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail, Globe, Search, ShieldCheck, ShieldAlert,
  Trash2, Smartphone, Hash, ChevronDown,
  Users, CheckCircle2, XCircle,
} from 'lucide-react';
import PreviewModal from '@/components/PreviewModal';
import EditAccountModal from './EditAccountModal';
import AccountShareLinkButton from './AccountShareLinkButton';
import { deleteAccount, updateAccountStatus } from '@/lib/actions';

type StatusFilter = 'all' | 'active' | 'closed';

export default function AccountList({ initialAccounts }: { initialAccounts: any[] }) {
  const [accounts, setAccounts] = useState<any[]>(initialAccounts);
  useEffect(() => { setAccounts(initialAccounts); }, [initialAccounts]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const closedCount = accounts.filter(a => a.status === 'closed').length;

  const filtered = accounts.filter(acc => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      acc.developer_name?.toLowerCase().includes(q) ||
      acc.email?.toLowerCase().includes(q) ||
      acc.developer_id?.toLowerCase().includes(q);
    const matchFilter = statusFilter === 'all' || acc.status === statusFilter;
    return matchSearch && matchFilter;
  });

  function handleAccountUpdate(updated: any) {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete ${name}? All associated documents will also be removed.`)) return;
    const result = await deleteAccount(id);
    if (!result.success) return alert(result.error);
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  async function handleStatusChange(id: number, newStatus: string) {
    const prev = accounts.find(a => a.id === id)?.status;
    setOpenDropdown(null);
    setUpdatingId(id);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    const result = await updateAccountStatus(id, newStatus);
    if (!result.success) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: prev } : a));
      alert(result.error);
    }
    setUpdatingId(null);
  }

  const statsData = [
    { label: 'Total', value: accounts.length, icon: <Users size={16} />, color: 'var(--accent)', glow: 'rgba(234,179,8,0.15)' },
    { label: 'Active', value: activeCount, icon: <CheckCircle2 size={16} />, color: '#22c55e', glow: 'rgba(34,197,94,0.1)' },
    { label: 'Closed', value: closedCount, icon: <XCircle size={16} />, color: '#ef4444', glow: 'rgba(239,68,68,0.08)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} onClick={() => setOpenDropdown(null)}>

      {/* Stats bar */}
      <div className="accounts-stats" style={{ display: 'flex', gap: '14px' }}>
        {statsData.map(s => (
          <div key={s.label} className="accounts-stat-card" style={{
            flex: 1,
            background: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px',
            padding: '20px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: `0 0 30px ${s.glow}`,
          }}>
            <div className="accounts-stat-icon" style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: `${s.glow}`,
              border: `1px solid ${s.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.color, flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div className="accounts-stat-body">
              <div className="accounts-stat-value" style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: s.color }}>{s.value}</div>
              <div className="accounts-stat-label" style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="accounts-toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div className="accounts-search" style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: '16px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search by name, email, or developer ID…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '44px',
              padding: '11px 16px 11px 44px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '14px',
              color: 'var(--foreground)',
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(234,179,8,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
          />
        </div>

        <div className="accounts-filters" style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'active', 'closed'] as StatusFilter[]).map(f => {
            const active = statusFilter === f;
            const bg = f === 'all' ? 'var(--accent)' : f === 'active' ? '#22c55e' : '#ef4444';
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: `1px solid ${active ? bg : 'rgba(255,255,255,0.08)'}`,
                  background: active ? bg : 'rgba(255,255,255,0.04)',
                  color: active ? (f === 'all' ? '#000' : '#fff') : 'var(--muted)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >{f}</button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Column headers */}
        <div className="account-list-header" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr 0.8fr 1fr 1.5fr',
          padding: '0 20px',
          color: 'var(--muted)',
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          marginBottom: '2px',
        }}>
          <div>Developer Client</div>
          <div>Contact Info</div>
          <div>Docs</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '64px 0',
            color: 'var(--muted)', fontSize: '0.9rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.07)',
            borderRadius: '18px',
          }}>
            No accounts match your search.
          </div>
        )}

        {filtered.map(acc => (
          <div
            key={acc.id}
            className="account-list-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 0.8fr 1fr 1.5fr',
              alignItems: 'center',
              padding: '16px 20px',
              gap: '12px',
              background: acc.status === 'closed'
                ? 'rgba(255,255,255,0.015)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
              border: '1px solid',
              borderColor: acc.status === 'closed' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)',
              borderRadius: '16px',
              opacity: acc.status === 'closed' ? 0.65 : 1,
              transition: 'opacity 0.25s, border-color 0.25s, box-shadow 0.25s',
            }}
            onMouseEnter={e => {
              if (acc.status !== 'closed') {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px -10px rgba(0,0,0,0.5)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = acc.status === 'closed' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            {/* Developer Client */}
            <Link href={`/accounts/${acc.id}`} className="account-main" style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              color: 'inherit', textDecoration: 'none', minWidth: 0,
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem',
                background: acc.type === 'google_play' ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.08)',
                color: acc.type === 'google_play' ? '#4285f4' : '#e2e8f0',
                border: `1px solid ${acc.type === 'google_play' ? 'rgba(66,133,244,0.25)' : 'rgba(255,255,255,0.12)'}`,
              }}>
                {acc.type === 'google_play' ? 'G' : 'A'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {acc.developer_name || 'Unnamed'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: 'var(--muted)', marginTop: '2px', flexWrap: 'nowrap' }}>
                  <Hash size={10} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.developer_id || '—'}</span>
                  {typeof acc.app_count === 'number' && (
                    <>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <Smartphone size={10} />
                      <span>{acc.app_count} app{acc.app_count !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>

            {/* Contact */}
            <div className="account-contact" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', minWidth: 0 }}>
                <Mail size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</span>
              </div>
              {acc.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem' }}>
                  <Globe size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <a href={acc.website} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onClick={e => e.stopPropagation()}>Website ↗</a>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="account-docs" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {acc.documents?.length > 0
                ? acc.documents.slice(0, 2).map((doc: any, i: number) => (
                    <PreviewModal
                      key={doc.id}
                      url={doc.file_path}
                      name={`${acc.developer_name} - Doc ${i + 1}`}
                      label={`D${i + 1}`}
                    />
                  ))
                : <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>None</span>
              }
              {acc.documents?.length > 2 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', alignSelf: 'center' }}>+{acc.documents.length - 2}</span>
              )}
            </div>

            {/* Status — inline dropdown */}
            <div className="account-status-cell" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setOpenDropdown(openDropdown === acc.id ? null : acc.id)}
                disabled={updatingId === acc.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 11px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: updatingId === acc.id ? 'wait' : 'pointer',
                  border: `1px solid ${acc.status === 'active' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                  background: acc.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: acc.status === 'active' ? '#22c55e' : '#ef4444',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  opacity: updatingId === acc.id ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {acc.status === 'active' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                {acc.status === 'active' ? 'Active' : 'Closed'}
                <ChevronDown
                  size={11}
                  style={{
                    opacity: 0.6,
                    transform: openDropdown === acc.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {openDropdown === acc.id && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 50,
                  background: '#0f0f16',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  minWidth: '140px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                  animation: 'fadeInDown 0.15s ease',
                }}>
                  {[
                    { value: 'active', label: 'Active', icon: <ShieldCheck size={13} />, color: '#22c55e' },
                    { value: 'closed', label: 'Closed', icon: <ShieldAlert size={13} />, color: '#ef4444' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(acc.id, opt.value)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '11px 16px',
                        background: acc.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                        border: 'none',
                        color: opt.color,
                        fontSize: '0.82rem',
                        fontWeight: acc.status === opt.value ? 700 : 500,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = acc.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent')}
                    >
                      {opt.icon}
                      {opt.label}
                      {acc.status === opt.value && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.6 }}>current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="account-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px', alignItems: 'center' }}>
              <AccountShareLinkButton accountId={acc.id} shareActive={!!acc.share_active} />
              <EditAccountModal account={acc} onUpdate={handleAccountUpdate} />
              <button
                onClick={() => handleDelete(acc.id, acc.developer_name)}
                style={{
                  width: '36px', height: '36px', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)';
                }}
              >
                <Trash2 size={15} />
              </button>
              <Link
                href={`/accounts/${acc.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '8px 14px',
                  background: 'var(--accent)',
                  color: '#000',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 12px rgba(234,179,8,0.25)',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.03)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(234,179,8,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 12px rgba(234,179,8,0.25)';
                }}
              >
                <Smartphone size={13} /> Apps
              </Link>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
