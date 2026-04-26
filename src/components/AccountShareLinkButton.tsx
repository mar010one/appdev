'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Copy, Check, ExternalLink, X, Lock } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { setAccountShareActive, getAccountShareIndex } from '@/lib/actions';

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return ok;
}

export default function AccountShareLinkButton({
  accountId,
  shareActive: initialShareActive = false,
}: {
  accountId: number;
  shareActive?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shareActive, setShareActive] = useState<boolean>(!!initialShareActive);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setShareActive(!!initialShareActive);
  }, [initialShareActive]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    (async () => {
      const idx = await getAccountShareIndex(accountId);
      if (cancelled) return;
      const slug = idx ?? accountId;
      setShareUrl(`${window.location.origin}/s${slug}`);
    })();
    return () => { cancelled = true; };
  }, [accountId]);

  async function copyNow() {
    if (!shareUrl || !shareActive) return;
    const ok = await copyText(shareUrl);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  }

  async function toggleShare() {
    if (toggling) return;
    const next = !shareActive;
    setToggling(true);
    setShareActive(next);
    const result = await setAccountShareActive(accountId, next);
    if (result.error) {
      setShareActive(!next);
      alert(result.error);
    } else if (result.data) {
      // Trust the server's view of share_active so the toggle can't lie about
      // a save that didn't actually persist.
      setShareActive(!!result.data.share_active);
      router.refresh();
    }
    setToggling(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary"
        style={{ padding: '9px 16px', fontSize: '0.85rem', borderRadius: '12px' }}
      >
        <Share2 size={15} />
        Share Link
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', borderRadius: '20px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Share2 size={17} color="var(--accent)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                    Share with registration team
                  </h2>
                  <p className="text-muted" style={{ fontSize: '0.72rem', margin: '1px 0 0' }}>
                    Read-only link with all fields + company documents.
                  </p>
                </div>
              </div>
              <button className="modal-close" style={{ width: '32px', height: '32px' }} onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '18px 22px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Active / inactive toggle */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '12px',
                  background: shareActive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${shareActive ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.22)'}`,
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                  background: shareActive ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: shareActive ? '#22c55e' : '#ef4444',
                }}>
                  {shareActive ? <Share2 size={15} /> : <Lock size={15} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: shareActive ? '#22c55e' : '#ef4444' }}>
                    {shareActive ? 'Sharing is active' : 'Sharing is off'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                    {shareActive
                      ? 'Anyone with the link can view credentials and VCC.'
                      : 'Link is dead — visitors are sent to the login page.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleShare}
                  disabled={toggling}
                  aria-pressed={shareActive}
                  title={shareActive ? 'Deactivate share link' : 'Activate share link'}
                  style={{
                    position: 'relative',
                    width: '46px', height: '26px', borderRadius: '999px',
                    background: shareActive ? '#22c55e' : 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: toggling ? 'wait' : 'pointer',
                    transition: 'background 0.18s',
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: shareActive ? '22px' : '2px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.18s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }} />
                </button>
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)',
                  opacity: shareActive ? 1 : 0.55,
                }}
              >
                <code
                  style={{
                    flex: 1, fontSize: '0.82rem', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onClick={e => {
                    const range = document.createRange();
                    range.selectNodeContents(e.currentTarget);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }}
                >
                  {shareUrl || '…'}
                </code>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={copyNow}
                  className="btn btn-accent btn-glow"
                  style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '12px', flex: 1 }}
                  disabled={!shareUrl || !shareActive}
                  title={shareActive ? 'Copy link' : 'Activate sharing first'}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <a
                  href={shareActive ? (shareUrl || '#') : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  aria-disabled={!shareActive}
                  onClick={(e) => { if (!shareActive) e.preventDefault(); }}
                  style={{
                    padding: '10px 18px', fontSize: '0.85rem', borderRadius: '12px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    opacity: shareActive ? 1 : 0.5,
                    pointerEvents: shareActive ? 'auto' : 'none',
                  }}
                >
                  <ExternalLink size={15} /> Open
                </a>
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Default is off. Activate only while the registration team needs the link, then turn it back off — visitors will be redirected to the login page.
              </p>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
