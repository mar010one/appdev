'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  Hash,
  IdCard,
  Link2,
  Pencil,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateCompany, deleteCompanyDocument } from '@/lib/actions';

type CompanyDoc = { id: number; file_path: string; file_name: string; doc_type: string };

const DOC_SECTIONS: { type: string; fieldName: string; label: string; icon: React.ReactNode }[] = [
  { type: 'id_front',    fieldName: 'idFront',    label: 'ID Card — Front',     icon: <IdCard size={14} color="var(--accent)" /> },
  { type: 'id_back',     fieldName: 'idBack',     label: 'ID Card — Back',      icon: <IdCard size={14} color="var(--accent)" /> },
  { type: 'company_doc', fieldName: 'companyDoc', label: 'Company Documents',   icon: <FileText size={14} color="var(--accent)" /> },
  { type: 'other',       fieldName: 'otherDoc',   label: 'Other Documents',     icon: <Upload size={14} color="var(--muted)" /> },
];

export default function EditCompanyModal({ company, accounts }: { company: any; accounts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasId, setHasId] = useState(!!company.has_id);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [localDocs, setLocalDocs] = useState<CompanyDoc[]>(company.documents ?? []);

  function handleOpen() {
    setHasId(!!company.has_id);
    setFileCounts({});
    setLocalDocs(company.documents ?? []);
    setIsOpen(true);
  }

  async function handleDeleteDoc(docId: number, fileName: string) {
    if (!confirm(`Delete document "${fileName}"?`)) return;
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
        <div className="modal-overlay fullscreen" onClick={() => setIsOpen(false)}>
          <div className="modal-content fullscreen-content" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <Building2 size={24} color="var(--accent)" />
                </div>
                <div>
                  <h2>Edit Company</h2>
                  <p className="text-muted">Updating <strong>{company.name}</strong></p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form id="edit-company-form" onSubmit={handleSubmit} className="modal-body max-w-screen">
              <div className="form-split-view">

                {/* ── Left column: Company info ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  <div className="section-title">
                    <Building2 size={20} color="var(--accent)" />
                    <h4>Company Info</h4>
                  </div>

                  <div className="input-field">
                    <label>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <div className="input-with-icon-large">
                      <Building2 size={20} />
                      <input type="text" name="name" defaultValue={company.name} required />
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
                      <input type="text" name="ice" defaultValue={company.ice || ''} placeholder="000 000 000 000 000" />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>DUNS Number</label>
                    <div className="input-with-icon-large">
                      <Hash size={20} />
                      <input type="text" name="duns" defaultValue={company.duns || ''} placeholder="12-345-6789" />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>DED License Number</label>
                    <div className="input-with-icon-large">
                      <Hash size={20} />
                      <input type="text" name="ded" defaultValue={company.ded || ''} placeholder="DED-XXXXX" />
                    </div>
                  </div>

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

                  <div className="input-field">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      defaultValue={company.notes || ''}
                      rows={3}
                      className="glass-input"
                      style={{ resize: 'vertical', paddingTop: '12px' }}
                    />
                  </div>

                  <div className="input-field">
                    <label>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Link2 size={15} color="var(--accent)" />
                        Linked Google Play Account
                      </span>
                    </label>
                    <select
                      name="linkedAccountId"
                      className="glass-select"
                      defaultValue={company.linked_account_id || ''}
                    >
                      <option value="">— Not linked —</option>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  <div className="section-title">
                    <FileText size={20} color="var(--accent)" />
                    <h4>Documents</h4>
                  </div>

                  {DOC_SECTIONS.map(({ type, fieldName, label, icon }) => {
                    const existing = localDocs.filter((d) => d.doc_type === type);
                    const newCount = fileCounts[fieldName] ?? 0;

                    return (
                      <div key={type} className="input-field">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {icon} {label}
                          {existing.length > 0 && (
                            <span
                              style={{
                                marginLeft: '4px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(34,197,94,0.1)',
                                color: '#22c55e',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              {existing.length} uploaded
                            </span>
                          )}
                        </label>

                        {/* Existing docs */}
                        {existing.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                            {existing.map((doc) => (
                              <ExistingDocRow
                                key={doc.id}
                                doc={doc}
                                onDelete={handleDeleteDoc}
                              />
                            ))}
                          </div>
                        )}

                        {/* Add more */}
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: `1.5px dashed ${newCount > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            background: newCount > 0 ? 'rgba(34,197,94,0.06)' : 'var(--glass)',
                            cursor: 'pointer',
                          }}
                        >
                          <Upload size={15} color={newCount > 0 ? '#22c55e' : 'var(--muted)'} />
                          <span style={{ fontSize: '0.8rem', color: newCount > 0 ? '#22c55e' : 'var(--muted)', fontWeight: newCount > 0 ? 700 : 400 }}>
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

            <div className="modal-footer sticky-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                <ChevronLeft size={18} /> Cancel
              </button>
              <button
                type="submit"
                form="edit-company-form"
                className="btn btn-accent btn-glow"
                disabled={isPending}
              >
                <Building2 size={18} style={{ marginRight: '8px' }} />
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}

function ExistingDocRow({
  doc,
  onDelete,
}: {
  doc: CompanyDoc;
  onDelete: (id: number, name: string) => void;
}) {
  const shortName = doc.file_name.length > 28 ? doc.file_name.slice(0, 26) + '…' : doc.file_name;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--card-border)',
      }}
    >
      <FileText size={13} color="var(--muted)" style={{ flexShrink: 0 }} />
      <span
        style={{ fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={doc.file_name}
      >
        {shortName}
      </span>
      <a
        href={doc.file_path}
        download={doc.file_name}
        title="Download"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#22c55e',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <Download size={12} />
      </a>
      <button
        type="button"
        onClick={() => onDelete(doc.id, doc.file_name)}
        title="Remove document"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ef4444',
          flexShrink: 0,
        }}
      >
        <XCircle size={12} />
      </button>
    </div>
  );
}
