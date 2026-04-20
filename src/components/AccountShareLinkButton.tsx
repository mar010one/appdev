'use client';

import { useEffect, useState } from 'react';
import { Share2, Copy, Check, ExternalLink, X } from 'lucide-react';
import ModalPortal from './ModalPortal';

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

export default function AccountShareLinkButton({ accountId }: { accountId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/share/account/${accountId}`);
    }
  }, [accountId]);

  async function copyNow() {
    if (!shareUrl) return;
    const ok = await copyText(shareUrl);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
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
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)',
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
                  disabled={!shareUrl}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <a
                  href={shareUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 18px', fontSize: '0.85rem', borderRadius: '12px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <ExternalLink size={15} /> Open
                </a>
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Anyone with this link can view the account info, credentials, and download
                the developer + company documents. Share it only with your registration team.
              </p>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
