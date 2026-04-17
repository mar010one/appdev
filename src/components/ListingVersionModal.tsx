'use client';

import { useState } from 'react';
import ModalPortal from './ModalPortal';
import {
  X, Copy, Check, Download, ExternalLink, Smartphone,
  Sparkles, Globe, Mail, ShieldCheck, Hash, FileDown,
  AlignLeft, History, Clock,
} from 'lucide-react';

type ListingVersion = {
  id: number;
  app_id: number;
  version_label: string;
  name?: string;
  short_description?: string;
  long_description?: string;
  icon_small_path?: string;
  icon_large_path?: string;
  store_url?: string;
  contact_email?: string;
  privacy_url?: string;
  website_url?: string;
  release_file_path?: string | null;
  screenshots?: string[];
  created_at?: string;
};

function fmtDate(d?: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fileName(p?: string | null) {
  if (!p) return 'file';
  return p.split('/').pop() || 'file';
}

function CopyField({ label, value, multiline, icon }: { label: string; value?: string; multiline?: boolean; icon?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const display = value?.trim() ? value : '—';
  const canCopy = !!value?.trim();

  async function copy() {
    if (!canCopy) return;
    try { await navigator.clipboard.writeText(value!); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="info-field">
      <div className="info-field-head">
        <span className="info-field-label">{icon}{label}</span>
        <button
          type="button"
          className={`info-mini-btn ${copied ? 'success' : ''}`}
          onClick={copy}
          disabled={!canCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      {multiline
        ? <pre className="info-field-value multiline">{display}</pre>
        : <div className="info-field-value">{display}</div>}
    </div>
  );
}

function ImageCard({ label, src, hint, wide }: { label: string; src?: string | null; hint?: string; wide?: boolean }) {
  if (!src) return null;
  return (
    <div className={`listing-vm-img-card ${wide ? 'wide' : ''}`}>
      <div className="listing-vm-img-thumb">
        <img src={src} alt={label} />
      </div>
      <div className="listing-vm-img-meta">
        <strong>{label}</strong>
        {hint && <span className="text-muted">{hint}</span>}
        <div className="info-field-actions" style={{ marginTop: 6 }}>
          <a href={src} download={fileName(src)} className="info-mini-btn">
            <Download size={14} /> <span>Download</span>
          </a>
          <a href={src} target="_blank" rel="noreferrer" className="info-mini-btn">
            <ExternalLink size={14} /> <span>Open</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ListingVersionModal({
  version,
  isLatest,
}: {
  version: ListingVersion;
  isLatest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  const lines = [
    `App Name: ${version.name || ''}`,
    `Short Description: ${version.short_description || ''}`,
    '',
    'Long Description:',
    `${version.long_description || ''}`,
    '',
    `Contact Email: ${version.contact_email || ''}`,
    `Website: ${version.website_url || ''}`,
    `Privacy Policy: ${version.privacy_url || ''}`,
    `Store URL: ${version.store_url || ''}`,
  ];

  async function copyAll() {
    try { await navigator.clipboard.writeText(lines.join('\n')); } catch { }
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1800);
  }

  const screenshots = version.screenshots || [];

  return (
    <>
      <button
        type="button"
        className="info-mini-btn listing-vm-open-btn"
        onClick={() => setOpen(true)}
        title="View full details for this version"
      >
        <History size={14} />
        <span>View full page</span>
      </button>

      <ModalPortal open={open}>
        <div className="modal-overlay fullscreen" onClick={() => setOpen(false)}>
          <div
            className={`modal-content fullscreen-content listing-vm-modal ${isLatest ? 'is-latest-border' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header listing-vm-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {version.icon_small_path
                  ? <img src={version.icon_small_path} alt="" className="listing-vm-hero-icon" />
                  : <div className="listing-vm-hero-icon placeholder"><Smartphone size={28} /></div>}
                <div>
                  <div className="info-eyebrow">
                    <History size={12} />
                    STORE LISTING — {version.version_label.toUpperCase()}
                    {isLatest && <span className="listing-vm-latest-badge">LATEST</span>}
                  </div>
                  <h2 style={{ margin: 0 }}>{version.name || '—'}</h2>
                  <p className="text-muted" style={{ margin: 0 }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {fmtDate(version.created_at)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`btn btn-primary ${allCopied ? 'success' : ''}`}
                  onClick={copyAll}
                >
                  {allCopied ? <Check size={16} /> : <Copy size={16} />}
                  {allCopied ? 'All info copied' : 'Copy all info'}
                </button>
                <button className="modal-close" onClick={() => setOpen(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ paddingTop: 0 }}>
              <div className="info-grid">

                {/* LEFT: text */}
                <section className="glass-card info-section">
                  <div className="info-section-head">
                    <h2>Listing Content</h2>
                    <span className="text-muted">Click any field to copy</span>
                  </div>

                  <CopyField label="App Name" value={version.name} icon={<Smartphone size={14} />} />
                  <CopyField label="Short Description" value={version.short_description} icon={<Sparkles size={14} />} />
                  <CopyField label="Long Description" value={version.long_description} multiline icon={<AlignLeft size={14} />} />

                  <div className="info-section-head" style={{ marginTop: 24 }}>
                    <h2>Developer &amp; Contact</h2>
                  </div>
                  <CopyField label="Contact Email" value={version.contact_email} icon={<Mail size={14} />} />
                  <CopyField label="Website" value={version.website_url} icon={<Globe size={14} />} />
                  <CopyField label="Privacy Policy URL" value={version.privacy_url} icon={<ShieldCheck size={14} />} />
                  {version.store_url && (
                    <CopyField label="Store URL" value={version.store_url} icon={<ExternalLink size={14} />} />
                  )}

                  {/* Binary download if this snapshot was created from a release */}
                  {version.release_file_path && (
                    <div className="listing-vm-aab-row">
                      <div className="info-section-head" style={{ marginTop: 24 }}>
                        <h2><Hash size={16} /> Binary Release</h2>
                      </div>
                      <a
                        href={version.release_file_path}
                        download={fileName(version.release_file_path)}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <FileDown size={16} /> Download AAB / IPA — {fileName(version.release_file_path)}
                      </a>
                    </div>
                  )}
                </section>

                {/* RIGHT: assets */}
                <section className="glass-card info-section">
                  <div className="info-section-head">
                    <h2>Visual Assets</h2>
                    <span className="text-muted">Download for store upload</span>
                  </div>

                  <div className="image-assets-grid">
                    <ImageCard label="Store Icon" src={version.icon_small_path} hint="512×512" />
                    <ImageCard label="Promo Graphic" src={version.icon_large_path} hint="1024×500" wide />
                  </div>

                  {screenshots.length > 0 && (
                    <>
                      <div className="info-section-head" style={{ marginTop: 24 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          Screenshots <span className="text-muted" style={{ fontSize: '0.85rem' }}>({screenshots.length})</span>
                        </h3>
                      </div>
                      <div className="screenshots-info-grid">
                        {screenshots.map((src, i) => (
                          <div key={`${version.id}-${i}`} className="screenshot-info-card">
                            <img src={src} alt={`Screenshot ${i + 1}`} />
                            <div className="screenshot-info-actions">
                              <a href={src} download={fileName(src)} className="info-mini-btn">
                                <Download size={14} />
                              </a>
                              <a href={src} target="_blank" rel="noreferrer" className="info-mini-btn">
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {!version.icon_small_path && !version.icon_large_path && screenshots.length === 0 && (
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 12 }}>No visual assets for this version.</p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
