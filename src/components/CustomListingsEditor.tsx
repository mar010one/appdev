'use client';

import { useRef } from 'react';
import {
  Plus, X, Layers, Type, AlignLeft, FileImage, Image as ImageIcon,
  Loader2, Check, Upload, AlertCircle, Trash2, Smartphone,
} from 'lucide-react';
import { resizeImageToFile } from '@/lib/resize-image';

// A single in-progress custom listing draft held in React state.
export type CustomListingDraft = {
  uid: string;
  id?: number;              // DB id when editing an existing listing
  name: string;
  shortDesc: string;
  longDesc: string;
  iconFile: File | null;    // freshly picked + resized icon
  iconPreview: string | null; // blob URL (new) or existing public URL
  existingIcon: string;     // existing stored icon URL to keep ('' if none / replaced)
  iconResizing: boolean;
  iconError: string | null;
  newShots: { file: File; preview: string }[];
  keptShots: string[];      // existing stored screenshot URLs to keep
};

let uidCounter = 0;
function nextUid() {
  uidCounter += 1;
  return `cl-${uidCounter}-${uidCounter * 7 + 3}`;
}

export function emptyCustomListing(): CustomListingDraft {
  return {
    uid: nextUid(),
    name: '',
    shortDesc: '',
    longDesc: '',
    iconFile: null,
    iconPreview: null,
    existingIcon: '',
    iconResizing: false,
    iconError: null,
    newShots: [],
    keptShots: [],
  };
}

// Hydrate drafts from an app's saved custom listings (edit mode).
export function customListingsToDrafts(
  listings: Array<{
    id: number;
    name?: string;
    short_description?: string;
    long_description?: string;
    icon_path?: string;
    screenshots?: string[];
  }> = [],
): CustomListingDraft[] {
  return listings.map((l) => ({
    uid: nextUid(),
    id: l.id,
    name: l.name || '',
    shortDesc: l.short_description || '',
    longDesc: l.long_description || '',
    iconFile: null,
    iconPreview: l.icon_path || null,
    existingIcon: l.icon_path || '',
    iconResizing: false,
    iconError: null,
    newShots: [],
    keptShots: (l.screenshots || []).filter(Boolean),
  }));
}

const MAX_SHOTS = 8;

// Serialize drafts into a FormData payload the `saveCustomListings` server
// helper understands: a `customListings` JSON meta array + per-index files.
export function appendCustomListingsToForm(formData: FormData, drafts: CustomListingDraft[]) {
  const metas = drafts.map((d) => ({
    id: d.id,
    name: d.name,
    short_description: d.shortDesc,
    long_description: d.longDesc,
    // When a new icon file is attached the server reads custom_<i>_icon; keep
    // the existing URL otherwise.
    icon: d.iconFile ? '' : d.existingIcon,
    keptScreenshots: d.keptShots,
  }));
  formData.set('customListings', JSON.stringify(metas));

  drafts.forEach((d, i) => {
    if (d.iconFile) formData.set(`custom_${i}_icon`, d.iconFile);
    d.newShots.forEach((s) => formData.append(`custom_${i}_shots`, s.file));
  });
}

// Bucket map for uploadFilesInForm covering every custom-listing file field.
export function customListingUploadBuckets(count: number): Record<string, { bucket: string; prefix?: string }> {
  const map: Record<string, { bucket: string; prefix?: string }> = {};
  for (let i = 0; i < count; i++) {
    map[`custom_${i}_icon`] = { bucket: 'icons', prefix: `custom-${i}-icon-` };
    map[`custom_${i}_shots`] = { bucket: 'screenshots', prefix: `custom-${i}-shot-` };
  }
  return map;
}

