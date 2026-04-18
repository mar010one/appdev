'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Hash,
  IdCard,
  Search,
  Trash2,
  X,
  XCircle,
  Zap,
  ZapOff,
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import EditCompanyModal from '@/components/EditCompanyModal';
import { deleteCompany, deleteCompanyDocument } from '@/lib/actions';

type CompanyDoc = { id: number; file_path: string; file_name: string; doc_type: string };
type Company = {
  id: number;
  name: string;
  ice?: string;
  duns?: string;
  ded?: string;
  has_id: number;
  status?: string;
  linked_account_id?: number;
  account_name?: string;
  notes?: string;
  documents: CompanyDoc[];
};

const REQUIRED_FIELDS: { key: keyof Company | string; label: string }[] = [
  { key: 'ice',         label: 'ICE' },
  { key: 'duns',        label: 'DUNS' },
  { key: 'ded',         label: 'DED' },
  { key: 'id_front',    label: 'ID Front scan' },
  { key: 'id_back',     label: 'ID Back scan' },
  { key: 'company_doc', label: 'Company document' },
  { key: 'account',     label: 'Linked Google Play account' },
];

function getMissing(co: Company): string[] {
  const docs = co.documents ?? [];
  const m: string[] = [];
  if (!co.ice)  m.push('ICE');
  if (!co.duns) m.push('DUNS');
  if (!co.ded)  m.push('DED');
  if (!docs.some(d => d.doc_type === 'id_front'))    m.push('ID Front scan');
  if (!docs.some(d => d.doc_type === 'id_back'))     m.push('ID Back scan');
  if (!docs.some(d => d.doc_type === 'company_doc')) m.push('Company document');
  if (!co.linked_account_id) m.push('Linked Google Play account');
  return m;
}

