'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Hash,
  IdCard,
  Link2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { addCompany } from '@/lib/actions';

export default function CreateCompanyModal({ accounts }: { accounts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasId, setHasId] = useState(false);
  const [fileCounts, setFileCounts] = useState({ idFront: 0, idBack: 0, companyDoc: 0, otherDoc: 0 });

  function handleFileChange(field: keyof typeof fileCounts, count: number) {
    setFileCounts((prev) => ({ ...prev, [field]: count }));
  }

  function handleOpen() {
    setIsOpen(true);
    setHasId(false);
    setFileCounts({ idFront: 0, idBack: 0, companyDoc: 0, otherDoc: 0 });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set('hasId', hasId ? '1' : '0');
    const result = await addCompany(fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button onClick={handleOpen} className="btn btn-primary">
        <Plus size={20} />
        Add Company
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay fullscreen" onClick={() => setIsOpen(false)}>
          <div className="modal-content fullscreen-content" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <Building2 size={24} color="var(--accent)" />
                </div>
                <div>
                  <h2>Register Company</h2>
                  <p className="text-muted">Add company info, upload documents, and link to a Google Play account.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form id="create-company-form" onSubmit={handleSubmit} className="modal-body max-w-screen">
              <div className="form-split-view">

                {/* ── Left column: Company info ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="section-title">
                    <Building2 size={20} color="var(--accent)" />
                    <h4>Company Info</h4>
                  </div>

                  <div className="input-field">
                    <label>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <div className="input-with-icon-large">
                      <Building2 size={20} />
                      <input type="text" name="name" placeholder="e.g., Nexus Digital SARL" required />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>
                      ICE
                      <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '6px', fontSize: '0.8rem' }}>
                        Identifiant Commun de l'Entreprise
                      </span>
                    </label>
                    <div className="input-with-icon-large">
                      <Hash size={20} />
                      <input type="text" name="ice" placeholder="000 000 000 000 000" />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>DUNS Number</label>
                    <div className="input-with-icon-large">
                      <Hash size={20} />
                      <input type="text" name="duns" placeholder="12-345-6789" />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>DED License Number</label>
                    <div className="input-with-icon-large">
                      <Hash size={20} />
                      <input type="text" name="ded" placeholder="DED-XXXXX" />
                    </div>
                  </div>

                  {/* Has ID toggle */}
                  <div className="input-field">
                    <label>Physical ID collected?</label>
                    <button
                      type="button"
                      onClick={() => setHasId((v) => !v)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 20px',
                        borderRadius: '14px',
                        border: `1px solid ${hasId ? 'rgba(34,197,94,0.4)' : 'var(--card-border)'}`,
                        background: hasId ? 'rgba(34,197,94,0.1)' : 'var(--glass)',
                        color: hasId ? '#22c55e' : 'var(--muted)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        width: 'fit-content',
                        fontFamily: 'inherit',
                      }}
                    >
                      <CheckCircle2 size={18} />
                      {hasId ? 'Yes — ID collected' : 'No — not yet collected'}
                    </button>
                  </div>

                  {/* Notes */}
                  <div className="input-field">
                    <label>Notes <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.8rem' }}>(optional)</span></label>
                    <textarea
                      name="notes"
                      placeholder="Any additional notes…"
                      rows={3}
                      className="glass-input"
                      style={{ resize: 'vertical', paddingTop: '12px' }}
                    />
                  </div>

                  {/* Linked account */}
                  <div className="input-field">
                    <label>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Link2 size={15} color="var(--accent)" />
                        Link to Google Play Account
                        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.8rem' }}>(optional)</span>
                      </span>
                    </label>
                    <select name="linkedAccountId" className="glass-select">
                      <option value="">— Not linked yet —</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.developer_name || acc.email}
                          {acc.developer_id ? ` (#${acc.developer_id})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Right column: Documents ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="section-title">
                    <FileText size={20} color="var(--accent)" />
                    <h4>Upload Documents</h4>
                  </div>

                  <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '-12px' }}>
                    Each category supports multiple files. You can add more documents later via Edit.
                  </p>

                  <MultiUploadField
                    name="idFront"
                    label="ID Card — Front"
                    icon={<IdCard size={22} color="var(--accent)" />}
                    count={fileCounts.idFront}
                    onChange={(n) => handleFileChange('idFront', n)}
                  />
                  <MultiUploadField
                    name="idBack"
                    label="ID Card — Back"
                    icon={<IdCard size={22} color="var(--accent)" />}
                    count={fileCounts.idBack}
                    onChange={(n) => handleFileChange('idBack', n)}
                  />
                  <MultiUploadField
                    name="companyDoc"
                    label="Company Documents"
                    hint="Registration, patent, license, etc."
                    icon={<FileText size={22} color="var(--accent)" />}
                    count={fileCounts.companyDoc}
                    onChange={(n) => handleFileChange('companyDoc', n)}
                  />
                  <MultiUploadField
                    name="otherDoc"
                    label="Other Documents"
                    hint="Any additional supporting files"
                    icon={<Upload size={22} color="var(--muted)" />}
                    count={fileCounts.otherDoc}
                    onChange={(n) => handleFileChange('otherDoc', n)}
                    muted
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="modal-footer sticky-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                <ChevronLeft size={18} /> Cancel
              </button>
              <button
                type="submit"
                form="create-company-form"
                className="btn btn-accent btn-glow"
                disabled={isPending}
              >
                <Building2 size={18} style={{ marginRight: '8px' }} />
                {isPending ? 'Saving…' : 'Save Company'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}

function MultiUploadField({
  name,
  label,
  hint,
  icon,
  count,
  onChange,
  muted = false,
}: {
  name: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  count: number;
  onChange: (n: number) => void;
  muted?: boolean;
}) {
  return (
    <div className="input-field">
      <label>{label}</label>
      {hint && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '8px', marginTop: '-4px' }}>{hint}</p>
      )}
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
          borderRadius: '12px',
          border: `1.5px dashed ${count > 0 ? 'rgba(34,197,94,0.4)' : muted ? 'rgba(255,255,255,0.1)' : 'rgba(234,179,8,0.3)'}`,
          background: count > 0 ? 'rgba(34,197,94,0.06)' : 'var(--glass)',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        {icon}
        {count > 0 ? (
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#22c55e' }}>
            {count} file{count !== 1 ? 's' : ''} selected
          </span>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Click to select (multiple allowed)
          </span>
        )}
        <input
          type="file"
          name={name}
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files?.length ?? 0)}
        />
      </label>
    </div>
  );
}