export default function CustomListingsEditor({
  value,
  onChange,
}: {
  value: CustomListingDraft[];
  onChange: (next: CustomListingDraft[]) => void;
}) {
  // Revoke blob URLs we own when they're discarded.
  const ownedBlobs = useRef<Set<string>>(new Set());

  const patch = (uid: string, changes: Partial<CustomListingDraft>) => {
    onChange(value.map((d) => (d.uid === uid ? { ...d, ...changes } : d)));
  };

  const addListing = () => onChange([...value, emptyCustomListing()]);

  const removeListing = (uid: string) => {
    const target = value.find((d) => d.uid === uid);
    if (target) {
      if (target.iconPreview && ownedBlobs.current.has(target.iconPreview)) {
        URL.revokeObjectURL(target.iconPreview);
      }
      target.newShots.forEach((s) => URL.revokeObjectURL(s.preview));
    }
    onChange(value.filter((d) => d.uid !== uid));
  };

  const handleIcon = async (uid: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    patch(uid, { iconResizing: true, iconError: null });
    try {
      const resized = await resizeImageToFile(file, 512, 512);
      const preview = URL.createObjectURL(resized);
      ownedBlobs.current.add(preview);
      const prev = value.find((d) => d.uid === uid);
      if (prev?.iconPreview && ownedBlobs.current.has(prev.iconPreview)) {
        URL.revokeObjectURL(prev.iconPreview);
      }
      patch(uid, { iconFile: resized, iconPreview: preview, iconResizing: false });
    } catch (err: any) {
      patch(uid, { iconError: err?.message || 'Could not process the image.', iconResizing: false });
    }
  };

  const clearIcon = (uid: string) => {
    const prev = value.find((d) => d.uid === uid);
    if (prev?.iconPreview && ownedBlobs.current.has(prev.iconPreview)) {
      URL.revokeObjectURL(prev.iconPreview);
    }
    patch(uid, { iconFile: null, iconPreview: null, existingIcon: '', iconError: null });
  };

  const addShots = (uid: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const draft = value.find((d) => d.uid === uid);
    if (!draft) return;
    const room = MAX_SHOTS - (draft.keptShots.length + draft.newShots.length);
    const added = files.slice(0, Math.max(0, room)).map((file) => {
      const preview = URL.createObjectURL(file);
      ownedBlobs.current.add(preview);
      return { file, preview };
    });
    patch(uid, { newShots: [...draft.newShots, ...added] });
  };

  const removeKeptShot = (uid: string, url: string) => {
    const draft = value.find((d) => d.uid === uid);
    if (!draft) return;
    patch(uid, { keptShots: draft.keptShots.filter((s) => s !== url) });
  };

  const removeNewShot = (uid: string, idx: number) => {
    const draft = value.find((d) => d.uid === uid);
    if (!draft) return;
    const target = draft.newShots[idx];
    if (target) URL.revokeObjectURL(target.preview);
    patch(uid, { newShots: draft.newShots.filter((_, i) => i !== idx) });
  };

  return (
    <div className="cl-editor">
      <div className="cl-editor-head">
        <div className="cl-editor-head-text">
          <div className="section-title" style={{ marginBottom: 4 }}>
            <Layers size={22} color="var(--accent)" />
            <h3>CL</h3>
          </div>
          <p className="step-description" style={{ margin: 0 }}>
            Optional alternative listings — each with its own name, descriptions, icon and
            screenshots. Viewers can switch to them from the share link.
          </p>
        </div>
        <span className="cl-count-badge">{value.length} listing{value.length === 1 ? '' : 's'}</span>
      </div>

      {value.length === 0 && (
        <button type="button" className="cl-empty-add" onClick={addListing}>
          <span className="cl-empty-add-icon"><Plus size={26} /></span>
          <strong>Add a CL</strong>
          <small>Create a second listing with different branding & copy</small>
        </button>
      )}

      {value.map((d, i) => {
        const shotCount = d.keptShots.length + d.newShots.length;
        return (
          <div className="cl-card" key={d.uid}>
            <div className="cl-card-head">
              <div className="cl-card-badge">
                <Layers size={14} /> CL {i + 1}
              </div>
              <button
                type="button"
                className="cl-remove-btn"
                onClick={() => removeListing(d.uid)}
                title="Remove this CL"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>

            <div className="cl-card-grid">
              {/* Left: icon */}
              <div className="cl-icon-col">
                <label className="cl-field-label">Listing Icon · 512 × 512</label>
                <label className={`cl-icon-drop ${d.iconPreview ? 'has-img' : ''}`} style={{ cursor: d.iconResizing ? 'wait' : 'pointer' }}>
                  {d.iconPreview ? (
                    <img src={d.iconPreview} alt="Custom listing icon" />
                  ) : (
                    <div className="cl-icon-empty">
                      <FileImage size={30} />
                      <span>Upload icon</span>
                      <small>Auto-resized to 512²</small>
                    </div>
                  )}
                  {d.iconResizing && (
                    <div className="asset-resizing-overlay">
                      <Loader2 size={24} className="animate-spin" color="var(--accent)" />
                      <span>Resizing…</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden-input" disabled={d.iconResizing} onChange={(e) => handleIcon(d.uid, e)} />
                </label>
                {d.iconPreview && !d.iconResizing && (
                  <button type="button" className="cl-icon-clear" onClick={() => clearIcon(d.uid)}>
                    <X size={12} /> Clear icon
                  </button>
                )}
                {d.iconFile && !d.iconError && (
                  <span className="asset-resized-badge"><Check size={12} /> 512 × 512 · {(d.iconFile.size / 1024).toFixed(0)} KB</span>
                )}
                {d.iconError && (
                  <div className="asset-error-msg"><AlertCircle size={14} /><span>{d.iconError}</span></div>
                )}
              </div>

              {/* Right: text fields */}
              <div className="cl-text-col">
                <div className="input-field">
                  <label className="cl-field-label">Application Name</label>
                  <div className="input-with-icon-large">
                    <Smartphone size={20} />
                    <input
                      type="text"
                      placeholder="e.g., ZenFlow — Sleep & Calm"
                      value={d.name}
                      onChange={(e) => patch(d.uid, { name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-field">
                  <div className="label-row">
                    <label className="cl-field-label">Small Description</label>
                    <span className={`char-count-pill ${d.shortDesc.length > 80 ? 'error' : d.shortDesc.length > 70 ? 'warning' : ''}`}>
                      {d.shortDesc.length} / 80
                    </span>
                  </div>
                  <div className="input-with-icon-large">
                    <Type size={20} />
                    <input
                      type="text"
                      placeholder="Short tagline for this listing"
                      value={d.shortDesc}
                      maxLength={120}
                      onChange={(e) => patch(d.uid, { shortDesc: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-field">
                  <div className="label-row">
                    <label className="cl-field-label">Full Description</label>
                    <span className={`char-count-pill ${d.longDesc.length > 4000 ? 'error' : d.longDesc.length > 3500 ? 'warning' : ''}`}>
                      {d.longDesc.length.toLocaleString()} / 4000
                    </span>
                  </div>
                  <textarea
                    className="glass-input editor-textarea premium-scroll"
                    placeholder="Full store description for this custom listing…"
                    value={d.longDesc}
                    onChange={(e) => patch(d.uid, { longDesc: e.target.value })}
                    style={{ minHeight: 150, padding: 14, borderRadius: 14 }}
                  />
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="cl-shots-block">
              <div className="cl-shots-head">
                <span className="cl-field-label"><ImageIcon size={14} /> Screenshots</span>
                <small className="text-muted">{shotCount} / {MAX_SHOTS}</small>
              </div>
              <div className="cl-shots-grid">
                {d.keptShots.map((url) => (
                  <div key={url} className="screenshot-card">
                    <img src={url} alt="Custom screenshot" />
                    <button type="button" className="remove-asset" onClick={() => removeKeptShot(d.uid, url)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {d.newShots.map((s, idx) => (
                  <div key={s.preview} className="screenshot-card anim-fade-in">
                    <img src={s.preview} alt="New custom screenshot" />
                    <button type="button" className="remove-asset" onClick={() => removeNewShot(d.uid, idx)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {shotCount < MAX_SHOTS && (
                  <label className="cl-shot-add">
                    <Plus size={20} />
                    <small>Add</small>
                    <input type="file" multiple accept="image/*" className="hidden-input" onChange={(e) => addShots(d.uid, e)} />
                  </label>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {value.length > 0 && (
        <button type="button" className="cl-add-more" onClick={addListing}>
          <Plus size={18} /> Add another CL
        </button>
      )}
    </div>
  );
}
