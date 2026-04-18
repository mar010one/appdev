'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, X, User, Mail, Globe, Phone, ShieldCheck,
  Building2, Key, Eye, EyeOff, FileText, File, FileImage, Upload,
  ChevronDown, Check, Loader2, Sparkles, CreditCard,
} from 'lucide-react';
import { addAccount, addCompanyName } from '@/lib/actions';
import ModalPortal from './ModalPortal';

function RevealInput({ name, placeholder }: { name: string; placeholder?: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={revealed ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        style={{ paddingRight: '40px', width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setRevealed(r => !r)}
        title={revealed ? 'Hide' : 'Reveal'}
        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 0 }}
      >
        {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
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
  if (ext === 'pdf') return <FileText size={14} style={{ color: '#f87171', flexShrink: 0 }} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={14} style={{ color: '#60a5fa', flexShrink: 0 }} />;
  return <File size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />;
}

const iconStyle = (accent = false): import('react').CSSProperties => ({
  position: 'absolute', left: '13px', color: accent ? 'var(--accent)' : 'var(--muted)', opacity: 0.85, flexShrink: 0,
});

export default function CreateAccountModal({ companies = [] }: { companies?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formEl, setFormEl] = useState<HTMLFormElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCompany, setSelectedCompany] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [newCompanyInput, setNewCompanyInput] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [localCompanies, setLocalCompanies] = useState<{ id: number; name: string }[]>(
    companies.map(c => ({ id: c.id, name: c.name }))
  );

  // Sync when the server re-sends updated companies (e.g., after navigation)
  useEffect(() => {
    setLocalCompanies(prev => {
      const fromProp = companies.map(c => ({ id: c.id, name: c.name }));
      const fromPropIds = new Set(fromProp.map(c => c.id));
      // Preserve any companies created in this session that aren't in the prop yet
      const sessionOnly = prev.filter(c => !fromPropIds.has(c.id));
      return [...fromProp, ...sessionOnly];
    });
  }, [companies]);

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

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    formData.delete('documents');
    for (const file of files) formData.append('documents', file);
    formData.set('companyName', selectedCompany);
    const result = await addAccount(formData);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
      setFiles([]);
      setSelectedCompany('');
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  async function handleCreateCompany() {
    if (!newCompanyInput.trim()) return;
    setIsCreatingCompany(true);
    const result = await addCompanyName(newCompanyInput.trim());
    setIsCreatingCompany(false);
    if (result.success && result.data) {
      const created = result.data;
      setLocalCompanies(prev => [...prev, created]);
      setSelectedCompany(created.name);
      setShowCreatePopup(false);
      setNewCompanyInput('');
    } else {
      alert(result.error || 'Failed to create company');
    }
  }

  function handleClose() {
    setIsOpen(false);
    setFiles([]);
    setSelectedCompany('');
    setPickerOpen(false);
    setShowCreatePopup(false);
    setNewCompanyInput('');
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        <Plus size={20} />
        New Developer Account
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={handleClose}>
          <div
            className="modal-content"
            style={{ maxWidth: '680px', borderRadius: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Header ── */}
            <div className="modal-header" style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ShieldCheck size={17} color="var(--accent)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Register Client Account</h2>
                  <p className="text-muted" style={{ fontSize: '0.71rem', margin: '1px 0 0' }}>Developer identity & legal verification</p>
                </div>
              </div>
              <button className="modal-close" style={{ width: '32px', height: '32px' }} onClick={handleClose}>
                <X size={16} />
              </button>
            </div>

            {/* ── Body ── */}
            <form
              ref={setFormEl}
              action={handleSubmit}
              className="modal-body"
              style={{ padding: '18px 22px 20px', gap: '11px', display: 'flex', flexDirection: 'column' }}
            >

              {/* Platform */}
              <div className="input-field">
                <label>Platform Type</label>
                <select name="type" required style={{ width: '100%' }}>
                  <option value="google_play">Google Play Console</option>
                  <option value="apple_store">App Store Connect</option>
                </select>
              </div>

              {/* Developer Name + ID */}
              <div className="grid-2" style={{ gap: '10px' }}>
                <div className="input-field">
                  <label>Developer Name</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User size={14} style={iconStyle(true)} />
                    <input type="text" name="developerName" placeholder="e.g., Nexus Digital" style={{ paddingLeft: '36px', width: '100%' }} required />
                  </div>
                </div>
                <div className="input-field">
                  <label>Developer ID</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '13px', color: 'var(--accent)', fontWeight: 800, fontSize: '0.85rem' }}>#</span>
                    <input type="text" name="developerId" placeholder="123456789" style={{ paddingLeft: '28px', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Company picker */}
              <div className="input-field" style={{ position: 'relative' }} ref={pickerRef}>
                <label>Company</label>
                <input type="hidden" name="companyName" value={selectedCompany} />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '10px 13px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${pickerOpen ? 'rgba(234,179,8,0.5)' : 'var(--card-border)'}`,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem',
                    color: selectedCompany ? 'var(--foreground)' : 'var(--muted)',
                    textAlign: 'left', transition: 'border-color 0.2s',
                  }}
                >
                  <Building2 size={14} color={selectedCompany ? 'var(--accent)' : 'var(--muted)'} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{selectedCompany || 'Select or create a company…'}</span>
                  <ChevronDown size={13} color="var(--muted)" style={{ flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {pickerOpen && (
                  <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                )}

                {pickerOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 200,
                    background: 'linear-gradient(160deg, #16161e 0%, #111118 100%)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                    boxShadow: '0 16px 48px -8px rgba(0,0,0,0.85)',
                    overflow: 'hidden', animation: 'modalScale 0.18s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    {localCompanies.length > 0 && (
                      <div style={{ maxHeight: '170px', overflowY: 'auto' }}>
                        <div style={{ padding: '8px 13px 4px', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Existing
                        </div>
                        {localCompanies.map((co) => (
                          <button
                            key={co.id}
                            type="button"
                            onClick={() => { setSelectedCompany(co.name); setPickerOpen(false); }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '8px 13px', background: selectedCompany === co.name ? 'rgba(234,179,8,0.08)' : 'none',
                              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
                              color: 'var(--foreground)', textAlign: 'left', transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => (e.currentTarget.style.background = selectedCompany === co.name ? 'rgba(234,179,8,0.08)' : 'none')}
                          >
                            <Building2 size={13} color="var(--muted)" style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{co.name}</span>
                            {selectedCompany === co.name && <Check size={12} color="var(--accent)" />}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: localCompanies.length > 0 ? '3px 0' : 0 }} />
                    <button
                      type="button"
                      onClick={() => { setPickerOpen(false); setShowCreatePopup(true); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '9px 13px', background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Plus size={13} />
                      Create new company…
                    </button>
                  </div>
                )}
              </div>

              {/* Email + Phone */}
              <div className="grid-2" style={{ gap: '10px' }}>
                <div className="input-field">
                  <label>Email Address</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={14} style={iconStyle(true)} />
                    <input type="email" name="email" placeholder="client@example.com" style={{ paddingLeft: '36px', width: '100%' }} required />
                  </div>
                </div>
                <div className="input-field">
                  <label>Phone Number</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Phone size={14} style={iconStyle(true)} />
                    <input type="tel" name="phone" placeholder="+1..." style={{ paddingLeft: '36px', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Website */}
              <div className="input-field">
                <label>Website</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Globe size={14} style={iconStyle(true)} />
                  <input type="url" name="website" placeholder="https://..." style={{ paddingLeft: '36px', width: '100%' }} />
                </div>
              </div>

              {/* Verification Documents */}
              <div className="input-field">
                <label>
                  Verification Documents
                  {files.length > 0 && <span className="doc-badge">{files.length} file{files.length > 1 ? 's' : ''}</span>}
                </label>
                <div
                  className={`doc-upload-zone${isDragging ? ' dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '14px 18px' }}
                >
                  <div className="doc-upload-icon-wrap" style={{ width: '32px', height: '32px', borderRadius: '9px' }}>
                    <Upload size={15} />
                  </div>
                  <div className="doc-upload-text">
                    <span className="doc-upload-primary" style={{ fontSize: '0.85rem' }}>
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
                        <button type="button" className="doc-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }} title="Remove">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Secure Credentials ── */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Key size={13} color="var(--accent)" />
                  <span style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Secure Credentials
                  </span>
                  <span style={{ fontSize: '0.71rem', color: 'var(--muted)', fontWeight: 400, textTransform: 'none' }}>— optional</span>
                </div>

                <div className="grid-2" style={{ gap: '10px' }}>
                  <div className="input-field">
                    <label>Account Password</label>
                    <RevealInput name="devPassword" placeholder="Account password" />
                  </div>
                  <div className="input-field">
                    <label>2FA / Backup Code</label>
                    <RevealInput name="dev2faSecret" placeholder="TOTP secret" />
                  </div>
                </div>

                <div className="input-field">
                  <label>Security Notes</label>
                  <textarea
                    name="devSecurityNotes"
                    placeholder="Recovery email, backup phone, security questions, etc."
                    rows={2}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* ── VCC Information ── */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <CreditCard size={13} color="var(--accent)" />
                  <span style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    VCC Information
                  </span>
                  <span style={{ fontSize: '0.71rem', color: 'var(--muted)', fontWeight: 400, textTransform: 'none' }}>— virtual credit card</span>
                </div>

                <div className="grid-2" style={{ gap: '10px' }}>
                  <div className="input-field">
                    <label>Card Number</label>
                    <RevealInput name="vccNumber" placeholder="•••• •••• •••• ••••" />
                  </div>
                  <div className="input-field">
                    <label>CVV</label>
                    <RevealInput name="vccCvv" placeholder="•••" />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: '10px' }}>
                  <div className="input-field">
                    <label>Cardholder Name</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <User size={14} style={iconStyle(true)} />
                      <input type="text" name="vccHolder" placeholder="Name on card" style={{ paddingLeft: '36px', width: '100%' }} />
                    </div>
                  </div>
                  <div className="input-field">
                    <label>Expiry Date</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <CreditCard size={14} style={iconStyle(true)} />
                      <input type="text" name="vccExpiry" placeholder="MM/YY" maxLength={5} style={{ paddingLeft: '36px', width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="input-field">
                  <label>Note</label>
                  <textarea
                    name="vccNotes"
                    placeholder="Bank, issuer, balance limit, usage notes, etc."
                    rows={2}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>
            </form>

            {/* ── Footer ── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(12,12,14,0.6)',
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.86rem', borderRadius: '12px' }}
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-accent btn-glow"
                style={{ padding: '9px 18px', fontSize: '0.86rem', borderRadius: '12px' }}
                disabled={isPending}
                onClick={() => { if (formEl) formEl.requestSubmit(); }}
              >
                <ShieldCheck size={15} />
                {isPending ? 'Saving…' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Create Company Mini Popup ── */}
        {showCreatePopup && (
          <div
            onClick={() => { setShowCreatePopup(false); setNewCompanyInput(''); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '380px',
                background: 'linear-gradient(160deg, #16161e 0%, #0f0f14 100%)',
                border: '1px solid rgba(234,179,8,0.2)', borderRadius: '20px',
                padding: '26px', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.95)',
                animation: 'modalScale 0.25s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                  background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={18} color="var(--accent)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>New Company</h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--muted)', margin: '3px 0 0' }}>
                    Enter a name — add details in Companies later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCreatePopup(false); setNewCompanyInput(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '2px', flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Company Name
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={15} color="var(--muted)" style={{ position: 'absolute', left: '13px', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g., Nexus Digital SARL"
                    value={newCompanyInput}
                    onChange={e => setNewCompanyInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleCreateCompany(); }
                      if (e.key === 'Escape') { setShowCreatePopup(false); setNewCompanyInput(''); }
                    }}
                    style={{ width: '100%', paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowCreatePopup(false); setNewCompanyInput(''); }}
                  style={{
                    padding: '9px 18px', borderRadius: '11px', fontSize: '0.85rem', fontWeight: 600,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCompany}
                  disabled={isCreatingCompany || !newCompanyInput.trim()}
                  style={{
                    padding: '9px 18px', borderRadius: '11px', fontSize: '0.85rem', fontWeight: 700,
                    background: newCompanyInput.trim() ? 'linear-gradient(135deg, #eab308, #ca8a04)' : 'rgba(234,179,8,0.15)',
                    border: 'none', color: newCompanyInput.trim() ? '#000' : 'rgba(234,179,8,0.4)',
                    cursor: newCompanyInput.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: newCompanyInput.trim() ? '0 4px 18px rgba(234,179,8,0.3)' : 'none',
                  }}
                >
                  {isCreatingCompany
                    ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
                    : <><Sparkles size={14} /> Create</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </>
  );
}