export default function CompaniesView({
  initialCompanies,
  accounts,
}: {
  initialCompanies: Company[];
  accounts: any[];
}) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = initialCompanies.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.ice?.toLowerCase().includes(search.toLowerCase()) ||
      c.duns?.toLowerCase().includes(search.toLowerCase()) ||
      c.ded?.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleDeleteCompany(id: number, name: string) {
    if (confirm(`Delete company "${name}"? All uploaded documents will be removed.`)) {
      const res = await deleteCompany(id);
      if (!res.success) alert(res.error);
    }
  }

  async function handleDeleteDoc(docId: number, fileName: string) {
    if (confirm(`Delete document "${fileName}"?`)) {
      const res = await deleteCompanyDocument(docId);
      if (!res.success) alert(res.error);
    }
  }

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search by name, ICE, DUNS, DED…"
          className="glass-input"
          style={{ paddingLeft: '44px' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="list-container">
        {/* Header */}
        <div
          className="list-header"
          style={{
            display: 'flex',
            padding: '12px 24px',
            color: 'var(--muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <div style={{ flex: 2 }}>Company</div>
          <div style={{ flex: 1.8 }}>Identifiers</div>
          <div style={{ flex: 1.2 }}>Documents</div>
          <div style={{ flex: 1.5 }}>Google Play Account</div>
          <div style={{ flex: 0.9 }}>Completeness</div>
          <div style={{ flex: 1.2, textAlign: 'right' }}>Actions</div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 32px',
              color: 'var(--muted)',
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
            }}
          >
            <Building2 size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: '1rem' }}>
              {search ? 'No companies match your search.' : 'No companies yet. Click "Add Company" to get started.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map((co) => {
            const missing = getMissing(co);
            const isExpanded = expandedId === co.id;
            const docs = co.documents ?? [];
            const idFrontDocs  = docs.filter((d) => d.doc_type === 'id_front');
            const idBackDocs   = docs.filter((d) => d.doc_type === 'id_back');
            const companyDocs  = docs.filter((d) => d.doc_type === 'company_doc');
            const otherDocs    = docs.filter((d) => d.doc_type === 'other');

            return (
              <div key={co.id}>
                {/* Main row */}
                <div
                  className="list-item-row premium-card"
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', gap: '16px' }}
                >
                  {/* Company */}
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'var(--accent-glow)',
                        border: '1px solid rgba(234,179,8,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={20} color="var(--accent)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{co.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: co.has_id ? '#22c55e' : '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {co.has_id ? <><CheckCircle2 size={11} /> ID in hand</> : <><AlertCircle size={11} /> ID not collected</>}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.65rem' }}>·</span>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          color: co.status === 'used' ? '#22c55e' : '#6b7280',
                        }}>
                          {co.status === 'used'
                            ? <><Zap size={10} /> Used</>
                            : <><ZapOff size={10} /> Not Used</>
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identifiers */}
                  <div style={{ flex: 1.8, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <IdentRow label="ICE"  value={co.ice} />
                    <IdentRow label="DUNS" value={co.duns} />
                    <IdentRow label="DED"  value={co.ded} />
                  </div>

                  {/* Document status */}
                  <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <DocStatusRow label="ID Front"    count={idFrontDocs.length} />
                    <DocStatusRow label="ID Back"     count={idBackDocs.length} />
                    <DocStatusRow label="Company Doc" count={companyDocs.length} />
                    {otherDocs.length > 0 && (
                      <DocStatusRow label="Other" count={otherDocs.length} />
                    )}
                  </div>

                  {/* Linked account */}
                  <div style={{ flex: 1.5 }}>
                    {co.linked_account_id ? (
                      <Link
                        href={`/accounts/${co.linked_account_id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: 'rgba(66,133,244,0.1)',
                          border: '1px solid rgba(66,133,244,0.2)',
                          color: '#4285f4',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            background: '#4285f4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          G
                        </div>
                        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {co.account_name || `Account #${co.linked_account_id}`}
                        </span>
                        <ChevronRight size={12} style={{ flexShrink: 0 }} />
                      </Link>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#f59e0b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={12} /> Not linked
                      </span>
                    )}
                  </div>

                  {/* Completeness */}
                  <div style={{ flex: 0.9 }}>
                    {missing.length === 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.2)',
                          color: '#22c55e',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CheckCircle2 size={11} /> Complete
                      </span>
                    ) : (
                      <span
                        title={`Missing: ${missing.join(', ')}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: '#ef4444',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'help',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <XCircle size={11} />
                        {missing.length}/{REQUIRED_FIELDS.length} missing
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      flex: 1.2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '6px',
                    }}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : co.id)}
                      className="btn btn-secondary small"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      Docs
                    </button>
                    <EditCompanyModal company={co} accounts={accounts} />
                    <button
                      onClick={() => handleDeleteCompany(co.id, co.name)}
                      className="btn btn-secondary small"
                      style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.015)',
                      border: '1px solid var(--card-border)',
                      borderTop: 'none',
                      borderRadius: '0 0 16px 16px',
                      padding: '20px 24px',
                    }}
                  >
                    {/* Missing info banner */}
                    {missing.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          background: 'rgba(239,68,68,0.07)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          marginBottom: '20px',
                        }}
                      >
                        <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', marginRight: '4px' }}>
                          Missing information:
                        </span>
                        {missing.map((m) => (
                          <span
                            key={m}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239,68,68,0.15)',
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Document sections */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      <DocSection
                        title="ID Card — Front"
                        icon={<IdCard size={15} color="var(--accent)" />}
                        docs={idFrontDocs}
                        onDelete={handleDeleteDoc}
                      />
                      <DocSection
                        title="ID Card — Back"
                        icon={<IdCard size={15} color="var(--accent)" />}
                        docs={idBackDocs}
                        onDelete={handleDeleteDoc}
                      />
                      <DocSection
                        title="Company Documents"
                        icon={<FileText size={15} color="var(--accent)" />}
                        docs={companyDocs}
                        onDelete={handleDeleteDoc}
                      />
                      {otherDocs.length > 0 && (
                        <DocSection
                          title="Other Documents"
                          icon={<FileText size={15} color="var(--muted)" />}
                          docs={otherDocs}
                          onDelete={handleDeleteDoc}
                        />
                      )}
                    </div>

                    {/* Notes */}
                    {co.notes && (
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'var(--glass)',
                          border: '1px solid var(--card-border)',
                          fontSize: '0.84rem',
                          color: 'var(--muted)',
                        }}
                      >
                        <strong style={{ color: 'var(--foreground)' }}>Notes: </strong>
                        {co.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function IdentRow({ label, value }: { label: string; value?: string }) {
  const present = !!value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
      <Hash size={10} color={present ? 'var(--accent)' : '#ef4444'} style={{ flexShrink: 0 }} />
      <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: '36px' }}>{label}</span>
      {present ? (
        <span style={{ fontWeight: 700 }}>{value}</span>
      ) : (
        <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>
      )}
    </div>
  );
}

function DocStatusRow({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
      {count > 0 ? (
        <CheckCircle2 size={11} color="#22c55e" style={{ flexShrink: 0 }} />
      ) : (
        <XCircle size={11} color="#ef4444" style={{ flexShrink: 0 }} />
      )}
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      {count > 0 && (
        <span style={{ color: '#22c55e', fontWeight: 700 }}>{count}</span>
      )}
    </div>
  );
}

function DocSection({
  title,
  icon,
  docs,
  onDelete,
}: {
  title: string;
  icon: ReactNode;
  docs: CompanyDoc[];
  onDelete: (id: number, name: string) => void;
}) {
  return (
    <div
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--muted)',
        }}
      >
        {icon}
        {title}
        {docs.length > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(34,197,94,0.1)',
              color: '#22c55e',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            {docs.length}
          </span>
        )}
      </div>

      {docs.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px dashed rgba(239,68,68,0.25)',
            color: '#ef4444',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <XCircle size={13} /> No document uploaded
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  onDelete,
}: {
  doc: CompanyDoc;
  onDelete: (id: number, name: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isPDF = doc.file_path.toLowerCase().endsWith('.pdf');
  const shortName =
    doc.file_name.length > 22 ? doc.file_name.slice(0, 20) + '…' : doc.file_name;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--card-border)',
        }}
      >
        <FileText size={13} color="var(--muted)" style={{ flexShrink: 0 }} />
        <span
          style={{ fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={doc.file_name}
        >
          {shortName}
        </span>

        {/* View */}
        <button
          onClick={() => setPreviewOpen(true)}
          title="Preview"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'var(--glass)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--foreground)',
          }}
        >
          <Eye size={12} />
        </button>

        {/* Download */}
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
          }}
        >
          <Download size={12} />
        </a>

        {/* Delete */}
        <button
          onClick={() => onDelete(doc.id, doc.file_name)}
          title="Delete document"
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
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Preview modal */}
      <ModalPortal open={previewOpen}>
        <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div
            className="modal-content preview-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem' }}>{doc.file_name}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={doc.file_path}
                  download={doc.file_name}
                  className="btn btn-secondary small"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                >
                  <Download size={14} /> Download
                </a>
                <button className="modal-close" onClick={() => setPreviewOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="modal-body preview-modal-body">
              {isPDF ? (
                <iframe
                  src={doc.file_path}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', borderRadius: '16px', minHeight: '60vh' }}
                />
              ) : (
                <img
                  src={doc.file_path}
                  alt={doc.file_name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
