'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Smartphone, ArrowLeft, Copy, Check, Download,
  Mail, Globe, ShieldCheck, ExternalLink, Hash,
  Sparkles, FileImage, ImageIcon as Image, ImagesIcon,
  PartyPopper, Share2, Link2, History, RefreshCw, FileDown,
  Package, Tag,
} from 'lucide-react';
import AppStatusMenu, { statusIcon, statusLabel } from './AppStatusMenu';
import ListingVersionModal from './ListingVersionModal';

type App = {
  id: number;
  name: string;
  package_name?: string;
  category?: string;
  short_description?: string;
  long_description?: string;
  icon_small_path?: string;
  icon_large_path?: string;
  store_url?: string;
  contact_email?: string;
  privacy_url?: string;
  website_url?: string;
  status?: string;
  created_at?: string;
  account_id?: number;
  account_email?: string;
  account_developer_name?: string;
  account_developer_id?: string;
  account_website?: string;
  account_phone?: string;
  account_type?: string;
  screenshots?: Array<{ id: number; file_path: string }>;
};

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

type CopyableProps = {
  label: string;
  value?: string;
  multiline?: boolean;
  icon?: React.ReactNode;
  href?: string;
};

function CopyableField({ label, value, multiline, icon, href }: CopyableProps) {
  const [copied, setCopied] = useState(false);
  const display = value && value.length > 0 ? value : '—';
  const canCopy = !!value;

  async function copyNow() {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="info-field">
      <div className="info-field-head">
        <span className="info-field-label">{icon}{label}</span>
        <div className="info-field-actions">
          {href && value && (
            <a href={href} target="_blank" rel="noreferrer" className="info-mini-btn" title="Open">
              <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            className={`info-mini-btn ${copied ? 'success' : ''}`}
            onClick={copyNow}
            disabled={!canCopy}
            title={canCopy ? 'Copy to clipboard' : 'Nothing to copy'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      {multiline ? (
        <pre className="info-field-value multiline">{display}</pre>
      ) : (
        <div className="info-field-value">{display}</div>
      )}
    </div>
  );
}

function fileNameFromPath(p?: string) {
  if (!p) return 'image';
  const parts = p.split('/');
  return parts[parts.length - 1] || 'image';
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  // Fallback for HTTP or denied permissions
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return ok;
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // CORS fallback: open in new tab so user can save manually
    window.open(url, '_blank', 'noopener');
  }
}

function ImageAsset({ label, src, hint }: { label: string; src?: string | null; hint?: string }) {
  if (!src) {
    return (
      <div className="image-asset empty">
        <div className="image-asset-thumb placeholder">
          <FileImage size={32} />
        </div>
        <div className="image-asset-meta">
          <strong>{label}</strong>
          <span>Not uploaded</span>
        </div>
      </div>
    );
  }
  return (
    <div className="image-asset">
      <div className="image-asset-thumb">
        <img src={src} alt={label} />
      </div>
      <div className="image-asset-meta">
        <strong>{label}</strong>
        {hint && <span>{hint}</span>}
        <div className="image-asset-actions">
          <button onClick={() => downloadFile(src, fileNameFromPath(src))} className="info-mini-btn">
            <Download size={14} /> <span>Download</span>
          </button>
          <a href={src} target="_blank" rel="noreferrer" className="info-mini-btn">
            <ExternalLink size={14} /> <span>Open</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function diffFields(curr: ListingVersion, prev: ListingVersion | undefined): string[] {
  if (!prev) return ['Initial listing'];
  const changes: string[] = [];
  if ((curr.name || '') !== (prev.name || '')) changes.push('Name');
  if ((curr.short_description || '') !== (prev.short_description || '')) changes.push('Short description');
  if ((curr.long_description || '') !== (prev.long_description || '')) changes.push('Long description');
  if ((curr.icon_small_path || '') !== (prev.icon_small_path || '')) changes.push('Icon');
  if ((curr.icon_large_path || '') !== (prev.icon_large_path || '')) changes.push('Promo graphic');
  if ((curr.store_url || '') !== (prev.store_url || '')) changes.push('Store URL');
  if ((curr.contact_email || '') !== (prev.contact_email || '')) changes.push('Contact email');
  if ((curr.privacy_url || '') !== (prev.privacy_url || '')) changes.push('Privacy URL');
  if ((curr.website_url || '') !== (prev.website_url || '')) changes.push('Website');
  const prevShots = prev.screenshots || [];
  const currShots = curr.screenshots || [];
  const sameShots =
    prevShots.length === currShots.length && prevShots.every((s, i) => s === currShots[i]);
  if (!sameShots) changes.push(`Screenshots (${currShots.length})`);
  if (!changes.length) changes.push('No field changes');
  return changes;
}

export default function AppInfoView({
  app,
  listingVersions = [],
  variant = 'owner',
}: {
  app: App;
  listingVersions?: ListingVersion[];
  /**
   * 'owner' = internal view at /apps/[id]/info (shows owner-only actions and back-to-dashboard nav).
   * 'share' = public share view at /share/[id] (no internal nav, shown to outside teams).
   */
  variant?: 'owner' | 'share';
}) {
  const [bundleCopied, setBundleCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  const versionsNewestFirst = listingVersions;

  // Latest listing version that has an AAB/IPA attached
  const latestAab = useMemo(
    () => versionsNewestFirst.find(v => !!v.release_file_path) || null,
    [versionsNewestFirst],
  );

  const versionChanges = useMemo(() => {
    const map = new Map<number, string[]>();
    for (let i = 0; i < versionsNewestFirst.length; i++) {
      const curr = versionsNewestFirst[i];
      const prev = versionsNewestFirst[i + 1];
      map.set(curr.id, diffFields(curr, prev));
    }
    return map;
  }, [versionsNewestFirst]);

  // Build the absolute share URL on the client so it works behind any host.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/share/${app.id}`);
    }
  }, [app.id]);

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {}
  }

  const lines: string[] = [
    `App Name: ${app.name || ''}`,
    `Package Name: ${app.package_name || ''}`,
    `Category: ${app.category || ''}`,
    `Short Description: ${app.short_description || ''}`,
    '',
    'Long Description:',
    `${app.long_description || ''}`,
    '',
    `Developer: ${app.account_developer_name || ''}`,
    `Developer ID: ${app.account_developer_id || ''}`,
    `Contact Email: ${app.contact_email || app.account_email || ''}`,
    `Website: ${app.website_url || app.account_website || ''}`,
    `Privacy Policy: ${app.privacy_url || ''}`,
    `Store URL: ${app.store_url || ''}`,
  ];
  const bundleText = lines.join('\n');

  async function copyAll() {
    const ok = await copyText(bundleText);
    if (ok) {
      setBundleCopied(true);
      setTimeout(() => setBundleCopied(false), 1800);
    }
  }

  const screenshots = app.screenshots || [];

  const isShare = variant === 'share';

  return (
    <div className="container animate-in info-page">
      {!isShare && (
        <Link href="/apps" className="back-link">
          <ArrowLeft size={16} />
          Back to Applications
        </Link>
      )}

      {/* Hero */}
      <header className="info-hero glass-card">
        <div className="info-hero-left">
          {app.icon_small_path ? (
            <img src={app.icon_small_path} alt={app.name} className="info-hero-icon" />
          ) : (
            <div className="info-hero-icon placeholder"><Smartphone size={36} /></div>
          )}
          <div>
            <div className="info-eyebrow">
              <Sparkles size={12} />
              {isShare ? 'STORE LISTING PACKAGE' : 'APP REGISTERED'}
              {!isShare && <PartyPopper size={12} style={{ marginLeft: 6 }} />}
            </div>
            <h1 className="info-title">{app.name}</h1>
            <p className="text-muted info-sub">
              {app.short_description || 'No tagline'}
            </p>
            <div className="info-hero-meta">
              {isShare ? (
                <span className={`status-pill status-${app.status || 'draft'}`}>
                  {statusIcon(app.status || 'draft')}
                  {statusLabel(app.status || 'draft')}
                </span>
              ) : (
                <AppStatusMenu appId={app.id} status={app.status || 'draft'} />
              )}
              <span className={`account-badge ${app.account_type || ''}`}>
                {app.account_developer_name || app.account_email}
              </span>
              {app.account_developer_id && (
                <span className="info-pill"><Hash size={12} />{app.account_developer_id}</span>
              )}
              {app.package_name && (
                <span className="info-pill" title="Package name"><Package size={12} />{app.package_name}</span>
              )}
              {app.category && (
                <span className="info-pill" title="Category"><Tag size={12} />{app.category}</span>
              )}
              {app.created_at && (
                <span className="info-pill">Created {new Date(app.created_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        <div className="info-hero-actions">
          <button
            type="button"
            className={`btn btn-primary ${bundleCopied ? 'success' : ''}`}
            onClick={copyAll}
          >
            {bundleCopied ? <Check size={18} /> : <Copy size={18} />}
            {bundleCopied ? 'All info copied' : 'Copy all info'}
          </button>
          {!isShare && (
            <button
              type="button"
              className={`btn btn-secondary ${linkCopied ? 'success' : ''}`}
              onClick={copyShareLink}
              title="Copy a public link to share with the upload team"
            >
              {linkCopied ? <Check size={16} /> : <Share2 size={16} />}
              {linkCopied ? 'Link copied' : 'Copy share link'}
            </button>
          )}
          {!isShare && (
            <Link href={`/apps/${app.id}`} className="btn btn-secondary">
              <History size={16} /> Manage Versions
            </Link>
          )}
        </div>
      </header>

      {/* Share-link banner — only shown on the owner view */}
      {!isShare && shareUrl && (
        <div className="share-banner glass-card">
          <div className="share-banner-icon"><Share2 size={20} /></div>
          <div className="share-banner-body">
            <strong>Public share link</strong>
            <p className="text-muted">Send this URL to your upload team — they&apos;ll see all assets and copy-ready text without needing dashboard access.</p>
            <div className="share-banner-url-row">
              <code className="share-banner-url"><Link2 size={12} />{shareUrl}</code>
              <button
                type="button"
                className={`info-mini-btn ${linkCopied ? 'success' : ''}`}
                onClick={copyShareLink}
              >
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{linkCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="info-mini-btn">
                <ExternalLink size={14} /> <span>Open</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Listing versions — full snapshots of every edit to this listing */}
      {versionsNewestFirst.length > 0 && (
        <section className="glass-card info-section listing-versions-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <History size={20} /> Listing Versions
            </h2>
            <span className="text-muted">
              {versionsNewestFirst.length} snapshot{versionsNewestFirst.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="listing-versions-timeline">
            {versionsNewestFirst.map((v, idx) => {
              const isLatest = idx === 0;
              const changes = versionChanges.get(v.id) || [];
              return (
                <article
                  key={v.id}
                  className={`listing-version-card ${isLatest ? 'is-latest-green' : ''}`}
                >
                  <div className="listing-version-head">
                    <div className="listing-version-tag">
                      <span>{v.version_label}</span>
                      {isLatest && <small>LATEST</small>}
                    </div>
                    <div className="listing-version-meta">
                      <span>{fmtDate(v.created_at)}</span>
                    </div>
                    {v.release_file_path && (
                      <a
                        href={v.release_file_path}
                        download
                        className="info-mini-btn"
                        title="Download AAB / IPA"
                        onClick={e => e.stopPropagation()}
                      >
                        <FileDown size={14} />
                        <span>AAB / IPA</span>
                      </a>
                    )}
                    <ListingVersionModal version={v} isLatest={isLatest} />
                  </div>

                  <div className="listing-version-hints">
                    {changes.map(c => (
                      <span key={c} className="listing-version-pill">
                        <RefreshCw size={10} />
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Thumbnail strip preview */}
                  {(v.icon_small_path || v.icon_large_path || (v.screenshots && v.screenshots.length > 0)) && (
                    <div className="listing-version-snapshot-thumbs">
                      {v.icon_small_path && (
                        <div className="listing-version-thumb">
                          <img src={v.icon_small_path} alt="icon" />
                          <span>Icon</span>
                        </div>
                      )}
                      {v.icon_large_path && (
                        <div className="listing-version-thumb wide">
                          <img src={v.icon_large_path} alt="promo" />
                          <span>Promo</span>
                        </div>
                      )}
                      {v.screenshots && v.screenshots.length > 0 && (
                        <div className="listing-version-shots">
                          {v.screenshots.map((s, i) => (
                            <div key={`${v.id}-shot-${i}`} className="listing-version-shot">
                              <img src={s} alt={`Screenshot ${i + 1}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Two-column body */}
      <div className="info-grid">
        {/* LEFT: text fields */}
        <section className="glass-card info-section">
          <div className="info-section-head">
            <h2>Listing Content</h2>
            <span className="text-muted">Click any field to copy</span>
          </div>

          <CopyableField label="App Name" value={app.name} icon={<Smartphone size={14} />} />
          <CopyableField
            label="Package Name"
            value={app.package_name}
            icon={<Package size={14} />}
            href={app.package_name ? `https://play.google.com/store/apps/details?id=${app.package_name}` : undefined}
          />
          <CopyableField label="Category" value={app.category} icon={<Tag size={14} />} />
          <CopyableField label="Short Description" value={app.short_description} icon={<Sparkles size={14} />} />
          <CopyableField label="Long Description" value={app.long_description} multiline icon={<Sparkles size={14} />} />

          <div className="info-section-head" style={{ marginTop: 28 }}>
            <h2>Developer & Contact</h2>
          </div>
          <CopyableField
            label="Contact Email"
            value={app.contact_email || app.account_email}
            icon={<Mail size={14} />}
            href={app.contact_email || app.account_email ? `mailto:${app.contact_email || app.account_email}` : undefined}
          />
          <CopyableField
            label="Website"
            value={app.website_url || app.account_website}
            icon={<Globe size={14} />}
            href={app.website_url || app.account_website}
          />
          <CopyableField
            label="Privacy Policy URL"
            value={app.privacy_url}
            icon={<ShieldCheck size={14} />}
            href={app.privacy_url}
          />
          {app.store_url && (
            <CopyableField
              label="Store URL"
              value={app.store_url}
              icon={<ExternalLink size={14} />}
              href={app.store_url}
            />
          )}
          <CopyableField
            label="Developer Name"
            value={app.account_developer_name}
            icon={<Hash size={14} />}
          />
          {app.account_developer_id && (
            <CopyableField label="Developer ID" value={app.account_developer_id} icon={<Hash size={14} />} />
          )}
          {app.account_phone && (
            <CopyableField label="Developer Phone" value={app.account_phone} icon={<Hash size={14} />} />
          )}
        </section>

        {/* RIGHT: assets */}
        <section className="glass-card info-section">
          <div className="info-section-head">
            <h2>Visual Assets</h2>
            <span className="text-muted">Download for store upload</span>
          </div>

          <div className="image-assets-grid">
            <ImageAsset label="Store Icon" src={app.icon_small_path} hint="512x512" />
            <ImageAsset label="Promo Graphic" src={app.icon_large_path} hint="1024x500" />
          </div>

          <div className="info-section-head" style={{ marginTop: 28 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImagesIcon size={18} /> Screenshots <span className="text-muted" style={{ fontSize: '0.85rem' }}>({screenshots.length})</span>
            </h3>
          </div>

          {screenshots.length === 0 ? (
            <div className="empty-screens">
              <Image size={28} />
              <p>No screenshots uploaded.</p>
            </div>
          ) : (
            <div className="screenshots-info-grid">
              {screenshots.map((shot, i) => (
                <div key={shot.id} className="screenshot-info-card">
                  <img src={shot.file_path} alt={`Screenshot ${i + 1}`} />
                  <div className="screenshot-info-actions">
                    <button onClick={() => downloadFile(shot.file_path, fileNameFromPath(shot.file_path))} className="info-mini-btn">
                      <Download size={14} />
                    </button>
                    <a href={shot.file_path} target="_blank" rel="noreferrer" className="info-mini-btn">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {latestAab && (
            <div className="aab-download-banner">
              <div className="aab-download-banner-icon">
                <Package size={22} />
              </div>
              <div className="aab-download-banner-body">
                <strong>App Bundle (AAB)</strong>
                <span>{fileNameFromPath(latestAab.release_file_path ?? undefined)} · {latestAab.version_label}</span>
              </div>
              <a
                href={latestAab.release_file_path ?? undefined}
                download={fileNameFromPath(latestAab.release_file_path ?? undefined)}
                className="aab-download-btn"
              >
                <FileDown size={16} /> Download AAB
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
