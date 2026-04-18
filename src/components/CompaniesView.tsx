'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Hash,
  IdCard,
  Link2,
  MessageSquare,
  Search,
  Trash2,
  Upload,
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

const REQUIRED_FIELDS: { key: string; label: string }[] = [
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
  if (!docs.some((d) => d.doc_type === 'id_front'))    m.push('ID Front scan');
  if (!docs.some((d) => d.doc_type === 'id_back'))     m.push('ID Back scan');
  if (!docs.some((d) => d.doc_type === 'company_doc')) m.push('Company document');
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
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [viewCompany, setViewCompany] = useState<Company | null>(null);

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
      if (res.success) router.refresh();
      else alert(res.error);
    }
  }

  async function handleDeleteDoc(docId: number, fileName: string) {
    if (confirm(`Delete document "${fileName}"?`)) {
      const res = await deleteCompanyDocument(docId);
      if (res.success) router.refresh();
      else alert(res.error);
    }
  }

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search
          size={18}
          style={{
            position: 'absolute', left: '16px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none',
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
            display: 'flex', padding: '12px 24px',
            color: 'var(--muted)', fontSize: '0.75rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
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
              textAlign: 'center', padding: '60px 32px', color: 'var(--muted)',
              background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: '16px',
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
            const docs = co.documents ?? [];
            const idFrontDocs  = docs.filter((d) => d.doc_type === 'id_front');
            const idBackDocs   = docs.filter((d) => d.doc_type === 'id_back');
            const companyDocs  = docs.filter((d) => d.doc_type === 'company_doc');
            const otherDocs    = docs.filter((d) => d.doc_type === 'other');

            return (
              <div
                key={co.id}
                className="list-item-row premium-card"
                style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', gap: '16px' }}
              >
                {/* Company — clickable to open detail */}
                <div
                  style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}
                  className="co-row-clickable"
                  onClick={() => setViewCompany(co)}
                  title="Click to view all details"
                >
                  <div
                    style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: 'var(--accent-glow)', border: '1px solid rgba(234,179,8,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
                        color: (co.linked_account_id || co.status === 'used') ? '#22c55e' : '#f59e0b',
                      }}>
                        {(co.linked_account_id || co.status === 'used') ? <><Zap size={10} /> Used</> : <><ZapOff size={10} /> Not Used</>}
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
                  {otherDocs.length > 0 && <DocStatusRow label="Other" count={otherDocs.length} />}
                </div>

                {/* Linked account */}
                <div style={{ flex: 1.5 }}>
                  {co.linked_account_id ? (
                    <Link
                      href={`/accounts/${co.linked_account_id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 10px', borderRadius: '8px',
                        background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)',
                        color: '#4285f4', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none',
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', background: '#4285f4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                      }}>G</div>
                      <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {co.account_name || `Account #${co.linked_account_id}`}
                      </span>
                      <ChevronRight size={12} style={{ flexShrink: 0 }} />
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> Not linked
                    </span>
                  )}
                </div>

                {/* Completeness */}
                <div style={{ flex: 0.9 }}>
                  {missing.length === 0 ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '6px',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      color: '#22c55e', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      <CheckCircle2 size={11} /> Complete
                    </span>
                  ) : (
                    <span
                      title={`Missing: ${missing.join(', ')}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', fontSize: '0.7rem', fontWeight: 700,
                        cursor: 'help', whiteSpace: 'nowrap',
                      }}
                    >
                      <XCircle size={11} />
                      {missing.length}/{REQUIRED_FIELDS.length} missing
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    onClick={() => setViewCompany(co)}
                    className="btn btn-secondary small"
                    style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="View details"
                  >
                    <Eye size={13} />
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
            );
          })}
        </div>
      </div>

      {/* Company Detail Modal */}
      {viewCompany && (
        <CompanyDetailModal
          company={viewCompany}
          onClose={() => setViewCompany(null)}
          onDeleteDoc={handleDeleteDoc}
        />
      )}
    </div>
  );
}

/* ── Company Detail Modal ── */

function CompanyDetailModal({
  company,
  onClose,
  onDeleteDoc,
}: {
  company: Company;
  onClose: () => void;
  onDeleteDoc: (id: number, name: string) => void;
}) {
  const docs = company.documents ?? [];
  const idFrontDocs  = docs.filter((d) => d.doc_type === 'id_front');
  const idBackDocs   = docs.filter((d) => d.doc_type === 'id_back');
  const companyDocs  = docs.filter((d) => d.doc_type === 'company_doc');
  const otherDocs    = docs.filter((d) => d.doc_type === 'other');
  const missing      = getMissing(company);

  return (
    <ModalPortal open={true}>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content co-detail-modal" onClick={(e) => e.stopPropagation()}>

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
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{company.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    fontSize: '0.7rem', fontWeight: 700,
                    color: (company.linked_account_id || company.status === 'used') ? '#22c55e' : '#f59e0b',
                  }}>
                    {(company.linked_account_id || company.status === 'used') ? <><Zap size={11} /> Used</> : <><ZapOff size={11} /> Not Used</>}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    fontSize: '0.7rem', fontWeight: 700,
                    color: company.has_id ? '#22c55e' : '#f59e0b',
                  }}>
                    {company.has_id ? <><CheckCircle2 size={11} /> ID collected</> : <><AlertCircle size={11} /> ID not collected</>}
                  </span>
                  {missing.length === 0 ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      fontSize: '0.68rem', fontWeight: 700,
                      padding: '1px 7px', borderRadius: '5px',
                      background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                    }}>
                      <CheckCircle2 size={10} /> Complete
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      fontSize: '0.68rem', fontWeight: 700,
                      padding: '1px 7px', borderRadius: '5px',
                      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    }}>
                      <XCircle size={10} /> {missing.length} missing
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
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

          {/* Body */}
          <div className="co-detail-body">

            {/* Missing banner */}
            {missing.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px',
                padding: '9px 14px', borderRadius: '9px',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
              }}>
                <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>Missing:</span>
                {missing.map((m) => (
                  <span key={m} style={{
                    padding: '1px 7px', borderRadius: '4px',
                    background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                    fontSize: '0.68rem', fontWeight: 700,
                  }}>{m}</span>
                ))}
              </div>
            )}

            {/* Identifiers */}
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Hash size={12} /> Identifiers
              </p>
              <div className="co-info-grid">
                <InfoCell label="ICE" value={company.ice} />
                <InfoCell label="DUNS" value={company.duns} />
                <InfoCell label="DED" value={company.ded} />
              </div>
            </div>

            {/* Linked account */}
            {company.linked_account_id && (
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Link2 size={12} /> Google Play Account
                </p>
                <Link
                  href={`/accounts/${company.linked_account_id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '7px 12px', borderRadius: '9px',
                    background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)',
                    color: '#4285f4', fontWeight: 600, fontSize: '0.84rem', textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '5px', background: '#4285f4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                  }}>G</div>
                  {company.account_name || `Account #${company.linked_account_id}`}
                  <ChevronRight size={13} style={{ flexShrink: 0 }} />
                </Link>
              </div>
            )}

            {/* Notes */}
            {company.notes && (
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={12} /> Notes
                </p>
                <div className="co-notes-box">{company.notes}</div>
              </div>
            )}

            {/* Documents */}
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={12} /> Documents
              </p>
              <div className="co-docs-grid">
                <DetailDocSection
                  title="ID Card — Front"
                  icon={<IdCard size={13} color="var(--accent)" />}
                  docs={idFrontDocs}
                  onDelete={onDeleteDoc}
                />
                <DetailDocSection
                  title="ID Card — Back"
                  icon={<IdCard size={13} color="var(--accent)" />}
                  docs={idBackDocs}
                  onDelete={onDeleteDoc}
                />
                <DetailDocSection
                  title="Company Documents"
                  icon={<FileText size={13} color="var(--accent)" />}
                  docs={companyDocs}
                  onDelete={onDeleteDoc}
                />
                <DetailDocSection
                  title="Other Documents"
                  icon={<Upload size={13} color="var(--muted)" />}
                  docs={otherDocs}
                  onDelete={onDeleteDoc}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="co-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 18px', fontSize: '0.84rem', borderRadius: '9px' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/* ── Sub-components ── */

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div className="co-info-cell">
      <span className="co-info-cell-label">{label}</span>
      {value
        ? <span className="co-info-cell-value">{value}</span>
        : <span className="co-info-cell-missing">Missing</span>
      }
    </div>
  );
}

