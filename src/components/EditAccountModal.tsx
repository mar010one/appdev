'use client';

import { useRef, useState } from 'react';
import {
  X, User, Mail, Globe, Phone, Settings, Save, ChevronLeft,
  ShieldCheck, Building2, Key, Eye, EyeOff, FileText, Upload,
  Download, Trash2, FileImage,
} from 'lucide-react';
import { updateAccount, deleteAccountDocument } from '@/lib/actions';
import ModalPortal from './ModalPortal';

/* ─── Reveal/hide password input ──────────────────────────────────────────── */
function RevealInput({ name, defaultValue, placeholder }: { name: string; defaultValue?: string; placeholder?: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={revealed ? 'text' : 'password'}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{ paddingRight: '44px', width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setRevealed(r => !r)}
        title={revealed ? 'Hide' : 'Reveal'}
        style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 0 }}
      >
        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/* ─── Inline document preview (nested portal) ─────────────────────────────── */
function DocPreviewModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const isPDF = doc.file_path?.toLowerCase().endsWith('.pdf');
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 10000 }}
    >
      <div
        className="modal-content preview-modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>
            {doc.file_name}
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <a
              href={doc.file_path}
              download={doc.file_name}
              className="btn btn-accent"
              style={{ padding: '9px 18px', fontSize: '0.88rem', gap: '6px', textDecoration: 'none', borderRadius: '12px' }}
            >
              <Download size={15} /> Download
            </a>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        <div className="modal-body preview-modal-body">
          {isPDF ? (
            <iframe src={doc.file_path} width="100%" height="100%" style={{ border: 'none', borderRadius: '16px', minHeight: '60vh' }} />
          ) : (
            <img
              src={doc.file_path}
              alt={doc.file_name}
              style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: '16px', display: 'block', margin: '0 auto' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function EditAccountModal({ account, onUpdate }: { account: any; onUpdate?: (updated: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [localDocs, setLocalDocs] = useState<any[]>(account.documents || []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const initials = (account.developer_name || 'D')
    .split(' ')
    .map((n: string) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  /* ── Open handler — always sync docs from latest prop ───────────────────── */
  function handleOpen() {
    setLocalDocs(account.documents || []);
    setPendingFiles([]);
    setPreviewDoc(null);
    setIsOpen(true);
  }

  /* ── Submit handler ──────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(formRef.current!);
    for (const f of pendingFiles) fd.append('newDocuments', f);
    const result = await updateAccount(account.id, fd);
    setIsPending(false);
    if (result.success) {
      const freshDocs = (result as any).data?.documents ?? localDocs;
      setLocalDocs(freshDocs);
      setPendingFiles([]);
      onUpdate?.({ ...account, documents: freshDocs });
      setIsOpen(false);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  /* ── Document handlers ───────────────────────────────────────────────────── */
  async function handleDeleteDoc(docId: number) {
    setDeletingId(docId);
    const result = await deleteAccountDocument(docId);
    if (result.success) {
      setLocalDocs(prev => prev.filter((d: any) => d.id !== docId));
    } else {
      alert(result.error || 'Failed to delete document');
    }
    setDeletingId(null);
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setPendingFiles(prev => [...prev, ...Array.from(files)]);
  }

  function removePendingFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }

  /* ── Drag & drop ─────────────────────────────────────────────────────────── */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  /* ── Styles (reused) ─────────────────────────────────────────────────────── */
  const sectionCard: React.CSSProperties = {
    padding: '24px',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
  };

  const sectionHead: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  };

  const fieldCol: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="btn btn-secondary small"
        style={{ width: '40px', padding: 0, justifyContent: 'center' }}
      >
        <Settings size={16} />
      </button>

      <ModalPortal open={isOpen}>
        {/* Overlay */}
        <div
          className="modal-overlay"
          onClick={() => setIsOpen(false)}
          style={{ padding: '32px 20px', alignItems: 'flex-start' }}
        >
          {/* Dialog */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(160deg, #111118 0%, #0d0d12 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '28px',
              width: '100%',
              maxWidth: '980px',
              maxHeight: 'calc(100vh - 64px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 40px 120px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(234,179,8,0.05)',
              animation: 'modalScale 0.32s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{
              padding: '26px 36px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, transparent 55%)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Initials avatar */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '15px',
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(234,179,8,0.08))',
                  border: '1px solid rgba(234,179,8,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--accent)',
                  flexShrink: 0,
                  letterSpacing: '0.05em',
                }}>
                  {initials}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                    Edit Developer Credentials
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '3px 0 0' }}>
                    {account.developer_name}
                    {account.email ? ` · ${account.email}` : ''}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* ── Body ───────────────────────────────────────────────────────── */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 8px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Row 1: Authority + Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Account Authority */}
                <div style={sectionCard}>
                  <div style={sectionHead}>
                    <ShieldCheck size={17} color="var(--accent)" />
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>Account Authority</h4>
                  </div>
                  <div style={fieldCol}>
                    <div className="input-field">
                      <label>Status</label>
                      <select name="status" defaultValue={account.status || 'active'} style={{ width: '100%' }}>
                        <option value="active">Active / Operational</option>
                        <option value="closed">Closed / Terminated</option>
                      </select>
                    </div>
                    <div className="input-field">
                      <label>Developer Name</label>
                      <div className="input-with-icon">
                        <User size={15} />
                        <input type="text" name="developerName" defaultValue={account.developer_name} required />
                      </div>
                    </div>
                    <div className="input-field">
                      <label>Developer ID</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', fontWeight: 800 }}>#</span>
                        <input type="text" name="developerId" defaultValue={account.developer_id} style={{ paddingLeft: '34px' }} />
                      </div>
                    </div>
                    <div className="input-field">
                      <label>Company</label>
                      <div className="input-with-icon">
                        <Building2 size={15} />
                        <input type="text" name="companyName" defaultValue={account.company_name} placeholder="e.g. Butn Company" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Channels */}
                <div style={sectionCard}>
                  <div style={sectionHead}>
                    <Mail size={17} color="var(--accent)" />
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>Contact Channels</h4>
                  </div>
                  <div style={fieldCol}>
                    <div className="input-field">
                      <label>Email Address</label>
                      <div className="input-with-icon">
                        <Mail size={15} />
                        <input type="email" name="email" defaultValue={account.email} required />
                      </div>
                    </div>
                    <div className="input-field">
                      <label>Phone Number</label>
                      <div className="input-with-icon">
                        <Phone size={15} />
                        <input type="tel" name="phone" defaultValue={account.phone} />
                      </div>
                    </div>
                    <div className="input-field">
                      <label>Website</label>
                      <div className="input-with-icon">
                        <Globe size={15} />
                        <input type="url" name="website" defaultValue={account.website} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Secure Credentials */}
              <div style={sectionCard}>
                <div style={sectionHead}>
                  <Key size={17} color="var(--accent)" />
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>Secure Developer Credentials</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '4px' }}>
                    — click the eye icon to reveal
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-field">
                    <label>Account Password</label>
                    <RevealInput name="devPassword" defaultValue={account.dev_password} placeholder="Developer account password" />
                  </div>
                  <div className="input-field">
                    <label>2FA / Backup Code</label>
                    <RevealInput name="dev2faSecret" defaultValue={account.dev_2fa_secret} placeholder="TOTP secret or backup codes" />
                  </div>
                  <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Security Notes</label>
                    <textarea
                      name="devSecurityNotes"
                      defaultValue={account.dev_security_notes}
                      placeholder="Recovery email, backup phone, security questions, etc."
                      rows={3}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Documents */}
              <div style={sectionCard}>
                <div style={{ ...sectionHead, marginBottom: '16px' }}>
                  <FileText size={17} color="var(--accent)" />
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>Verification Documents</h4>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)',
                    background: 'rgba(255,255,255,0.07)', padding: '3px 10px', borderRadius: '20px',
                  }}>
                    {localDocs.length + pendingFiles.length} file{localDocs.length + pendingFiles.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Existing documents */}
                {localDocs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {localDocs.map((doc: any) => {
                      const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(doc.file_path || '');
                      const isDeleting = deletingId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '11px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px',
                            opacity: isDeleting ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <div style={{ color: 'var(--accent)', opacity: 0.75, flexShrink: 0 }}>
                            {isImg ? <FileImage size={17} /> : <FileText size={17} />}
                          </div>
                          <span style={{ flex: 1, fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.file_name}
                          </span>
                          <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '5px', borderRadius: '10px' }}
                            >
                              <Eye size={13} /> View
                            </button>
                            <a
                              href={doc.file_path}
                              download={doc.file_name}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '5px', borderRadius: '10px', textDecoration: 'none' }}
                            >
                              <Download size={13} /> Download
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id)}
                              disabled={isDeleting}
                              className="btn btn-secondary"
                              style={{
                                padding: '6px 10px', borderRadius: '10px',
                                color: '#f87171', borderColor: 'rgba(248,113,113,0.25)',
                              }}
                              title="Delete document"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Queued files */}
                {pendingFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '2px' }}>
                      Queued for upload — {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
                    </p>
                    {pendingFiles.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '11px',
                          padding: '9px 14px',
                          background: 'rgba(234,179,8,0.06)',
                          border: '1px solid rgba(234,179,8,0.2)',
                          borderRadius: '12px',
                        }}
                      >
                        <FileText size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', flexShrink: 0 }}>
                          {f.size < 1024 * 1024
                            ? `${(f.size / 1024).toFixed(0)} KB`
                            : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingFile(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0, flexShrink: 0 }}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drop zone */}
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    padding: '22px 20px', cursor: 'pointer',
                    borderRadius: '16px',
                    border: dragOver ? '2px dashed var(--accent)' : '2px dashed rgba(255,255,255,0.1)',
                    background: dragOver ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: dragOver ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.09)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}>
                    <Upload size={19} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '3px' }}>
                      {dragOver ? 'Drop files here' : 'Click to upload or drag & drop'}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>PDF, JPG, PNG accepted</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                  />
                </label>
              </div>

            </form>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <div style={{
              padding: '18px 36px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(10,10,16,0.96)',
              backdropFilter: 'blur(20px)',
              flexShrink: 0,
            }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                <ChevronLeft size={16} /> Cancel
              </button>
              <button
                type="button"
                className="btn btn-accent btn-glow"
                disabled={isPending}
                onClick={() => formRef.current?.requestSubmit()}
                style={{ gap: '8px' }}
              >
                <Save size={16} />
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Document preview nested modal */}
        {previewDoc && (
          <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
        )}
      </ModalPortal>
    </>
  );
}
