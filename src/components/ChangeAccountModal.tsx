'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Repeat, X, ChevronLeft, Save, Loader2, Mail, Globe, ShieldCheck,
  ArrowRight, AlertTriangle,
} from 'lucide-react';
import { changeAppAccount } from '@/lib/actions';
import { deriveDefaultPrivacyUrl } from '@/lib/derive';
import ModalPortal from './ModalPortal';

type Account = {
  id: number;
  type?: string;
  developer_name?: string;
  developer_id?: string;
  email?: string;
  website?: string;
};

type AppLite = {
  id: number;
  account_id?: number;
  account_developer_name?: string;
  account_email?: string;
  contact_email?: string;
  website_url?: string;
  privacy_url?: string;
};

const sectionCard: React.CSSProperties = {
  padding: '18px 20px',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
};

function accountLabel(a?: Account) {
  if (!a) return '—';
  const who = a.developer_name || a.email || `Account #${a.id}`;
  const store = a.type === 'apple_store' ? 'Apple' : a.type === 'google_play' ? 'Google' : null;
  return store ? `${who} (${store})` : who;
}

/** Row showing a field's current value changing to a new one. */
function DiffRow({
  icon, label, before, after, changes,
}: { icon: React.ReactNode; label: string; before?: string; after: string; changes: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
      <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
          {label}
        </div>
        {changes ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textDecoration: 'line-through', wordBreak: 'break-all' }}>
              {before || '—'}
            </span>
            <ArrowRight size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600, wordBreak: 'break-all' }}>
              {after || '—'}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--foreground)', wordBreak: 'break-all' }}>{after || '—'}</div>
        )}
      </div>
    </div>
  );
}

export default function ChangeAccountModal({ app, accounts }: { app: AppLite; accounts: Account[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [syncInfo, setSyncInfo] = useState(true);

  const defaultId =
    app.account_id != null ? String(app.account_id)
    : accounts[0]?.id != null ? String(accounts[0].id)
    : '';
  const [selectedId, setSelectedId] = useState<string>(defaultId);

  const selected = useMemo(
    () => accounts.find(a => String(a.id) === String(selectedId)),
    [accounts, selectedId],
  );
  const current = useMemo(
    () => accounts.find(a => String(a.id) === String(app.account_id)),
    [accounts, app.account_id],
  );

  const isSameAccount = app.account_id != null && String(app.account_id) === String(selectedId);

  const nextEmail = selected?.email || '';
  const nextWebsite = selected?.website || '';
  const nextPrivacy = deriveDefaultPrivacyUrl(selected?.website);

  const emailChanges = (app.contact_email || '') !== nextEmail;
  const websiteChanges = (app.website_url || '') !== nextWebsite;
  const privacyChanges = (app.privacy_url || '') !== nextPrivacy;

  function open() {
    setSelectedId(defaultId);
    setSyncInfo(true);
    setIsOpen(true);
  }

  async function handleConfirm() {
    if (!selectedId) { alert('Please choose a developer account.'); return; }
    // Nothing to do: same account and not re-syncing contact details.
    if (isSameAccount && !syncInfo) { setIsOpen(false); return; }

    setIsPending(true);
    const res = await changeAppAccount(app.id, Number(selectedId), syncInfo);
    setIsPending(false);

    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert(res.error || 'Could not change the developer account.');
    }
  }

  const noAccounts = accounts.length === 0;

  return (
    <>
      <button type="button" onClick={open} className="btn btn-secondary">
        <Repeat size={16} /> Change account
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)} style={{ padding: '32px 20px' }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(160deg, #111118 0%, #0d0d12 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: 'calc(100vh - 64px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 40px 120px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(234,179,8,0.05)',
              animation: 'modalScale 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '22px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, transparent 55%)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(234,179,8,0.08))',
                  border: '1px solid rgba(234,179,8,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', flexShrink: 0,
                }}>
                  <Repeat size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                    Change Developer Account
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '3px 0 0' }}>
                    Move this app to another account and re-sync its contact details.
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {noAccounts ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
                  No developer accounts exist yet. Create one in the Client Accounts page first.
                </p>
              ) : (
                <>
                  {/* Currently published under */}
                  <div style={sectionCard}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Currently published under
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {app.account_developer_name || current?.developer_name || app.account_email || accountLabel(current)}
                    </div>
                    {(current?.email || app.account_email) && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                        {current?.email || app.account_email}
                      </div>
                    )}
                  </div>

                  {/* Pick the new account */}
                  <div className="input-field">
                    <label>Move to developer account</label>
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {accountLabel(a)}{String(a.id) === String(app.account_id) ? ' — current' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sync toggle */}
                  <label className="manage-toggle">
                    <input
                      type="checkbox"
                      checked={syncInfo}
                      onChange={(e) => setSyncInfo(e.target.checked)}
                    />
                    <div>
                      <strong>Also update this app's contact email, website &amp; privacy URL</strong>
                      <small className="text-muted">
                        Pulls them from the selected account, the same way they're filled when an app is created.
                        Untick to move the app but keep its current contact details.
                      </small>
                    </div>
                  </label>

                  {/* Preview of what will be applied */}
                  {syncInfo && (
                    <div style={{ ...sectionCard, paddingTop: 10, paddingBottom: 10 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>
                        Listing details after the change
                      </div>
                      <DiffRow icon={<Mail size={15} />} label="Contact email" before={app.contact_email} after={nextEmail} changes={emailChanges} />
                      <DiffRow icon={<Globe size={15} />} label="Website" before={app.website_url} after={nextWebsite} changes={websiteChanges} />
                      <DiffRow icon={<ShieldCheck size={15} />} label="Privacy URL" before={app.privacy_url} after={nextPrivacy} changes={privacyChanges} />

                      {(emailChanges || websiteChanges || privacyChanges) && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                          padding: '9px 12px', borderRadius: 10,
                          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)',
                        }}>
                          <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: '#fcd34d' }}>
                            The struck-through values will be overwritten.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(10,10,16,0.96)',
              flexShrink: 0,
            }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                <ChevronLeft size={16} /> Cancel
              </button>
              <button
                type="button"
                className="btn btn-accent btn-glow"
                disabled={isPending || noAccounts}
                onClick={handleConfirm}
                style={{ gap: 8 }}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
