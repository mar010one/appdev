'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Smartphone, ArrowLeft, Copy, Check, Download,
  Mail, Globe, ShieldCheck, ExternalLink, Hash,
  Sparkles, FileImage, ImageIcon as Image, ImagesIcon,
  PartyPopper, Share2, Link2, History, RefreshCw, FileDown,
  Package, Tag, Layers, Loader2,
} from 'lucide-react';
import AppStatusMenu, { statusIcon, statusLabel } from './AppStatusMenu';
import ListingVersionModal from './ListingVersionModal';
import AppShareLinkButton from './AppShareLinkButton';
import { getAppShareIndex } from '@/lib/actions';

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
  share_active?: boolean;
  custom_listings?: CustomListing[];
};

type CustomListing = {
  id: number;
  name?: string;
  short_description?: string;
  long_description?: string;
  icon_path?: string;
  screenshots?: string[];
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
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ done: number; total: number } | null>(null);

  // Listing switcher: 0 = main listing, 1..n = custom listing index.
  const customListings = app.custom_listings || [];
  const [activeListing, setActiveListing] = useState(0);
  const active = activeListing > 0 ? customListings[activeListing - 1] : null;

  // The currently-displayed listing content (main or the selected custom one).
  const viewName = active ? (active.name || app.name) : app.name;
  const viewShort = active ? (active.short_description || '') : app.short_description;
  const viewLong = active ? (active.long_description || '') : app.long_description;
  const viewIcon = active ? (active.icon_path || app.icon_small_path) : app.icon_small_path;
  const viewScreenshots: Array<{ id: number; file_path: string }> = active
    ? (active.screenshots || []).map((url, i) => ({ id: i, file_path: url }))
    : (app.screenshots || []);

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
  // The public route resolves `/a<n>` by *share index* (1-based position), not
  // the raw DB id — so the URL must use the index too, or it 404s / opens the
  // wrong app. Mirror what AppShareLinkButton does.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    (async () => {
      const idx = await getAppShareIndex(app.id);
      if (cancelled) return;
      setShareUrl(`${window.location.origin}/a${idx ?? app.id}`);
    })();
    return () => { cancelled = true; };
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
    `App Name: ${viewName || ''}`,
    `Package Name: ${app.package_name || ''}`,
    `Category: ${app.category || ''}`,
    `Short Description: ${viewShort || ''}`,
    '',
    'Long Description:',
    `${viewLong || ''}`,
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

  // One-click grab: save every asset (icon, promo, screenshots, AAB) as its own
  // normal file download, one after another.
  async function downloadAll() {
    if (downloading) return;
    setDownloading(true);

    const safeName = (viewName || 'app').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'app';
    const assets: Array<{ url: string; name: string }> = [];
    if (viewIcon) assets.push({ url: viewIcon, name: `${safeName}-icon-${fileNameFromPath(viewIcon)}` });
    if (app.icon_large_path) assets.push({ url: app.icon_large_path, name: `${safeName}-promo-${fileNameFromPath(app.icon_large_path)}` });
    viewScreenshots.forEach((shot, i) => {
      const n = String(i + 1).padStart(2, '0');
      assets.push({ url: shot.file_path, name: `${safeName}-screenshot-${n}-${fileNameFromPath(shot.file_path)}` });
    });
    if (latestAab?.release_file_path) {
      assets.push({ url: latestAab.release_file_path, name: fileNameFromPath(latestAab.release_file_path) });
    }

    setDlProgress({ done: 0, total: assets.length });

    try {
      // Download sequentially with a small gap so the browser doesn't drop
      // back-to-back downloads.
      for (let i = 0; i < assets.length; i++) {
        await downloadFile(assets[i].url, assets[i].name);
        setDlProgress({ done: i + 1, total: assets.length });
        if (i < assets.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } finally {
      setDownloading(false);
      setDlProgress(null);
    }
  }

  const screenshots = viewScreenshots;

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
          {viewIcon ? (
            <img src={viewIcon} alt={viewName} className="info-hero-icon" />
          ) : (
            <div className="info-hero-icon placeholder"><Smartphone size={36} /></div>
          )}
          <div>
            <div className="info-eyebrow">
              {active ? <Layers size={12} /> : <Sparkles size={12} />}
              {active
                ? `CL ${activeListing}`
                : (isShare ? 'STORE LISTING PACKAGE' : 'APP REGISTERED')}
              {!isShare && !active && <PartyPopper size={12} style={{ marginLeft: 6 }} />}
            </div>
            <h1 className="info-title">{viewName}</h1>
            <p className="text-muted info-sub">
              {viewShort || 'No tagline'}
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
            className="btn btn-primary"
            onClick={downloadAll}
            disabled={downloading}
          >
            {downloading
              ? <Loader2 size={18} className="spin" />
              : <Download size={18} />}
            {downloading
              ? (dlProgress ? `Downloading ${dlProgress.done}/${dlProgress.total}…` : 'Downloading…')
              : 'Download all'}
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${bundleCopied ? 'success' : ''}`}
            onClick={copyAll}
          >
            {bundleCopied ? <Check size={18} /> : <Copy size={18} />}
            {bundleCopied ? 'All info copied' : 'Copy all info'}
          </button>
          {!isShare && (
            <AppShareLinkButton
              appId={app.id}
              shareActive={!!app.share_active}
              buttonStyle={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              label="Share link"
            />
          )}
          {!isShare && (
            <Link href={`/apps/${app.id}`} className="btn btn-secondary">
              <History size={16} /> Manage Versions
            </Link>
          )}
        </div>
      </header>

      {/* Listing switcher — appears when the app has custom store listings */}
      {customListings.length > 0 && (
        <div className="listing-switcher glass-card">
          <div className="listing-switcher-label">
            <Layers size={16} />
            <span>Store listing</span>
          </div>
          <div className="listing-switcher-tabs">
            <button
              type="button"
              className={`listing-switch-tab ${activeListing === 0 ? 'active' : ''}`}
              onClick={() => setActiveListing(0)}
            >
              <Sparkles size={14} />
              Main listing
            </button>
            {customListings.map((cl, i) => (
              <button
                key={cl.id}
                type="button"
                className={`listing-switch-tab ${activeListing === i + 1 ? 'active' : ''}`}
                onClick={() => setActiveListing(i + 1)}
              >
                {cl.icon_path
                  ? <img src={cl.icon_path} alt="" className="listing-switch-icon" />
                  : <Copy size={14} />}
                {cl.name?.trim() || `CL ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Share-link banner — only shown on the owner view */}
      {!isShare && shareUrl && (
        <div className="share-banner glass-card">
          <div className="share-banner-icon"><Share2 size={20} /></div>
          <div className="share-banner-body">
            <strong>Public share link {app.share_active ? '(active)' : '(off)'}</strong>
            <p className="text-muted">
              {app.share_active
                ? "Send this URL to your upload team — they'll see all assets and copy-ready text without needing dashboard access."
                : "The link is currently inactive — visitors will be sent to the login page. Open the Share link button above to turn it on."}
            </p>
            <div className="share-banner-url-row" style={{ opacity: app.share_active ? 1 : 0.55 }}>
              <code className="share-banner-url"><Link2 size={12} />{shareUrl}</code>
              <button
                type="button"
                className={`info-mini-btn ${linkCopied ? 'success' : ''}`}
                onClick={copyShareLink}
                disabled={!app.share_active}
                title={app.share_active ? 'Copy link' : 'Activate sharing first'}
              >
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{linkCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={app.share_active ? shareUrl : undefined}
                target="_blank"
                rel="noreferrer"
                className="info-mini-btn"
                aria-disabled={!app.share_active}
                onClick={(e) => { if (!app.share_active) e.preventDefault(); }}
                style={{ pointerEvents: app.share_active ? 'auto' : 'none' }}
              >
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

          <CopyableField label="App Name" value={viewName} icon={<Smartphone size={14} />} />
          <CopyableField
            label="Package Name"
            value={app.package_name}
            icon={<Package size={14} />}
            href={app.package_name ? `https://play.google.com/store/apps/details?id=${app.package_name}` : undefined}
          />
          <CopyableField label="Category" value={app.category} icon={<Tag size={14} />} />
          <CopyableField label="Short Description" value={viewShort} icon={<Sparkles size={14} />} />
          <CopyableField label="Long Description" value={viewLong} multiline icon={<Sparkles size={14} />} />

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
            <ImageAsset label={active ? 'CL Icon' : 'Store Icon'} src={viewIcon} hint="512x512" />
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
              <button
                type="button"
                onClick={() => latestAab.release_file_path && downloadFile(latestAab.release_file_path, fileNameFromPath(latestAab.release_file_path))}
                className="aab-download-btn"
              >
                <FileDown size={16} /> Download AAB
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
