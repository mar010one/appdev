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
  const activeRate = accounts.length > 0 ? Math.round((activeCount / accounts.length) * 100) : 0;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} onClick={() => setOpenDropdown(null)}>

      {/* Stats */}
      <div className="accounts-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

        <div className="accounts-stat-card" style={{
          background: 'linear-gradient(135deg, rgba(234,179,8,0.13) 0%, rgba(234,179,8,0.04) 100%)',
          border: '1px solid rgba(234,179,8,0.22)',
          borderRadius: '20px', padding: '20px 22px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-24px', right: '-24px', width: '90px', height: '90px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,179,8,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
              background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
            }}><Users size={15} /></div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Total</span>
          </div>
          <div className="accounts-stat-value" style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{accounts.length}</div>
          <div className="accounts-stat-label" style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: '6px' }}>{activeRate}% active rate</div>
        </div>

        <div className="accounts-stat-card" style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '20px', padding: '20px 22px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-24px', right: '-24px', width: '90px', height: '90px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e',
            }}><CheckCircle2 size={15} /></div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Active</span>
          </div>
          <div className="accounts-stat-value" style={{ fontSize: '2.4rem', fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>{activeCount}</div>
          <div className="accounts-stat-label" style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: '6px' }}>developer accounts</div>
        </div>

        <div className="accounts-stat-card" style={{
          background: closedCount > 0
            ? 'linear-gradient(135deg, rgba(239,68,68,0.09) 0%, rgba(239,68,68,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: `1px solid ${closedCount > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: '20px', padding: '20px 22px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
              background: closedCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${closedCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: closedCount > 0 ? '#ef4444' : 'var(--muted)',
            }}><XCircle size={15} /></div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Closed</span>
          </div>
          <div className="accounts-stat-value" style={{ fontSize: '2.4rem', fontWeight: 900, color: closedCount > 0 ? '#ef4444' : 'var(--muted)', lineHeight: 1 }}>{closedCount}</div>
          <div className="accounts-stat-label" style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: '6px' }}>inactive accounts</div>
        </div>

      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="accounts-search" style={{ position: 'relative' }}>
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
              width: '100%', boxSizing: 'border-box',
              padding: '13px 16px 13px 44px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '16px',
              color: 'var(--foreground)',
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(234,179,8,0.45)';
              e.target.style.boxShadow = '0 0 0 3px rgba(234,179,8,0.08)';
              e.target.style.background = 'rgba(255,255,255,0.055)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.09)';
              e.target.style.boxShadow = 'none';
              e.target.style.background = 'rgba(255,255,255,0.04)';
            }}
          />
        </div>

        <div className="accounts-filters" style={{
          display: 'flex', gap: '4px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '4px',
        }}>
          {(['all', 'active', 'closed'] as StatusFilter[]).map(f => {
            const isActive = statusFilter === f;
            const accentMap = { all: 'var(--accent)', active: '#22c55e', closed: '#ef4444' };
            const accent = accentMap[f];
            const label = f === 'all' ? `All  ${accounts.length}` : f === 'active' ? `Active  ${activeCount}` : `Closed  ${closedCount}`;
            return (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                flex: 1, padding: '9px 14px', borderRadius: '10px', border: 'none',
                background: isActive ? accent : 'transparent',
                color: isActive ? (f === 'all' ? '#000' : '#fff') : 'var(--muted)',
                fontSize: '0.79rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'all 0.18s', letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

        <div className="account-list-header" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.6fr 0.7fr 0.95fr 1.6fr',
          padding: '0 20px 0 24px',
          color: 'var(--muted)',
          fontSize: '0.67rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '2px',
        }}>
          <div>Developer</div>
          <div>Contact</div>
          <div>Docs</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {filtered.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '64px 0', gap: '12px',
            color: 'var(--muted)', fontSize: '0.9rem',
            background: 'rgba(255,255,255,0.015)',
            border: '1px dashed rgba(255,255,255,0.07)',
            borderRadius: '20px',
          }}>
            <Search size={30} style={{ opacity: 0.18 }} />
            <span>No accounts match your search.</span>
          </div>
        )}

        {filtered.map(acc => {
          const accentShadow = acc.status === 'active'
            ? 'inset 3px 0 0 0 #22c55e'
            : 'inset 3px 0 0 0 rgba(255,255,255,0.1)';
          const hoverShadow = acc.status === 'active'
            ? 'inset 3px 0 0 0 #22c55e, 0 8px 32px -10px rgba(0,0,0,0.5)'
            : 'inset 3px 0 0 0 rgba(255,255,255,0.1), 0 8px 32px -10px rgba(0,0,0,0.5)';
          return (
          <div
            key={acc.id}
            className="account-list-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.6fr 0.7fr 0.95fr 1.6fr',
              alignItems: 'center',
              padding: '15px 20px 15px 24px',
              gap: '12px',
              background: acc.status === 'closed'
                ? 'rgba(255,255,255,0.018)'
                : 'rgba(255,255,255,0.04)',
              border: '1px solid',
              borderColor: acc.status === 'closed' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.085)',
              borderRadius: '18px',
              opacity: acc.status === 'closed' ? 0.62 : 1,
              boxShadow: accentShadow,
              transition: 'background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              if (acc.status !== 'closed') {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.14)';
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.058)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = hoverShadow;
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = acc.status === 'closed' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.085)';
              (e.currentTarget as HTMLDivElement).style.background = acc.status === 'closed' ? 'rgba(255,255,255,0.018)' : 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLDivElement).style.transform = 'none';
              (e.currentTarget as HTMLDivElement).style.boxShadow = accentShadow;
            }}
          >

            {/* Developer */}
            <Link href={`/accounts/${acc.id}`} className="account-main" style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              color: 'inherit', textDecoration: 'none', minWidth: 0,
            }}>
              <div className="account-avatar" style={{
                width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1.1rem',
                background: acc.type === 'google_play'
                  ? 'linear-gradient(135deg, rgba(66,133,244,0.35) 0%, rgba(66,133,244,0.12) 100%)'
                  : 'linear-gradient(135deg, rgba(234,179,8,0.22) 0%, rgba(234,179,8,0.08) 100%)',
                color: acc.type === 'google_play' ? '#60a5fa' : 'var(--accent)',
                border: `1px solid ${acc.type === 'google_play' ? 'rgba(66,133,244,0.42)' : 'rgba(234,179,8,0.32)'}`,
                boxShadow: acc.type === 'google_play'
                  ? '0 0 0 4px rgba(66,133,244,0.06)'
                  : '0 0 0 4px rgba(234,179,8,0.05)',
              }}>
                {acc.developer_name?.charAt(0)?.toUpperCase() || (acc.type === 'google_play' ? 'G' : 'A')}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {acc.developer_name || 'Unnamed'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--muted)', marginTop: '3px' }}>
                  <Hash size={10} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{acc.developer_id || '—'}</span>
                  {typeof acc.app_count === 'number' && (
                    <>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <Smartphone size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{acc.app_count}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>

            {/* Contact */}
            <div className="account-contact" style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', minWidth: 0 }}>
                <Mail size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</span>
              </div>
              {acc.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem' }}>
                  <Globe size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <a href={acc.website} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}
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
                : <span style={{
                    fontSize: '0.7rem', color: 'var(--muted)',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '3px 8px', borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>None</span>
              }
              {acc.documents?.length > 2 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', alignSelf: 'center' }}>+{acc.documents.length - 2}</span>
              )}
            </div>

            {/* Status dropdown */}
            <div className="account-status-cell" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setOpenDropdown(openDropdown === acc.id ? null : acc.id)}
                disabled={updatingId === acc.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 11px', borderRadius: '20px',
                  fontSize: '0.73rem', fontWeight: 700,
                  cursor: updatingId === acc.id ? 'wait' : 'pointer',
                  border: `1px solid ${acc.status === 'active' ? 'rgba(34,197,94,0.32)' : 'rgba(239,68,68,0.32)'}`,
                  background: acc.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.09)',
                  color: acc.status === 'active' ? '#22c55e' : '#ef4444',
                  fontFamily: 'inherit', transition: 'all 0.18s',
                  opacity: updatingId === acc.id ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {acc.status === 'active' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                {acc.status === 'active' ? 'Active' : 'Closed'}
                <ChevronDown size={10} style={{
                  opacity: 0.55,
                  transform: openDropdown === acc.id ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s',
                }} />
              </button>

              {openDropdown === acc.id && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                  background: '#0d0d14',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px', overflow: 'hidden',
                  minWidth: '148px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                  animation: 'fadeInDown 0.14s ease',
                }}>
                  {[
                    { value: 'active', label: 'Active', icon: <ShieldCheck size={13} />, color: '#22c55e' },
                    { value: 'closed', label: 'Closed', icon: <ShieldAlert size={13} />, color: '#ef4444' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleStatusChange(acc.id, opt.value)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '11px 16px',
                      background: acc.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: 'none', color: opt.color,
                      fontSize: '0.82rem', fontWeight: acc.status === opt.value ? 700 : 500,
                      fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', transition: 'background 0.14s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = acc.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent')}
                    >
                      {opt.icon}{opt.label}
                      {acc.status === opt.value && <span style={{ marginLeft: 'auto', fontSize: '0.63rem', opacity: 0.45 }}>current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="account-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
              <AccountShareLinkButton accountId={acc.id} shareActive={!!acc.share_active} />
              <EditAccountModal account={acc} onUpdate={handleAccountUpdate} />
              <button
                onClick={() => handleDelete(acc.id, acc.developer_name)}
                style={{
                  width: '36px', height: '36px', padding: 0, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: '10px', color: '#ef4444',
                  cursor: 'pointer', transition: 'all 0.18s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.42)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.18)';
                }}
              >
                <Trash2 size={15} />
              </button>
              <Link
                href={`/accounts/${acc.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '8px 14px', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #d97706 100%)',
                  color: '#000', borderRadius: '10px',
                  fontSize: '0.78rem', fontWeight: 800,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'all 0.18s',
                  boxShadow: '0 2px 12px rgba(234,179,8,0.28)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(234,179,8,0.45)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 12px rgba(234,179,8,0.28)';
                }}
              >
                <Smartphone size={13} /> Apps
              </Link>
            </div>
          </div>
          );
        })}
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