function DetailDocSection({
  title, icon, docs, onDelete,
}: {
  title: string; icon: ReactNode; docs: CompanyDoc[];
  onDelete: (id: number, name: string) => void;
}) {
  return (
    <div className="co-doc-section">
      <div className="co-doc-section-title">
        {icon} {title}
        {docs.length > 0 && (
          <span style={{
            marginLeft: 'auto', padding: '1px 5px', borderRadius: '4px',
            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
            fontSize: '0.63rem', fontWeight: 700,
          }}>
            {docs.length}
          </span>
        )}
      </div>
      {docs.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '6px 8px', borderRadius: '6px',
          background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '0.72rem', fontWeight: 600,
        }}>
          <XCircle size={12} /> No document
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {docs.map((doc) => <DetailDocRow key={doc.id} doc={doc} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

function DetailDocRow({
  doc, onDelete,
}: {
  doc: CompanyDoc; onDelete: (id: number, name: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isPDF = doc.file_path.toLowerCase().endsWith('.pdf');
  const shortName = doc.file_name.length > 20 ? doc.file_name.slice(0, 18) + '…' : doc.file_name;

  return (
    <>
      <div className="co-doc-row">
        <FileText size={12} color="var(--muted)" style={{ flexShrink: 0 }} />
        <span title={doc.file_name}>{shortName}</span>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="co-doc-btn"
          style={{ background: 'var(--glass)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
          title="Preview"
        >
          <Eye size={11} />
        </button>
        <a href={doc.file_path} download={doc.file_name} className="co-doc-btn download" title="Download">
          <Download size={11} />
        </a>
        <button
          type="button"
          onClick={() => onDelete(doc.id, doc.file_name)}
          className="co-doc-btn delete"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Preview */}
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
                    maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain',
                    borderRadius: '16px', display: 'block', margin: '0 auto',
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

function IdentRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
      <Hash size={10} color={value ? 'var(--accent)' : '#ef4444'} style={{ flexShrink: 0 }} />
      <span style={{ color: 'var(--muted)', fontWeight: 600, minWidth: '36px' }}>{label}</span>
      {value
        ? <span style={{ fontWeight: 700 }}>{value}</span>
        : <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>
      }
    </div>
  );
}

function DocStatusRow({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
      {count > 0
        ? <CheckCircle2 size={11} color="#22c55e" style={{ flexShrink: 0 }} />
        : <XCircle size={11} color="#ef4444" style={{ flexShrink: 0 }} />
      }
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      {count > 0 && <span style={{ color: '#22c55e', fontWeight: 700 }}>{count}</span>}
    </div>
  );
}
