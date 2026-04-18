'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Hash,
  IdCard,
  Link2,
  Pencil,
  Upload,
  X,
  XCircle,
  Zap,
  ZapOff,
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateCompany, deleteCompanyDocument } from '@/lib/actions';

type CompanyDoc = { id: number; file_path: string; file_name: string; doc_type: string };

const DOC_SECTIONS: { type: string; fieldName: string; label: string; icon: React.ReactNode }[] = [
  { type: 'id_front',    fieldName: 'idFront',    label: 'ID Card — Front',   icon: <IdCard size={13} color="var(--accent)" /> },
  { type: 'id_back',     fieldName: 'idBack',     label: 'ID Card — Back',    icon: <IdCard size={13} color="var(--accent)" /> },
  { type: 'company_doc', fieldName: 'companyDoc', label: 'Company Documents', icon: <FileText size={13} color="var(--accent)" /> },
  { type: 'other',       fieldName: 'otherDoc',   label: 'Other Documents',   icon: <Upload size={13} color="var(--muted)" /> },
];

export default function EditCompanyModal({ company, accounts }: { company: any; accounts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasId, setHasId] = useState(!!company.has_id);
  const [companyStatus, setCompanyStatus] = useState<'used' | 'not_used'>(company.status || 'not_used');
  const [linkedAccountId, setLinkedAccountId] = useState<string>(String(company.linked_account_id || ''));
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [localDocs, setLocalDocs] = useState<CompanyDoc[]>(company.documents ?? []);

  function handleOpen() {
    setHasId(!!company.has_id);
    setCompanyStatus(company.status || 'not_used');
    setLinkedAccountId(String(company.linked_account_id || ''));
    setFileCounts({});
    setLocalDocs(company.documents ?? []);
    setIsOpen(true);
  }

  async function handleDeleteDoc(docId: number, fileName: string) {
    if (!confirm(`Delete "${fileName}"?`)) return;
    const res = await deleteCompanyDocument(docId);
    if (res.success) {
      setLocalDocs((prev) => prev.filter((d) => d.id !== docId));
    } else {
      alert(res.error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set('hasId', hasId ? '1' : '0');
    fd.set('companyStatus', companyStatus);
    const result = await updateCompany(company.id, fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="btn btn-secondary small"
        style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
        title="Edit company"
      >
        <Pencil size={14} />
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
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Edit Company</h3>
                  <p style={{ fontSize: '0.73rem', color: 'var(--muted)', margin: 0 }}>
                    Updating <strong style={{ color: 'var(--foreground)' }}>{company.name}</strong>
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

            <form id="edit-company-form" onSubmit={handleSubmit}>
              <div className="co-modal-body">

                {/* ── Left: Company Info ── */}
                <div className="co-section">
                  <p className="co-section-label">
                    <Building2 size={12} /> Company Info
                  </p>

                  <CoField label="Company Name *">
                    <div className="co-input-row">
                      <Building2 size={14} color="var(--muted)" />
                      <input type="text" name="name" defaultValue={company.name} required className="co-input" />
                    </div>
                  </CoField>

                  <CoField label="Google Play Usage Status">
                    <div className="co-status-row">
                      <button
                        type="button"
                        onClick={() => setCompanyStatus('used')}
                        className={`co-status-btn${companyStatus === 'used' ? ' co-used' : ''}`}
                      >
                        <Zap size={13} /> Used
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompanyStatus('not_used')}
                        className={`co-status-btn${companyStatus === 'not_used' ? ' co-not-used' : ''}`}
                      >
                        <ZapOff size={13} /> Not Used
                      </button>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Mark as <strong>Used</strong> when this company opened a Google Play developer account.
                    </p>
                  </CoField>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <CoField label="ICE">
                      <div className="co-input-row">
                        <Hash size={13} color="var(--muted)" />
                        <input type="text" name="ice" defaultValue={company.ice || ''} placeholder="000 000 000" className="co-input" />
                      </div>
                    </CoField>
                    <CoField label="DUNS">
                      <div className="co-input-row">
                        <Hash size={13} color="var(--muted)" />
                        <input type="text" name="duns" defaultValue={company.duns || ''} placeholder="12-345-6789" className="co-input" />
                      </div>
                    </CoField>
                  </div>

                  <CoField label="DED License Number">
                    <div className="co-input-row">
                      <Hash size={13} color="var(--muted)" />
                      <input type="text" name="ded" defaultValue={company.ded || ''} placeholder="DED-XXXXX" className="co-input" />
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

                  <CoField label="Notes">
                    <textarea
                      name="notes"
                      defaultValue={company.notes || ''}
                      placeholder="Any additional notes…"
                      rows={3}
                      className="co-textarea"
                    />
                  </CoField>

                  <CoField label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Link2 size={11} color="var(--accent)" /> Linked Google Play Account
                    </span>
                  }>
                    <select
                      name="linkedAccountId"
                      className="co-select"
                      value={linkedAccountId}
                      onChange={(e) => {
                        setLinkedAccountId(e.target.value);
                        if (e.target.value) setCompanyStatus('used');
                      }}
                    >
                      <option value="">— Not linked —</option>
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

                  {DOC_SECTIONS.map(({ type, fieldName, label, icon }) => {
                    const existing = localDocs.filter((d) => d.doc_type === type);
                    const newCount = fileCounts[fieldName] ?? 0;

                    return (
                      <div key={type} className="co-field">
                        <label className="co-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {icon} {label}
                          {existing.length > 0 && (
                            <span style={{
                              marginLeft: '4px', padding: '1px 5px', borderRadius: '4px',
                              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                              fontSize: '0.63rem', fontWeight: 700,
                            }}>
                              {existing.length} uploaded
                            </span>
                          )}
                        </label>

                        {/* Existing docs */}
                        {existing.length > 0 && (
                          <div className="co-doc-list">
                            {existing.map((doc) => (
                              <DocRow key={doc.id} doc={doc} onDelete={handleDeleteDoc} />
                            ))}
                          </div>
                        )}

                        {/* Add more */}
                        <label className={`co-upload-area${newCount > 0 ? ' co-selected' : ''}`}>
                          <Upload size={13} color={newCount > 0 ? '#22c55e' : 'var(--muted)'} style={{ flexShrink: 0 }} />
                          <span style={{
                            fontSize: '0.77rem',
                            color: newCount > 0 ? '#22c55e' : 'var(--muted)',
                            fontWeight: newCount > 0 ? 700 : 400,
                            flex: 1,
                          }}>
                            {newCount > 0
                              ? `${newCount} new file${newCount !== 1 ? 's' : ''} to upload`
                              : 'Add more files (multiple allowed)'}
                          </span>
                          <input
                            type="file"
                            name={fieldName}
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) =>
                              setFileCounts((prev) => ({
                                ...prev,
                                [fieldName]: e.target.files?.length ?? 0,
                              }))
                            }
                          />
                        </label>
                      </div>
                    );
                  })}
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
                form="edit-company-form"
                className="btn btn-accent btn-glow"
                style={{ padding: '8px 18px', fontSize: '0.84rem', borderRadius: '9px' }}
                disabled={isPending}
              >
                <Building2 size={14} />
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}

/* ── Sub-components ── */

function CoField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="co-field">
      <label className="co-label">{label}</label>
      {children}
    </div>
  );
}

function DocRow({ doc, onDelete }: { doc: CompanyDoc; onDelete: (id: number, name: string) => void }) {
  const shortName = doc.file_name.length > 26 ? doc.file_name.slice(0, 24) + '…' : doc.file_name;
  return (
    <div className="co-doc-row">
      <FileText size={12} color="var(--muted)" style={{ flexShrink: 0 }} />
      <span title={doc.file_name}>{shortName}</span>
      <a
        href={doc.file_path}
        download={doc.file_name}
        className="co-doc-btn download"
        title="Download"
      >
        <Download size={11} />
      </a>
      <button
        type="button"
        onClick={() => onDelete(doc.id, doc.file_name)}
        className="co-doc-btn delete"
        title="Delete"
      >
        <XCircle size={11} />
      </button>
    </div>
  );
}
