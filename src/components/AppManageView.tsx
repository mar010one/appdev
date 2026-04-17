'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Smartphone, Hash, Plus, Loader2, Check, FileDown, Upload,
  Image as ImageIcon, FileImage, X, Trash2, History, GitCommit, Sparkles,
  ExternalLink, Share2, Copy, Info, Edit3, RefreshCw,
} from 'lucide-react';
import EditAppModal from './EditAppModal';
import AppStatusMenu from './AppStatusMenu';
import { addVersion, deleteVersion } from '@/lib/actions';

type Screenshot = { id: number; file_path: string };
type Version = {
  id: number;
  app_id: number;
  version_number: string;
  changelog?: string;
  file_path?: string;
  icon_path?: string;
  promo_path?: string;
  release_date: string;
  screenshots?: Screenshot[];
};

type App = {
  id: number;
  name: string;
  short_description?: string;
  long_description?: string;
  icon_small_path?: string;
  icon_large_path?: string;
  store_url?: string;
  status?: string;
  account_email?: string;
  account_developer_name?: string;
  account_developer_id?: string;
  account_type?: string;
  created_at?: string;
  screenshots?: Screenshot[];
};

function suggestNextVersion(versions: Version[]): string {
  if (!versions.length) return '1.0.0';
  const latest = versions[0].version_number;
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(latest.trim());
  if (!m) return '';
  const [, maj, min, patch] = m;
  return `${maj}.${min}.${parseInt(patch, 10) + 1}`;
}

