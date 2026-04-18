'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
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
import { uploadFilesInForm } from '@/lib/upload-client';

export default function CreateCompanyModal({ accounts }: { accounts: any[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasId, setHasId] = useState(false);
  const [fileCounts, setFileCounts] = useState({ idFront: 0, idBack: 0, companyDoc: 0, otherDoc: 0 });

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

    try {
      await uploadFilesInForm(fd, {
        idFront: { bucket: 'companies', prefix: 'id-front-' },
        idBack: { bucket: 'companies', prefix: 'id-back-' },
        companyDoc: { bucket: 'companies', prefix: 'doc-' },
        otherDoc: { bucket: 'companies', prefix: 'other-' },
      });
    } catch (err: any) {
      setIsPending(false);
      alert(err?.message || 'File upload failed');
      return;
    }

    const result = await addCompany(fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
      router.refresh();
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
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content co-modal" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="co-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px',
                  background: 'var(--accent-glow)', border: '1px solid rgba(234,179,8,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Building2 size={17} color="var(--accent)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Register Company</h3>
                  <p style={{ fontSize: '0.73rem', color: 'var(--muted)', margin: 0 }}>
                    Add info, upload documents, and link to Google Play.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '28px', height: '28px', borderRadius: '7px',
                  background: 'var(--glass)', border: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--muted)',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <form id="create-company-form" onSubmit={handleSubmit}>
              <div className="co-modal-body">

                {/* ── Left: Company Info ── */}
                <div className="co-section">
                  <p className="co-section-label">
                    <Building2 size={12} /> Company Info
                  </p>

                  <CoField label="Company Name *">
                    <div className="co-input-row">
                      <Building2 size={14} color="var(--muted)" />
                      <input type="text" name="name" placeholder="e.g., Nexus Digital SARL" required className="co-input" />
                    </div>
                  </CoField>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <CoField label="ICE">
                      <div className="co-input-row">
                        <Hash size={13} color="var(--muted)" />
                        <input type="text" name="ice" placeholder="000 000 000" className="co-input" />
                      </div>
                    </CoField>
                    <CoField label="DUNS">
                      <div className="co-input-row">
                        <Hash size={13} color="var(--muted)" />
                        <input type="text" name="duns" placeholder="12-345-6789" className="co-input" />
                      </div>
                    </CoField>
                  </div>

                  <CoField label="DED License Number">
                    <div className="co-input-row">
                      <Hash size={13} color="var(--muted)" />
                      <input type="text" name="ded" placeholder="DED-XXXXX" className="co-input" />
                    </div>
                  </CoField>

                  <CoField label="Physical ID Collected?">
                    <button
                      type="button"
                      onClick={() => setHasId((v) => !v)}
                      className={`co-toggle${hasId ? ' co-yes' : ''}`}
                    >
                      <CheckCircle2 size={14} />
                      {hasId ? 'Yes — ID collected' : 'No — not yet collected'}
                    </button>
                  </CoField>

                  <CoField label="Notes (optional)">
                    <textarea
                      name="notes"
                      placeholder="Any additional notes…"
                      rows={3}
                      className="co-textarea"
                    />
                  </CoField>

                  <CoField label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Link2 size={11} color="var(--accent)" /> Link to Google Play Account
                    </span>
                  }>
                    <select name="linkedAccountId" className="co-select">
                      <option value="">— Not linked yet —</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.developer_name || acc.email}{acc.developer_id ? ` (#${acc.developer_id})` : ''}
                        </option>
                      ))}
                    </select>
                  </CoField>
                </div>

                {/* ── Right: Documents ── */}
                <div className="co-section">
                  <p className="co-section-label">
                    <FileText size={12} /> Documents
                  </p>
                  <p style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: '-6px', marginBottom: '2px' }}>
                    Each category supports multiple files. Add more later via Edit.
                  </p>

                  <CoUpload
                    name="idFront"
                    label="ID Card — Front"
                    icon={<IdCard size={13} color="var(--accent)" />}
                    count={fileCounts.idFront}
                    onChange={(n) => setFileCounts((p) => ({ ...p, idFront: n }))}
                  />
                  <CoUpload
                    name="idBack"
                    label="ID Card — Back"
                    icon={<IdCard size={13} color="var(--accent)" />}
                    count={fileCounts.idBack}
                    onChange={(n) => setFileCounts((p) => ({ ...p, idBack: n }))}
                  />
                  <CoUpload
                    name="companyDoc"
                    label="Company Documents"
                    hint="Registration, patent, license…"
                    icon={<FileText size={13} color="var(--accent)" />}
                    count={fileCounts.companyDoc}
                    onChange={(n) => setFileCounts((p) => ({ ...p, companyDoc: n }))}
                  />
                  <CoUpload
                    name="otherDoc"
                    label="Other Documents"
                    icon={<Upload size={13} color="var(--muted)" />}
                    count={fileCounts.otherDoc}
                    onChange={(n) => setFileCounts((p) => ({ ...p, otherDoc: n }))}
                    muted
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="co-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.84rem', borderRadius: '9px' }}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-company-form"
                className="btn btn-accent btn-glow"
                style={{ padding: '8px 18px', fontSize: '0.84rem', borderRadius: '9px' }}
                disabled={isPending}
              >
                <Building2 size={14} />
                {isPending ? 'Saving…' : 'Save Company'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}

/* ── Shared sub-components ── */

function CoField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="co-field">
      <label className="co-label">{label}</label>
      {children}
    </div>
  );
}

function CoUpload({
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
    <div className="co-field">
      <label className="co-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon} {label}
      </label>
      {hint && (
        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', margin: '0 0 2px' }}>{hint}</p>
      )}
      <label className={`co-upload-area${count > 0 ? ' co-selected' : muted ? ' co-muted' : ''}`}>
        <Upload size={13} color={count > 0 ? '#22c55e' : 'var(--muted)'} style={{ flexShrink: 0 }} />
        <span style={{
          fontSize: '0.78rem',
          color: count > 0 ? '#22c55e' : 'var(--muted)',
          fontWeight: count > 0 ? 700 : 400,
          flex: 1,
        }}>
          {count > 0
            ? `${count} file${count !== 1 ? 's' : ''} selected`
            : 'Click to select (multiple allowed)'}
        </span>
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
