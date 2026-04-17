'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, X, User, Mail, Globe, Phone, ShieldCheck, ChevronLeft, Building2, Key, Eye, EyeOff, FileText, File, FileImage, Upload } from 'lucide-react';
import { addAccount } from '@/lib/actions';
import ModalPortal from './ModalPortal';

function RevealInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={revealed ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        style={{ paddingRight: '44px', width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setRevealed(r => !r)}
        title={revealed ? 'Hide' : 'Reveal'}
        style={{
          position: 'absolute',
          right: '14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          padding: 0,
        }}
      >
        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FileText size={15} style={{ color: '#f87171', flexShrink: 0 }} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />;
  return <File size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />;
}

export default function CreateAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...arr.filter(f => !existing.has(f.name + f.size))];
    });
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    formData.delete('documents');
    for (const file of files) {
      formData.append('documents', file);
    }
    const result = await addAccount(formData);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
      setFiles([]);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  function handleClose() {
    setIsOpen(false);
    setFiles([]);
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        <Plus size={20} />
        New Developer Account
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay fullscreen" onClick={handleClose}>
          <div className="modal-content fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <ShieldCheck size={24} color="var(--accent)" />
                </div>
                <div>
                  <h2>Register Client Account</h2>
                  <p className="text-muted">Set up a new workspace for developer identity and legal verification.</p>
                </div>
              </div>
              <button className="modal-close" onClick={handleClose}>
                <X size={24} />
              </button>
            </div>

            <form ref={setFormEl} action={handleSubmit} className="modal-body max-w-screen">
              <div className="form-split-view">

                {/* Left Column: Business Identity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div className="section-title">
                    <User size={20} color="var(--accent)" />
                    <h4>Business Identity</h4>
                  </div>

                  <div className="form-grid-large" style={{ gap: '20px' }}>
                    <div className="input-field">
                      <label>Platform Type</label>
                      <select name="type" className="glass-select" required>
                        <option value="google_play">Google Play Console</option>
                        <option value="apple_store">App Store Connect</option>
                      </select>
                    </div>

                    <div className="grid-2" style={{ gap: '20px' }}>
                      <div className="input-field">
                        <label>Developer Name</label>
                        <div className="input-with-icon-large">
                          <User size={20} />
                          <input type="text" name="developerName" placeholder="e.g., Nexus Digital" required />
                        </div>
                      </div>
                      <div className="input-field">
                        <label>Developer ID</label>
                        <div className="input-with-icon-large">
                          <span style={{ position: 'absolute', left: '20px', color: 'var(--accent)', fontWeight: 800 }}>#</span>
                          <input type="text" name="developerId" placeholder="123456789" style={{ paddingLeft: '45px' }} />
                        </div>
                      </div>
                    </div>

                    <div className="input-field">
                      <label>Company (Butn Company)</label>
                      <div className="input-with-icon-large">
                        <Building2 size={20} />
                        <input type="text" name="companyName" placeholder="e.g. Butn Company" />
                      </div>
                    </div>

                    <div className="input-field">
                      <label>Website</label>
                      <div className="input-with-icon-large">
                        <Globe size={20} />
                        <input type="url" name="website" placeholder="https://..." />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Contact & Verification */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div className="section-title">
                    <Mail size={20} color="var(--accent)" />
                    <h4>Contact & Verification</h4>
                  </div>

                  <div className="form-grid-large" style={{ gap: '20px' }}>
                    <div className="grid-2" style={{ gap: '20px' }}>
                      <div className="input-field">
                        <label>Email Address</label>
                        <div className="input-with-icon-large">
                          <Mail size={20} />
                          <input type="email" name="email" placeholder="client@example.com" required />
                        </div>
                      </div>
                      <div className="input-field">
                        <label>Phone Number</label>
                        <div className="input-with-icon-large">
                          <Phone size={20} />
                          <input type="tel" name="phone" placeholder="+1..." />
                        </div>
                      </div>
                    </div>

                    {/* Modern drag-and-drop upload zone */}
                    <div className="input-field">
                      <label>
                        Verification Documents
                        {files.length > 0 && (
                          <span className="doc-badge">{files.length} file{files.length > 1 ? 's' : ''}</span>
                        )}
                      </label>
                      <div
                        className={`doc-upload-zone${isDragging ? ' dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="doc-upload-icon-wrap">
                          <Upload size={20} />
                        </div>
                        <div className="doc-upload-text">
                          <span className="doc-upload-primary">
                            {isDragging ? 'Drop files here' : 'Click or drag & drop'}
                          </span>
                          <span className="doc-upload-secondary">PDF, images — multiple files supported</span>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => e.target.files && addFiles(e.target.files)}
                        />
                      </div>

                      {files.length > 0 && (
                        <div className="doc-file-list">
                          {files.map((file, i) => (
                            <div key={i} className="doc-file-item">
                              <FileTypeIcon name={file.name} />
                              <div className="doc-file-info">
                                <span className="doc-file-name">{file.name}</span>
                                <span className="doc-file-size">{formatFileSize(file.size)}</span>
                              </div>
                              <button
                                type="button"
                                className="doc-file-remove"
                                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                title="Remove file"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Secure Credentials — full width */}
              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="section-title">
                  <Key size={20} color="var(--accent)" />
                  <h4>Secure Developer Credentials</h4>
                </div>
                <p className="text-muted" style={{ marginTop: '-10px', fontSize: '0.82rem' }}>
                  Optional. Store the account password, 2FA secret, and security notes securely.
                </p>

                <div className="form-grid-large" style={{ gap: '20px' }}>
                  <div className="input-field">
                    <label>Account Password</label>
                    <RevealInput name="devPassword" placeholder="Developer account password" />
                  </div>

                  <div className="input-field">
                    <label>2FA / Backup Code</label>
                    <RevealInput name="dev2faSecret" placeholder="TOTP secret or backup codes" />
                  </div>

                  <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Security Notes</label>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <FileText size={18} style={{ marginTop: '14px', flexShrink: 0, color: 'var(--muted)' }} />
                      <textarea
                        name="devSecurityNotes"
                        placeholder="Recovery email, backup phone, security questions, etc."
                        rows={3}
                        style={{ flex: 1, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="modal-footer sticky-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                <ChevronLeft size={18} /> Cancel
              </button>
              <button
                type="submit"
                className="btn btn-accent btn-glow"
                disabled={isPending}
                onClick={() => { if (formEl) formEl.requestSubmit(); }}
              >
                <ShieldCheck size={18} style={{ marginRight: '8px' }} />
                {isPending ? 'Verified & Saving...' : 'Confirm Account Registration'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
