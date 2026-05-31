'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit3, X, Loader2, Save, Hash, Calendar, FileText, Type, AlignLeft,
  Upload, ExternalLink, Check, Plus, FileImage, Image as ImageIcon, FileDown,
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateVersion } from '@/lib/actions';
import { uploadFilesInForm } from '@/lib/upload-client';
import { resizeImageToFile } from '@/lib/resize-image';

type Screenshot = { id: number; file_path: string };

type Version = {
  id: number;
  version_number: string;
  changelog?: string;
  release_date?: string;
  file_path?: string;
  icon_path?: string;
  promo_path?: string;
  screenshots?: Screenshot[];
};

type AppListing = {
  name?: string;
  short_description?: string;
  long_description?: string;
};

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DD in local time so the picker shows the day the user expects
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fileNameFromPath(p?: string) {
  if (!p) return 'file';
  return p.split('?')[0].split('/').pop() || 'file';
}

export default function EditVersionModal({
  version,
  app,
  isLatest = false,
  triggerLabel,
}: {
  version: Version;
  app?: AppListing;
  isLatest?: boolean;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // ── Version metadata ──
  const [versionNumber, setVersionNumber] = useState(version.version_number);
  const [changelog, setChangelog] = useState(version.changelog || '');
  const [releaseDate, setReleaseDate] = useState(toDateInputValue(version.release_date));

  // ── Listing content (app-level) ──
  const [title, setTitle] = useState(app?.name || '');
  const [shortDesc, setShortDesc] = useState(app?.short_description || '');
  const [longDesc, setLongDesc] = useState(app?.long_description || '');

  // ── Binary (AAB / IPA) ──
  const [aabMode, setAabMode] = useState<'file' | 'link'>('file');
  const [aabFile, setAabFile] = useState<File | null>(null);
  const [aabLink, setAabLink] = useState('');
  const [removeAab, setRemoveAab] = useState(false);
  const aabInputRef = useRef<HTMLInputElement>(null);

  // ── Icon ──
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconRemoved, setIconRemoved] = useState(false);
  const [iconResizing, setIconResizing] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);

  // ── Promo / splash ──
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [promoPreview, setPromoPreview] = useState<string | null>(null);
  const [promoRemoved, setPromoRemoved] = useState(false);
  const [promoResizing, setPromoResizing] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // ── Screenshots ──
  const [keptShots, setKeptShots] = useState<string[]>([]);
  const [newShotFiles, setNewShotFiles] = useState<File[]>([]);
  const [newShotPreviews, setNewShotPreviews] = useState<string[]>([]);

  // ── Sync to live listing ──
  const [updateAppAssets, setUpdateAppAssets] = useState(isLatest);

  // Reset all local state from props whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setVersionNumber(version.version_number);
    setChangelog(version.changelog || '');
    setReleaseDate(toDateInputValue(version.release_date));
    setTitle(app?.name || '');
    setShortDesc(app?.short_description || '');
    setLongDesc(app?.long_description || '');
    setAabMode('file');
    setAabFile(null);
    setAabLink('');
    setRemoveAab(false);
    if (aabInputRef.current) aabInputRef.current.value = '';
    setIconFile(null);
    setIconPreview(null);
    setIconRemoved(false);
    setIconError(null);
    setPromoFile(null);
    setPromoPreview(null);
    setPromoRemoved(false);
    setPromoError(null);
    setKeptShots((version.screenshots || []).map((s) => s.file_path));
    setNewShotFiles([]);
    setNewShotPreviews([]);
    setUpdateAppAssets(isLatest);
  }, [open, version, app, isLatest]);

  const totalShots = keptShots.length + newShotPreviews.length;

  async function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setIconResizing(true);
    setIconError(null);
    try {
      const resized = await resizeImageToFile(f, 512, 512);
      if (iconPreview) URL.revokeObjectURL(iconPreview);
      setIconFile(resized);
      setIconPreview(URL.createObjectURL(resized));
      setIconRemoved(false);
    } catch (err: any) {
      setIconError(err?.message || 'Could not process the image.');
    } finally {
      setIconResizing(false);
      e.target.value = '';
    }
  }

  async function handlePromoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPromoResizing(true);
    setPromoError(null);
    try {
      const resized = await resizeImageToFile(f, 1024, 500);
      if (promoPreview) URL.revokeObjectURL(promoPreview);
      setPromoFile(resized);
      setPromoPreview(URL.createObjectURL(resized));
      setPromoRemoved(false);
    } catch (err: any) {
      setPromoError(err?.message || 'Could not process the image.');
    } finally {
      setPromoResizing(false);
      e.target.value = '';
    }
  }

  function handleShotsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const room = Math.max(0, 8 - totalShots);
    const arr = Array.from(files).slice(0, room);
    setNewShotFiles((prev) => [...prev, ...arr]);
    setNewShotPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  }

  function removeKeptShot(url: string) {
    setKeptShots((prev) => prev.filter((u) => u !== url));
  }
  function removeNewShot(i: number) {
    setNewShotFiles((prev) => prev.filter((_, idx) => idx !== i));
    setNewShotPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Current binary display: existing path unless removed/replaced.
  const showExistingAab = !!version.file_path && !removeAab && !aabFile && !aabLink.trim();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!versionNumber.trim()) {
      alert('Version number is required.');
      return;
    }
    if (iconResizing || promoResizing) {
      alert('An image is still being resized. Please wait a moment and try again.');
      return;
    }

    setPending(true);
    const fd = new FormData();
    fd.set('versionNumber', versionNumber.trim());
    fd.set('changelog', changelog);
    if (releaseDate) fd.set('releaseDate', releaseDate);

    // Listing content
    fd.set('name', title.trim());
    fd.set('shortDescription', shortDesc);
    fd.set('longDescription', longDesc);
    fd.set('updateAppAssets', updateAppAssets ? '1' : '0');

    // Binary
    if (aabMode === 'file' && aabFile) {
      fd.set('file', aabFile);
    } else if (aabMode === 'link' && aabLink.trim()) {
      fd.set('fileExternalLink', aabLink.trim());
    } else if (removeAab) {
      fd.set('removeFile', '1');
    }

    // Icon
    if (iconFile) fd.set('iconSmall', iconFile);
    else if (iconRemoved) fd.set('removeIcon', '1');

    // Promo
    if (promoFile) fd.set('iconLarge', promoFile);
    else if (promoRemoved) fd.set('removePromo', '1');

    // Screenshots — always send the kept set so the server reconciles
    fd.set('keptScreenshots', JSON.stringify(keptShots));
    newShotFiles.forEach((f, i) => fd.append(`screenshot_${i}`, f));

    try {
      await uploadFilesInForm(fd, {
        file: { bucket: 'apps' },
        iconSmall: { bucket: 'icons', prefix: 'v-small-' },
        iconLarge: { bucket: 'icons', prefix: 'v-large-' },
        screenshot_0: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_1: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_2: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_3: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_4: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_5: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_6: { bucket: 'screenshots', prefix: 'v-' },
        screenshot_7: { bucket: 'screenshots', prefix: 'v-' },
      });
    } catch (err: any) {
      setPending(false);
      alert(err?.message || 'File upload failed');
      return;
    }

    const res = await updateVersion(version.id, fd);
    setPending(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary small"
        style={{
          width: triggerLabel ? 'auto' : 32,
          padding: triggerLabel ? '8px 12px' : 0,
          justifyContent: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: triggerLabel ? 6 : 0,
        }}
        onClick={() => setOpen(true)}
        title={`Edit version ${version.version_number}`}
      >
        <Edit3 size={14} />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      <ModalPortal open={open}>
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640, width: '100%' }}
          >
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Edit3 size={20} /> Edit version
                  {isLatest && (
                    <span
                      className="char-count-pill"
                      style={{
                        color: '#22c55e',
                        borderColor: 'rgba(34, 197, 94, 0.3)',
                        background: 'rgba(34, 197, 94, 0.08)',
                      }}
                    >
                      LATEST
                    </span>
                  )}
                </h2>
                <p className="text-muted" style={{ marginTop: 6 }}>
                  Fix anything in this release in place — no need to publish a new version.
                </p>
              </div>
              <button className="modal-close" onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              <div className="version-form-row">
                <div className="input-field">
                  <label>Version Number</label>
                  <div className="input-with-icon-large">
                    <Hash size={18} />
                    <input
                      type="text"
                      value={versionNumber}
                      onChange={(e) => setVersionNumber(e.target.value)}
                      placeholder="e.g. 1.0.1"
                      required
                    />
                  </div>
                </div>
                <div className="input-field">
                  <label>Release Date</label>
                  <div className="input-with-icon-large">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="input-field" style={{ marginTop: 18 }}>
                <label>Title</label>
                <div className="input-with-icon-large">
                  <Type size={18} />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="App title shown on the listing"
                  />
                </div>
              </div>

              <div className="input-field" style={{ marginTop: 18 }}>
                <div className="label-row">
                  <label>Short description</label>
                  <span className={`char-count-pill ${shortDesc.length > 80 ? 'error' : shortDesc.length > 70 ? 'warning' : ''}`}>
                    {shortDesc.length} / 80
                  </span>
                </div>
                <div className="input-with-icon-large">
                  <AlignLeft size={18} />
                  <input
                    type="text"
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    placeholder="Tagline (max 80 chars)"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="input-field" style={{ marginTop: 18 }}>
                <div className="label-row">
                  <label>Long description</label>
                  <span className={`char-count-pill ${longDesc.length > 4000 ? 'error' : longDesc.length > 3500 ? 'warning' : ''}`}>
                    {longDesc.length.toLocaleString()} / 4,000
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={longDesc}
                  onChange={(e) => setLongDesc(e.target.value)}
                  className="glass-input editor-textarea premium-scroll"
                  placeholder="Full listing description shown on the store page."
                  maxLength={4000}
                  style={{ minHeight: 140, padding: 14, borderRadius: 14 }}
                />
              </div>

              <div className="input-field" style={{ marginTop: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} /> What's new (Changelog)
                </label>
                <textarea
                  rows={4}
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  className="glass-input editor-textarea premium-scroll"
                  placeholder={'• Fixed crash on launch\n• Updated icon\n• 3 new screenshots'}
                  style={{ minHeight: 120, padding: 14, borderRadius: 14 }}
                />
              </div>

              {/* Icon + Promo */}
              <div className="version-assets-row" style={{ marginTop: 18 }}>
                <div className={`mini-asset ${iconPreview || (version.icon_path && !iconRemoved) ? 'has-preview' : ''}`}>
                  <div className="mini-asset-label">App Icon · 512 × 512</div>
                  <label className="mini-asset-drop" style={{ position: 'relative', cursor: iconResizing ? 'wait' : 'pointer' }}>
                    {iconPreview
                      ? <img src={iconPreview} alt="" />
                      : version.icon_path && !iconRemoved
                        ? <img src={version.icon_path} alt="" />
                        : <div className="mini-asset-empty"><FileImage size={24} /><small>Upload</small></div>}
                    {iconResizing && (
                      <div className="asset-resizing-overlay">
                        <Loader2 size={22} className="animate-spin" color="var(--accent)" />
                        <span>Resizing 512 × 512…</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" disabled={iconResizing} onChange={handleIconChange} />
                  </label>
                  {(iconPreview || (version.icon_path && !iconRemoved)) && !iconResizing && (
                    <button
                      type="button"
                      className="mini-asset-clear"
                      title="Remove icon"
                      onClick={() => {
                        if (iconPreview) URL.revokeObjectURL(iconPreview);
                        setIconFile(null);
                        setIconPreview(null);
                        setIconRemoved(true);
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                  {iconError && <div className="asset-error-msg" style={{ marginTop: 8 }}><X size={14} /><span>{iconError}</span></div>}
                </div>

                <div className={`mini-asset wide ${promoPreview || (version.promo_path && !promoRemoved) ? 'has-preview' : ''}`}>
                  <div className="mini-asset-label">Promo / Splash · 1024 × 500</div>
                  <label className="mini-asset-drop" style={{ position: 'relative', cursor: promoResizing ? 'wait' : 'pointer' }}>
                    {promoPreview
                      ? <img src={promoPreview} alt="" />
                      : version.promo_path && !promoRemoved
                        ? <img src={version.promo_path} alt="" />
                        : <div className="mini-asset-empty"><ImageIcon size={24} /><small>Upload</small></div>}
                    {promoResizing && (
                      <div className="asset-resizing-overlay">
                        <Loader2 size={22} className="animate-spin" color="var(--accent)" />
                        <span>Resizing 1024 × 500…</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" disabled={promoResizing} onChange={handlePromoChange} />
                  </label>
                  {(promoPreview || (version.promo_path && !promoRemoved)) && !promoResizing && (
                    <button
                      type="button"
                      className="mini-asset-clear"
                      title="Remove promo"
                      onClick={() => {
                        if (promoPreview) URL.revokeObjectURL(promoPreview);
                        setPromoFile(null);
                        setPromoPreview(null);
                        setPromoRemoved(true);
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                  {promoError && <div className="asset-error-msg" style={{ marginTop: 8 }}><X size={14} /><span>{promoError}</span></div>}
                </div>
              </div>

              {/* Screenshots */}
              <div className="version-screenshots-block" style={{ marginTop: 18 }}>
                <div className="version-screenshots-head">
                  <strong>Screenshots</strong>
                  <small className="text-muted">{totalShots} / 8</small>
                </div>
                <div className="version-screenshots-grid">
                  {keptShots.map((src) => (
                    <div key={src} className="screenshot-card">
                      <img src={src} alt="screenshot" />
                      <button type="button" className="remove-asset" onClick={() => removeKeptShot(src)}><X size={14} /></button>
                    </div>
                  ))}
                  {newShotPreviews.map((src, i) => (
                    <div key={`new-${i}`} className="screenshot-card">
                      <img src={src} alt="screenshot" />
                      <button type="button" className="remove-asset" onClick={() => removeNewShot(i)}><X size={14} /></button>
                    </div>
                  ))}
                  {totalShots < 8 && (
                    <label className="version-shot-add">
                      <Plus size={20} />
                      <small>Add</small>
                      <input type="file" multiple accept="image/*" onChange={handleShotsChange} />
                    </label>
                  )}
                </div>
              </div>

              {/* Binary */}
              <div className="input-field" style={{ marginTop: 18 }}>
                <label>AAB / IPA Binary</label>
                {showExistingAab && (
                  <div className="aab-drop aab-drop-has-file" style={{ marginBottom: 8 }}>
                    <FileDown size={18} />
                    <span className="aab-drop-name">{fileNameFromPath(version.file_path)}</span>
                    <button
                      type="button"
                      className="aab-drop-remove"
                      onClick={() => setRemoveAab(true)}
                      title="Remove current binary"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {removeAab && !aabFile && !aabLink.trim() && (
                  <div className="aab-link-hint" style={{ marginBottom: 8, color: '#ef4444' }}>
                    Current binary will be removed on save.{' '}
                    <button
                      type="button"
                      onClick={() => setRemoveAab(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Undo
                    </button>
                  </div>
                )}

                <div className="aab-mode-toggle" style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    className={`aab-mode-btn ${aabMode === 'file' ? 'active' : ''}`}
                    onClick={() => { setAabMode('file'); setAabLink(''); }}
                  >
                    <Upload size={13} /> Upload file
                  </button>
                  <button
                    type="button"
                    className={`aab-mode-btn ${aabMode === 'link' ? 'active' : ''}`}
                    onClick={() => { setAabMode('link'); setAabFile(null); if (aabInputRef.current) aabInputRef.current.value = ''; }}
                  >
                    <ExternalLink size={13} /> Paste link
                  </button>
                </div>

                {aabMode === 'file' ? (
                  aabFile ? (
                    <div className="aab-drop aab-drop-has-file">
                      <Upload size={18} />
                      <span className="aab-drop-name">{aabFile.name}</span>
                      <button
                        type="button"
                        className="aab-drop-remove"
                        onClick={() => { setAabFile(null); if (aabInputRef.current) aabInputRef.current.value = ''; }}
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="aab-drop">
                      <Upload size={18} />
                      <span>{version.file_path && !removeAab ? 'Replace file…' : 'Choose file…'}</span>
                      <input
                        ref={aabInputRef}
                        type="file"
                        onChange={(e) => setAabFile(e.target.files?.[0] || null)}
                        accept=".aab,.ipa,.apk,application/octet-stream"
                      />
                    </label>
                  )
                ) : (
                  <div className="aab-link-section aab-link-section-compact">
                    <div className="aab-link-hint" style={{ marginBottom: 6 }}>
                      Supabase limit is 50 MB — upload to SendSpace or MediaFire and paste the link.
                    </div>
                    <div className="aab-link-row">
                      <div className="aab-link-input-wrap">
                        <ExternalLink size={14} className="aab-link-icon" />
                        <input
                          type="url"
                          className="aab-link-input"
                          placeholder="Paste SendSpace or MediaFire link…"
                          value={aabLink}
                          onChange={(e) => setAabLink(e.target.value)}
                        />
                        {aabLink && (
                          <button type="button" className="aab-link-clear" onClick={() => setAabLink('')}>
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    {aabLink && (
                      <div className="aab-link-preview">
                        <Check size={12} color="#22c55e" /> Link ready
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label className="manage-toggle" style={{ marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={updateAppAssets}
                  onChange={(e) => setUpdateAppAssets(e.target.checked)}
                />
                <div>
                  <strong>Also update the app's live listing</strong>
                  <small className="text-muted">
                    Push this version's icon, promo and screenshots to the current store listing.
                    Title and descriptions are shared and always saved.
                  </small>
                </div>
              </label>

              <div
                className="modal-footer"
                style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent btn-glow"
                  disabled={pending || !versionNumber.trim()}
                >
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
