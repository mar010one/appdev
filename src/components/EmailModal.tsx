'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  LifeBuoy,
  Link2,
  Mail,
  Phone,
  ShieldCheck,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { addEmail, updateEmail } from '@/lib/actions';
import { uploadFilesInForm } from '@/lib/upload-client';

type EmailEntry = {
  id: number;
  email: string;
  password: string;
  auth: string;
  note: string;
  image_path: string;
  phone: string;
  recovery_email: string;
  linked_account_id: number | null;
  linked_company_id: number | null;
};

export default function EmailModal({
  open,
  mode,
  email,
  accounts,
  companies,
  onClose,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  email?: EmailEntry | null;
  accounts: any[];
  companies: any[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageRemoved, setImageRemoved] = useState(false);
  // The chosen file is kept in state — NOT read from the <input> at submit —
  // because the input gets unmounted as soon as a preview is shown, which would
  // otherwise drop the file and silently save no image.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset transient UI state whenever the modal (re)opens.
  useEffect(() => {
    if (open) {
      setShowPassword(false);
      setImageRemoved(false);
      setImageFile(null);
      setImagePreview(email?.image_path || '');
    }
  }, [open, email]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageRemoved(false);
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview('');
    setImageRemoved(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    // Attach the picked image from state (the input may already be unmounted).
    fd.delete('image');
    fd.delete('image__filename');
    if (imageFile && !imageRemoved) {
      let toUpload = imageFile;
      try {
        toUpload = await compressImage(imageFile);
      } catch {
        /* fall back to the original file if compression fails */
      }
      fd.append('image', toUpload);
    }
    fd.set('existingImage', imageRemoved ? '' : email?.image_path || '');
    fd.set('removeImage', imageRemoved ? '1' : '0');

    try {
      await uploadFilesInForm(fd, { image: { bucket: 'emails', prefix: 'email-' } });
    } catch (err: any) {
      setIsPending(false);
      alert(err?.message || 'Image upload failed');
      return;
    }

    const result =
      mode === 'edit' && email
        ? await updateEmail(email.id, fd)
        : await addEmail(fd);

    setIsPending(false);
    if (result.success) {
      onClose();
      router.refresh();
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  const accent = '#eab308';

  return (
    <ModalPortal open={open}>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: 560, width: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                className="app-icon-preview"
                style={{ background: 'var(--accent-glow)' }}
              >
                <Mail size={22} color={accent} />
              </div>
              <div>
                <h2>{mode === 'edit' ? 'Edit Email' : email ? 'Save Email Details' : 'Add Email'}</h2>
                <p className="text-muted">
                  {mode === 'add' && email
                    ? 'Fill in the password / 2FA and save this account email to the vault.'
                    : 'Store credentials, 2FA and a screenshot — all in one place.'}
                </p>
              </div>
            </div>
            <button className="modal-close" onClick={onClose} type="button">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Email */}
              <div className="form-group">
                <label className="form-label" style={labelRow}>
                  <Mail size={13} color={accent} /> Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={email?.email || ''}
                  placeholder="name@example.com"
                  className="form-input"
                  autoComplete="off"
                />
              </div>

              {/* Phone + Recovery email */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label" style={labelRow}>
                    <Phone size={13} color={accent} /> Phone Number
                  </label>
                  <input
                    name="phone"
                    defaultValue={email?.phone || ''}
                    placeholder="+212 6 00 00 00 00"
                    className="form-input"
                    autoComplete="off"
                    style={{ width: '100%', maxWidth: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label" style={labelRow}>
                    <LifeBuoy size={13} color={accent} /> Security / Recovery Email
                  </label>
                  <input
                    name="recoveryEmail"
                    type="email"
                    defaultValue={email?.recovery_email || ''}
                    placeholder="recovery@example.com"
                    className="form-input"
                    autoComplete="off"
                    style={{ width: '100%', maxWidth: '100%' }}
                  />
                </div>
              </div>

              {/* Password + Auth */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label" style={labelRow}>
                    <KeyRound size={13} color={accent} /> Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      defaultValue={email?.password || ''}
                      placeholder="••••••••"
                      className="form-input"
                      autoComplete="new-password"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? 'Hide' : 'Show'}
                      style={revealBtn}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={labelRow}>
                    <ShieldCheck size={13} color={accent} /> Authentication / 2FA
                  </label>
                  <textarea
                    name="auth"
                    rows={2}
                    defaultValue={email?.auth || ''}
                    placeholder="2FA secret, backup codes, recovery email…"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Links */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label" style={labelRow}>
                    <Link2 size={13} color={accent} /> Developer Account
                  </label>
                  <select
                    name="linkedAccountId"
                    className="form-input"
                    defaultValue={email?.linked_account_id ?? ''}
                    style={{ width: '100%', maxWidth: '100%' }}
                  >
                    <option value="">— Auto-detect by email —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.developer_name || a.email}
                        {a.developer_id ? ` (#${a.developer_id})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label" style={labelRow}>
                    <Building2 size={13} color={accent} /> Company
                  </label>
                  <select
                    name="linkedCompanyId"
                    className="form-input"
                    defaultValue={email?.linked_company_id ?? ''}
                    style={{ width: '100%', maxWidth: '100%' }}
                  >
                    <option value="">— None / from account —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label" style={labelRow}>
                  <StickyNote size={13} color={accent} /> Note
                </label>
                <textarea
                  name="note"
                  rows={2}
                  defaultValue={email?.note || ''}
                  placeholder="Where this email is used, who owns it, anything useful…"
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Image upload */}
              <div className="form-group">
                <label className="form-label" style={labelRow}>
                  <ImagePlus size={13} color={accent} /> Screenshot / Image
                </label>
                {imagePreview ? (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--card-border)',
                      maxWidth: 220,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 160, objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Remove image"
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px 16px', borderRadius: 12,
                      border: '2px dashed var(--card-border)', cursor: 'pointer',
                      color: 'var(--muted)', fontSize: '0.85rem',
                    }}
                  >
                    <ImagePlus size={18} color={accent} />
                    Click to upload an image
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>
                )}
                {/* Keep the file input mounted even when a preview shows, so a new
                    pick can replace the current one. */}
                {imagePreview && (
                  <label style={{ marginTop: 8, display: 'inline-block', fontSize: '0.78rem', color: accent, cursor: 'pointer' }}>
                    Replace image
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : email ? 'Save to Vault' : 'Add Email'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

/** Downscale a screenshot to a max long-side and re-encode as JPEG so uploads
 *  are fast. Aspect ratio is preserved (no crop). Falls back to the caller's
 *  catch on any failure. Tiny images are returned untouched. */
async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size <= 300 * 1024) return file; // already small — skip the work

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = bitmapUrl;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file; // no win — keep original
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

const labelRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const revealBtn: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 30,
  height: 30,
  borderRadius: 7,
  background: 'transparent',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--muted)',
};