function fmtDate(d?: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fileNameFromPath(p?: string) {
  if (!p) return 'file';
  return p.split('/').pop() || 'file';
}

export default function AppManageView({ app, versions }: { app: App; versions: Version[] }) {
  const [, startTransition] = useTransition();

  // ---- New version form state ----
  const [versionNumber, setVersionNumber] = useState(suggestNextVersion(versions));
  const [changelog, setChangelog] = useState('');
  const [aabFile, setAabFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [promoPreview, setPromoPreview] = useState<string | null>(null);
  const [shotFiles, setShotFiles] = useState<File[]>([]);
  const [shotPreviews, setShotPreviews] = useState<string[]>([]);
  const [updateAppAssets, setUpdateAppAssets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const aabInputRef = useRef<HTMLInputElement>(null);

  // ---- Share link ----
  const [linkCopied, setLinkCopied] = useState(false);
  async function copyShareLink() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/share/${app.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      window.prompt('Copy this share link:', url);
    }
  }

  // Compute simple "what changed" hints by comparing each version to the previous (older) one.
  const changeHints = useMemo(() => {
    const map = new Map<number, string[]>();
    // versions are newest-first, so previous = next index
    for (let i = 0; i < versions.length; i++) {
      const cur = versions[i];
      const prev = versions[i + 1];
      const hints: string[] = [];
      if (cur.icon_path)  hints.push('New icon');
      if (cur.promo_path) hints.push('New promo graphic');
      if (cur.screenshots && cur.screenshots.length) {
        const prevCount = prev?.screenshots?.length ?? 0;
        if (cur.screenshots.length !== prevCount) {
          hints.push(`${cur.screenshots.length} screenshot${cur.screenshots.length === 1 ? '' : 's'}`);
        } else {
          hints.push('Updated screenshots');
        }
      }
      if (cur.file_path) hints.push('New AAB / IPA');
      if (!hints.length) hints.push('Changelog only');
      map.set(cur.id, hints);
    }
    return map;
  }, [versions]);

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setIconFile(f);
    setIconPreview(URL.createObjectURL(f));
  }
  function handlePromoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPromoFile(f);
    setPromoPreview(URL.createObjectURL(f));
  }
  function handleShotsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
    setShotFiles(prev => [...prev, ...arr].slice(0, 8));
    setShotPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))].slice(0, 8));
  }
  function removeShot(i: number) {
    setShotFiles(prev => prev.filter((_, idx) => idx !== i));
    setShotPreviews(prev => prev.filter((_, idx) => idx !== i));
  }
  function handleAabChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setAabFile(f || null);
  }

  function resetForm() {
    setVersionNumber(suggestNextVersion(versions));
    setChangelog('');
    setAabFile(null);
    setIconFile(null);
    setIconPreview(null);
    setPromoFile(null);
    setPromoPreview(null);
    setShotFiles([]);
    setShotPreviews([]);
    if (aabInputRef.current) aabInputRef.current.value = '';
  }

  async function handleSubmitVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!versionNumber.trim()) return alert('Version number is required.');

    setSubmitting(true);
    const fd = new FormData();
    fd.set('appId', String(app.id));
    fd.set('versionNumber', versionNumber.trim());
    fd.set('changelog', changelog);
    fd.set('updateAppAssets', updateAppAssets ? '1' : '0');
    if (aabFile)   fd.set('file', aabFile);
    if (iconFile)  fd.set('iconSmall', iconFile);
    if (promoFile) fd.set('iconLarge', promoFile);
    shotFiles.forEach((f, i) => fd.append(`screenshot_${i}`, f));

    const res = await addVersion(fd);
    setSubmitting(false);

    if (res.error) { alert(res.error); return; }
    resetForm();
    startTransition(() => window.location.reload());
  }

  async function handleDeleteVersion(id: number, num: string) {
    if (!confirm(`Delete version ${num}? This cannot be undone.`)) return;
    const res = await deleteVersion(id);
    if (res.error) { alert(res.error); return; }
    startTransition(() => window.location.reload());
  }

  return (
    <div className="container animate-in app-manage-page">
      <Link href={`/accounts`} className="back-link">
        <ArrowLeft size={16} /> Back
      </Link>

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
              <Sparkles size={12} /> APP MANAGEMENT
            </div>
            <h1 className="info-title">{app.name}</h1>
            <p className="text-muted info-sub">{app.short_description || 'No tagline'}</p>
            <div className="info-hero-meta">
              <AppStatusMenu appId={app.id} status={app.status || 'draft'} />
              <span className={`account-badge ${app.account_type || ''}`}>
                {app.account_developer_name || app.account_email}
              </span>
              {app.account_developer_id && (
                <span className="info-pill"><Hash size={12} />{app.account_developer_id}</span>
              )}
              <span className="info-pill"><GitCommit size={12} />{versions.length} version{versions.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        <div className="info-hero-actions">
          <EditAppModal app={app} />
          <button
            type="button"
            className={`btn btn-secondary ${linkCopied ? 'success' : ''}`}
            onClick={copyShareLink}
            title="Copy public share link for the upload team"
          >
            {linkCopied ? <Check size={16} /> : <Share2 size={16} />}
            {linkCopied ? 'Link copied' : 'Copy share link'}
          </button>
          <Link href={`/apps/${app.id}/info`} className="btn btn-secondary">
            <Info size={16} /> Listing Info
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="manage-grid">
        {/* LEFT: New version form */}
        <section className="glass-card manage-form-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={20} /> Publish new version
            </h2>
          </div>

          <form onSubmit={handleSubmitVersion} className="version-form">
            <div className="version-form-row">
              <div className="input-field">
                <label>Version Number</label>
                <div className="input-with-icon-large">
                  <Hash size={20} />
                  <input
                    type="text"
                    placeholder="e.g. 1.0.1"
                    value={versionNumber}
                    onChange={(e) => setVersionNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="input-field">
                <label>AAB / IPA Binary</label>
                <label className="aab-drop">
                  <Upload size={18} />
                  <span>{aabFile ? aabFile.name : 'Choose file…'}</span>
                  <input
                    ref={aabInputRef}
                    type="file"
                    onChange={handleAabChange}
                    accept=".aab,.ipa,.apk,application/octet-stream"
                  />
                </label>
              </div>
            </div>

            <div className="input-field">
              <label>What's new (Changelog)</label>
              <textarea
                rows={4}
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="• Fixed crash on launch&#10;• Updated icon&#10;• 3 new screenshots"
                className="glass-input editor-textarea premium-scroll"
                style={{ minHeight: 120, padding: 16, borderRadius: 16 }}
              />
            </div>

            {/* Per-version assets */}
            <div className="version-assets-row">
              <div className={`mini-asset ${iconPreview ? 'has-preview' : ''}`}>
                <div className="mini-asset-label">App Icon</div>
                <label className="mini-asset-drop">
                  {iconPreview
                    ? <img src={iconPreview} alt="" />
                    : <div className="mini-asset-empty"><FileImage size={24} /><small>Upload</small></div>}
                  <input type="file" accept="image/*" onChange={handleIconChange} />
                </label>
                {iconPreview && (
                  <button type="button" className="mini-asset-clear" onClick={() => { setIconFile(null); setIconPreview(null); }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className={`mini-asset wide ${promoPreview ? 'has-preview' : ''}`}>
                <div className="mini-asset-label">Promo Graphic</div>
                <label className="mini-asset-drop">
                  {promoPreview
                    ? <img src={promoPreview} alt="" />
                    : <div className="mini-asset-empty"><ImageIcon size={24} /><small>Upload</small></div>}
                  <input type="file" accept="image/*" onChange={handlePromoChange} />
                </label>
                {promoPreview && (
                  <button type="button" className="mini-asset-clear" onClick={() => { setPromoFile(null); setPromoPreview(null); }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="version-screenshots-block">
              <div className="version-screenshots-head">
                <strong>Screenshots for this version</strong>
                <small className="text-muted">Up to 8 — leave empty to keep previous</small>
              </div>
              <div className="version-screenshots-grid">
                {shotPreviews.map((src, i) => (
                  <div key={i} className="screenshot-card">
                    <img src={src} alt={`shot ${i + 1}`} />
                    <button type="button" className="remove-asset" onClick={() => removeShot(i)}><X size={14} /></button>
                  </div>
                ))}
                {shotPreviews.length < 8 && (
                  <label className="version-shot-add">
                    <Plus size={20} />
                    <small>Add</small>
                    <input type="file" multiple accept="image/*" onChange={handleShotsChange} />
                  </label>
                )}
              </div>
            </div>

            <label className="manage-toggle">
              <input
                type="checkbox"
                checked={updateAppAssets}
                onChange={(e) => setUpdateAppAssets(e.target.checked)}
              />
              <div>
                <strong>Make these assets the app's current listing</strong>
                <small className="text-muted">
                  Old versions keep their own snapshot. Untick to keep the current listing untouched.
                </small>
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-accent btn-glow full-width"
              disabled={submitting}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {submitting ? 'Publishing…' : `Release v${versionNumber || '?'}`}
            </button>
          </form>
        </section>

        {/* RIGHT: Version timeline */}
        <section className="glass-card manage-versions-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <History size={20} /> Version history
            </h2>
            <span className="text-muted">{versions.length} release{versions.length === 1 ? '' : 's'}</span>
          </div>

          {versions.length === 0 ? (
            <div className="empty-screens" style={{ marginTop: 16 }}>
              <History size={28} />
              <p>No versions yet. Publish v1.0.0 on the left to get started.</p>
            </div>
          ) : (
            <div className="version-timeline-modern">
              {versions.map((v, idx) => {
                const isLatest = idx === 0;
                const hints = changeHints.get(v.id) || [];
                return (
                  <article key={v.id} className={`version-card ${isLatest ? 'is-latest' : ''}`}>
                    <div className="version-card-head">
                      <div className="version-tag-modern">
                        <span>v{v.version_number}</span>
                        {isLatest && <small>LATEST</small>}
                      </div>
                      <div className="version-meta-modern">
                        <span>{fmtDate(v.release_date)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary small"
                        style={{ width: 32, padding: 0, justifyContent: 'center', color: '#ef4444' }}
                        onClick={() => handleDeleteVersion(v.id, v.version_number)}
                        title="Delete version"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="version-hints">
                      {hints.map(h => (
                        <span key={h} className="version-hint-pill"><RefreshCw size={10} />{h}</span>
                      ))}
                    </div>

                    {v.changelog && (
                      <pre className="version-changelog-modern">{v.changelog}</pre>
                    )}

                    <div className="version-assets-preview">
                      {v.icon_path && (
                        <a href={v.icon_path} download={fileNameFromPath(v.icon_path)} className="version-asset-thumb" title="Download icon used in this version">
                          <img src={v.icon_path} alt="icon" />
                          <span>Icon</span>
                        </a>
                      )}
                      {v.promo_path && (
                        <a href={v.promo_path} download={fileNameFromPath(v.promo_path)} className="version-asset-thumb wide" title="Download promo for this version">
                          <img src={v.promo_path} alt="promo" />
                          <span>Promo</span>
                        </a>
                      )}
                      {v.screenshots && v.screenshots.length > 0 && (
                        <div className="version-shots-strip">
                          {v.screenshots.map(s => (
                            <a key={s.id} href={s.file_path} download={fileNameFromPath(s.file_path)} className="version-shot-thumb" title="Download screenshot">
                              <img src={s.file_path} alt="screenshot" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="version-card-actions">
                      {v.file_path ? (
                        <a href={v.file_path} download={fileNameFromPath(v.file_path)} className="btn btn-primary small">
                          <FileDown size={14} /> Download AAB / IPA
                        </a>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>No binary attached</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
