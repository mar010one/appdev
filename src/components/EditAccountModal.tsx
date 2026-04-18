'use client';

import { useRef, useState } from 'react';
import {
  X, User, Mail, Globe, Phone, Settings, Save, ChevronLeft,
  ShieldCheck, Building2, Key, Eye, EyeOff, FileText, Upload,
  Download, Trash2, FileImage, CreditCard, Check, Loader2, Plus, Link2,
  ChevronDown, Sparkles,
} from 'lucide-react';
import { updateAccount, deleteAccountDocument, addCompanyQuick, linkCompanyToAccount, addCompanyName } from '@/lib/actions';
import { uploadFilesInForm } from '@/lib/upload-client';
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
type CompanyEntry = { id: number; name: string; isLinked: boolean; isLinking?: boolean };

export default function EditAccountModal({
  account,
  allCompanies = [],
  onUpdate,
}: {
  account: any;
  allCompanies?: any[];
  onUpdate?: (updated: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [localDocs, setLocalDocs] = useState<any[]>(account.documents || []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // All companies — showing linked status relative to this account
  const buildCompanyList = (): CompanyEntry[] =>
    allCompanies.map((co) => ({ id: co.id, name: co.name, isLinked: co.linked_account_id === account.id }));

  const [localCompanies, setLocalCompanies] = useState<CompanyEntry[]>(buildCompanyList);
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Company picker (replaces plain text input in Account Authority)
  const [selectedCompany, setSelectedCompany] = useState(account.company_name || '');
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [showCreateCompanyPopup, setShowCreateCompanyPopup] = useState(false);
  const [createCompanyInput, setCreateCompanyInput] = useState('');
  const [isCreatingCompanyForPicker, setIsCreatingCompanyForPicker] = useState(false);

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
    setLocalCompanies(buildCompanyList());
    setAddingCompany(false);
    setNewCompanyName('');
    setSelectedCompany(account.company_name || '');
    setCompanyPickerOpen(false);
    setShowCreateCompanyPopup(false);
    setCreateCompanyInput('');
    setIsOpen(true);
  }

  /* ── Create company from picker popup ──────────────────────────────────── */
  async function handleCreateCompanyForPicker() {
    if (!createCompanyInput.trim()) return;
    setIsCreatingCompanyForPicker(true);
    const result = await addCompanyName(createCompanyInput.trim());
    setIsCreatingCompanyForPicker(false);
    if (result.success && result.data) {
      const created = result.data;
      // Add to the local list and select it
      setLocalCompanies(prev => [...prev, { id: created.id, name: created.name, isLinked: false }]);
      setSelectedCompany(created.name);
      setShowCreateCompanyPopup(false);
      setCreateCompanyInput('');
    } else {
      alert(result.error || 'Failed to create company');
    }
  }

  /* ── Link an existing company to this account ──────────────────────────── */
  async function handleLink(companyId: number) {
    setLocalCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isLinking: true } : c));
    const result = await linkCompanyToAccount(companyId, account.id);
    if (result.success) {
      setLocalCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isLinked: true, isLinking: false } : c));
    } else {
      setLocalCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isLinking: false } : c));
      alert(result.error || 'Failed to link company');
    }
  }

  /* ── Quick company creation ─────────────────────────────────────────────── */
  async function handleAddCompany() {
    if (!newCompanyName.trim()) return;
    setIsSavingCompany(true);
    const result = await addCompanyQuick(newCompanyName.trim(), account.id);
    setIsSavingCompany(false);
    if (result.success && result.data) {
      setLocalCompanies(prev => [...prev, { id: result.data!.id, name: result.data!.name, isLinked: true }]);
      setNewCompanyName('');
      setAddingCompany(false);
    } else {
      alert(result.error || 'Failed to create company');
    }
  }

  /* ── Submit handler ──────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(formRef.current!);
    // Override companyName from picker state (hidden input carries it)
    fd.set('companyName', selectedCompany);
    for (const f of pendingFiles) fd.append('newDocuments', f);

    try {
      await uploadFilesInForm(fd, {
        newDocuments: { bucket: 'documents' },
      });
    } catch (err: any) {
      setIsPending(false);
      alert(err?.message || 'File upload failed');
      return;
    }

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
                    {/* ── Company Picker ── */}
                    <div className="input-field" style={{ position: 'relative' }}>
                      <label>Company</label>
                      <input type="hidden" name="companyName" value={selectedCompany} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCompanyPickerOpen(v => !v); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 14px', borderRadius: '12px',
                          background: 'var(--glass)',
                          border: `1.5px solid ${companyPickerOpen ? 'rgba(234,179,8,0.5)' : 'var(--card-border)'}`,
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem',
                          color: selectedCompany ? 'var(--foreground)' : 'var(--muted)',
                          textAlign: 'left', transition: 'border-color 0.2s',
                        }}
                      >
                        <Building2 size={14} color={selectedCompany ? 'var(--accent)' : 'var(--muted)'} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{selectedCompany || 'Select or create a company…'}</span>
                        <ChevronDown size={14} color="var(--muted)" style={{ flexShrink: 0, transform: companyPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>

                      {/* Backdrop */}
                      {companyPickerOpen && (
                        <div onClick={() => setCompanyPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                      )}

                      {/* Dropdown */}
                      {companyPickerOpen && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                          background: 'linear-gradient(160deg, #16161e 0%, #111118 100%)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.9)', overflow: 'hidden',
                        }}>
                          {localCompanies.length > 0 && (
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              <div style={{ padding: '8px 14px 4px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                                Companies
                              </div>
                              {localCompanies.map((co) => (
                                <button
                                  key={co.id}
                                  type="button"
                                  onClick={() => { setSelectedCompany(co.name); setCompanyPickerOpen(false); }}
                                  style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                                    padding: '9px 14px', background: selectedCompany === co.name ? 'rgba(234,179,8,0.08)' : 'none',
                                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.87rem',
                                    color: 'var(--foreground)', textAlign: 'left',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = selectedCompany === co.name ? 'rgba(234,179,8,0.08)' : 'none')}
                                >
                                  <Building2 size={13} color="var(--muted)" style={{ flexShrink: 0 }} />
                                  <span style={{ flex: 1 }}>{co.name}</span>
                                  {selectedCompany === co.name && <Check size={13} color="var(--accent)" />}
                                </button>
                              ))}
                            </div>
                          )}
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                          <button
                            type="button"
                            onClick={() => { setCompanyPickerOpen(false); setShowCreateCompanyPopup(true); }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                              padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: '0.87rem', color: 'var(--accent)', fontWeight: 700, textAlign: 'left',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <Plus size={14} /> Create new company…
                          </button>
                        </div>
                      )}
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

              {/* Row 3: VCC — Virtual Credit Card for Google Play registration */}
              <div style={sectionCard}>
                <div style={sectionHead}>
                  <CreditCard size={17} color="var(--accent)" />
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>VCC — Google Play Registration</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '4px' }}>
                    — virtual card used to open the account
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Card Number</label>
                    <RevealInput name="vccNumber" defaultValue={account.vcc_number} placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="input-field">
                    <label>Cardholder Name</label>
                    <div className="input-with-icon">
                      <User size={15} />
                      <input type="text" name="vccHolder" defaultValue={account.vcc_holder} placeholder="Name on card" />
                    </div>
                  </div>
                  <div className="input-field">
                    <label>Expiry Date</label>
                    <div className="input-with-icon">
                      <CreditCard size={15} />
                      <input type="text" name="vccExpiry" defaultValue={account.vcc_expiry} placeholder="MM/YY" />
                    </div>
                  </div>
                  <div className="input-field">
                    <label>CVV</label>
                    <RevealInput name="vccCvv" defaultValue={account.vcc_cvv} placeholder="•••" />
                  </div>
                </div>
              </div>

              {/* Row 4: Companies */}
              <div style={sectionCard}>
                <div style={{ ...sectionHead, marginBottom: '16px' }}>
                  <Building2 size={17} color="var(--accent)" />
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.01em' }}>Companies</h4>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)',
                    background: 'rgba(255,255,255,0.07)', padding: '3px 10px', borderRadius: '20px',
                  }}>
                    {localCompanies.filter(c => c.isLinked).length} linked
                  </span>
                </div>

                {/* List of all companies */}
                {localCompanies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', maxHeight: '220px', overflowY: 'auto' }}>
                    {localCompanies.map((co) => (
                      <div
                        key={co.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 14px',
                          background: co.isLinked ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${co.isLinked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '12px',
                        }}
                      >
                        <Building2 size={14} color={co.isLinked ? '#22c55e' : 'var(--muted)'} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.87rem', fontWeight: 600 }}>{co.name}</span>
                        {co.isLinked ? (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, color: '#22c55e',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)',
                          }}>
                            <Check size={10} /> Linked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLink(co.id)}
                            disabled={co.isLinking}
                            style={{
                              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', borderRadius: '6px',
                              background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
                              color: 'var(--accent)', fontFamily: 'inherit',
                            }}
                          >
                            {co.isLinking ? <Loader2 size={10} className="animate-spin" /> : <Link2 size={10} />}
                            {co.isLinking ? 'Linking…' : 'Select'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '14px' }}>
                    No companies yet. Create one below.
                  </p>
                )}

                {/* Quick create */}
                {addingCompany ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Company name"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompany(); } }}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={handleAddCompany}
                      disabled={isSavingCompany || !newCompanyName.trim()}
                      style={{ gap: '6px', padding: '9px 16px', flexShrink: 0 }}
                    >
                      {isSavingCompany ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setAddingCompany(false); setNewCompanyName(''); }}
                      style={{ padding: '9px 12px', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAddingCompany(true)}
                    style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                  >
                    <Plus size={15} /> Create Company
                  </button>
                )}
              </div>

              {/* Row 5: Documents */}
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

        {/* ── Create Company Mini Popup ── */}
        {showCreateCompanyPopup && (
          <div
            onClick={() => { setShowCreateCompanyPopup(false); setCreateCompanyInput(''); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '400px',
                background: 'linear-gradient(160deg, #16161e 0%, #0f0f14 100%)',
                border: '1px solid rgba(234,179,8,0.2)', borderRadius: '24px', padding: '30px',
                boxShadow: '0 40px 120px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(234,179,8,0.06)',
                animation: 'modalScale 0.25s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '22px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={19} color="var(--accent)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>New Company</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '3px 0 0' }}>
                    Enter a name — add full details later in Companies.
                  </p>
                </div>
                <button type="button" onClick={() => { setShowCreateCompanyPopup(false); setCreateCompanyInput(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0, flexShrink: 0 }}>
                  <X size={17} />
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Building2 size={16} color="var(--muted)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g., Nexus Digital SARL"
                  value={createCompanyInput}
                  onChange={e => setCreateCompanyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCompanyForPicker(); } if (e.key === 'Escape') { setShowCreateCompanyPopup(false); setCreateCompanyInput(''); } }}
                  style={{ width: '100%', paddingLeft: '40px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowCreateCompanyPopup(false); setCreateCompanyInput(''); }}
                  style={{ padding: '9px 18px', borderRadius: '11px', fontSize: '0.86rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleCreateCompanyForPicker}
                  disabled={isCreatingCompanyForPicker || !createCompanyInput.trim()}
                  style={{
                    padding: '9px 20px', borderRadius: '11px', fontSize: '0.86rem', fontWeight: 700,
                    background: createCompanyInput.trim() ? 'linear-gradient(135deg, #eab308, #ca8a04)' : 'rgba(234,179,8,0.15)',
                    border: 'none', color: createCompanyInput.trim() ? '#000' : 'rgba(234,179,8,0.4)',
                    cursor: createCompanyInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: createCompanyInput.trim() ? '0 4px 16px rgba(234,179,8,0.3)' : 'none',
                  }}>
                  {isCreatingCompanyForPicker
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
