'use client';

import { useEffect, useState } from 'react';
import {
  Copy, Check, Download, Mail, Globe, Phone, Hash, Building2,
  ShieldCheck, Key, FileText, CreditCard, User, ExternalLink,
  FileImage, File as FileIcon, IdCard, Briefcase, Eye, EyeOff,
} from 'lucide-react';

type Doc = { id: number; file_path: string; file_name: string; doc_type?: string };
type Account = {
  id: number;
  type: string;
  developer_name?: string;
  developer_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  company_name?: string;
  dev_password?: string;
  dev_2fa_secret?: string;
  dev_security_notes?: string;
  vcc_number?: string;
  vcc_holder?: string;
  vcc_expiry?: string;
  vcc_cvv?: string;
  vcc_notes?: string;
  documents?: Doc[];
};
type Company = {
  id: number;
  name: string;
  ice?: string;
  duns?: string;
  ded?: string;
  notes?: string;
  documents?: Doc[];
};

const sectionHeadStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px',
};

const gridTwo: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '12px',
};

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return ok;
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

function CopyableField({
  label, value, icon, href, multiline, secret,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  href?: string;
  multiline?: boolean;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);
  const display = value && value.length > 0 ? value : '—';
  const canCopy = !!value;

  async function copyNow() {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  }

  const shownValue = revealed || !value ? display : '•'.repeat(Math.min(display.length, 24));

  return (
    <div className="info-field">
      <div className="info-field-head">
        <span className="info-field-label">{icon}{label}</span>
        <div className="info-field-actions">
          {secret && value && (
            <button
              type="button"
              className="info-mini-btn"
              onClick={() => setRevealed(r => !r)}
              title={revealed ? 'Hide' : 'Reveal'}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{revealed ? 'Hide' : 'Reveal'}</span>
            </button>
          )}
          {href && value && (
            <a href={href} target="_blank" rel="noreferrer" className="info-mini-btn" title="Open">
              <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            className={`info-mini-btn ${copied ? 'success' : ''}`}
            onClick={copyNow}
            disabled={!canCopy}
            title={canCopy ? 'Copy to clipboard' : 'Nothing to copy'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      {multiline ? (
        <pre className="info-field-value multiline">{shownValue}</pre>
      ) : (
        <div
          className="info-field-value"
          style={secret && !revealed ? { letterSpacing: '0.15em' } : undefined}
        >
          {shownValue}
        </div>
      )}
    </div>
  );
}

function docExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}
function isImage(name: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(docExt(name));
}

function DocCard({ doc }: { doc: Doc }) {
  const image = isImage(doc.file_name);
  const pdf = docExt(doc.file_name) === 'pdf';

  return (
    <div className="image-asset">
      <div className="image-asset-thumb">
        {image ? (
          <img src={doc.file_path} alt={doc.file_name} />
        ) : (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%', color: pdf ? '#f87171' : 'var(--muted)',
            }}
          >
            {pdf ? <FileText size={40} /> : <FileIcon size={40} />}
          </div>
        )}
      </div>
      <div className="image-asset-meta">
        <strong style={{ wordBreak: 'break-word' }}>{doc.file_name}</strong>
        {doc.doc_type && <span>{doc.doc_type.replace(/_/g, ' ')}</span>}
        <div className="image-asset-actions">
          <button
            onClick={() => downloadFile(doc.file_path, doc.file_name)}
            className="info-mini-btn"
          >
            <Download size={14} /> <span>Download</span>
          </button>
          <a href={doc.file_path} target="_blank" rel="noreferrer" className="info-mini-btn">
            <ExternalLink size={14} /> <span>Open</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function DocSection({ title, icon, docs }: { title: string; icon: React.ReactNode; docs: Doc[] }) {
  if (!docs || docs.length === 0) return null;
  return (
    <section className="info-section" style={{ marginTop: '20px' }}>
      <h3 style={sectionHeadStyle}>
        {icon}{title}
        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>({docs.length})</span>
      </h3>
      <div className="image-assets-grid">
        {docs.map(d => <DocCard key={d.id} doc={d} />)}
      </div>
    </section>
  );
}

function ShareLinkBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copyNow() {
    const ok = await copyText(url);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  }
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', background: 'rgba(234,179,8,0.08)',
        border: '1px solid rgba(234,179,8,0.22)', borderRadius: '12px',
        marginBottom: '18px', flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
        Share link
      </span>
      <code style={{
        flex: '1 1 260px', fontSize: '0.8rem', color: 'var(--foreground)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: 'monospace',
      }}>{url}</code>
      <button onClick={copyNow} className="info-mini-btn" style={{ flexShrink: 0 }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'Copied' : 'Copy link'}</span>
      </button>
    </div>
  );
}

export default function AccountSharePackage({
  account, company,
}: { account: Account; company: Company | null }) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, []);

  const platformLabel = account.type === 'google_play' ? 'Google Play Console' : 'App Store Connect';
  const platformInitial = account.type === 'google_play' ? 'G' : 'A';

  const accountDocs = account.documents || [];
  const companyDocs = company?.documents || [];

  const idFront = companyDocs.filter(d => d.doc_type === 'id_front');
  const idBack = companyDocs.filter(d => d.doc_type === 'id_back');
  const companyDoc = companyDocs.filter(d => d.doc_type === 'company_doc');
  const otherDoc = companyDocs.filter(d => d.doc_type === 'other' || !d.doc_type);

  const fullSummary = [
    `Platform: ${platformLabel}`,
    account.developer_name && `Developer Name: ${account.developer_name}`,
    account.developer_id && `Developer ID: ${account.developer_id}`,
    account.email && `Email: ${account.email}`,
    account.phone && `Phone: ${account.phone}`,
    account.website && `Website: ${account.website}`,
    account.company_name && `Company: ${account.company_name}`,
    company?.ice && `ICE: ${company.ice}`,
    company?.duns && `DUNS: ${company.duns}`,
    company?.ded && `DED: ${company.ded}`,
    account.dev_password && `Password: ${account.dev_password}`,
    account.dev_2fa_secret && `2FA: ${account.dev_2fa_secret}`,
    account.dev_security_notes && `Security Notes: ${account.dev_security_notes}`,
    account.vcc_number && `VCC Number: ${account.vcc_number}`,
    account.vcc_holder && `VCC Holder: ${account.vcc_holder}`,
    account.vcc_expiry && `VCC Expiry: ${account.vcc_expiry}`,
    account.vcc_cvv && `VCC CVV: ${account.vcc_cvv}`,
    account.vcc_notes && `VCC Notes: ${account.vcc_notes}`,
  ].filter(Boolean).join('\n');

  async function copyAll() {
    const ok = await copyText(fullSummary);
    if (ok) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1800); }
  }

  return (
    <div className="container" style={{ paddingTop: '22px' }}>
      {shareUrl && <ShareLinkBar url={shareUrl} />}

      {/* Hero */}
      <header
        className="glass-card"
        style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '22px', marginBottom: '22px', flexWrap: 'wrap' }}
      >
        <div className={`platform-icon-large ${account.type}`}>{platformInitial}</div>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div className="info-eyebrow">{platformLabel}</div>
          <h1 className="info-title" style={{ margin: '2px 0 8px' }}>
            {account.developer_name || account.email}
          </h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {account.email && <span className="info-pill"><Mail size={12} /> {account.email}</span>}
            {account.developer_id && <span className="info-pill"><Hash size={12} /> {account.developer_id}</span>}
            {account.company_name && <span className="info-pill"><Building2 size={12} /> {account.company_name}</span>}
            {account.phone && <span className="info-pill"><Phone size={12} /> {account.phone}</span>}
          </div>
        </div>
        <button
          onClick={copyAll}
          className="btn btn-accent btn-glow"
          style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '12px' }}
        >
          {copiedAll ? <Check size={14} /> : <Copy size={14} />}
          {copiedAll ? 'Copied all' : 'Copy all fields'}
        </button>
      </header>

      {/* Developer Identity */}
      <section className="info-section" style={{ marginBottom: '20px' }}>
        <h3 style={sectionHeadStyle}><User size={16} /> Developer Identity</h3>
        <div style={gridTwo}>
          <CopyableField label="Developer Name" value={account.developer_name} icon={<User size={13} />} />
          <CopyableField label="Developer ID" value={account.developer_id} icon={<Hash size={13} />} />
          <CopyableField label="Email" value={account.email} icon={<Mail size={13} />} href={account.email ? `mailto:${account.email}` : undefined} />
          <CopyableField label="Phone" value={account.phone} icon={<Phone size={13} />} />
          <CopyableField label="Website" value={account.website} icon={<Globe size={13} />} href={account.website} />
          <CopyableField label="Company" value={account.company_name} icon={<Building2 size={13} />} />
        </div>
      </section>

      {/* Company Info */}
      {company && (
        <section className="info-section" style={{ marginBottom: '20px' }}>
          <h3 style={sectionHeadStyle}><Briefcase size={16} /> Company Details</h3>
          <div style={gridTwo}>
            <CopyableField label="Company Name" value={company.name} icon={<Building2 size={13} />} />
            <CopyableField label="ICE" value={company.ice} icon={<Hash size={13} />} />
            <CopyableField label="DUNS" value={company.duns} icon={<Hash size={13} />} />
            <CopyableField label="DED" value={company.ded} icon={<Hash size={13} />} />
          </div>
          {company.notes && (
            <div style={{ marginTop: '12px' }}>
              <CopyableField label="Company Notes" value={company.notes} icon={<FileText size={13} />} multiline />
            </div>
          )}
        </section>
      )}

      {/* Secure Credentials */}
      {(account.dev_password || account.dev_2fa_secret || account.dev_security_notes) && (
        <section className="info-section" style={{ marginBottom: '20px' }}>
          <h3 style={sectionHeadStyle}><Key size={16} /> Secure Credentials</h3>
          <div style={gridTwo}>
            {account.dev_password && (
              <CopyableField label="Account Password" value={account.dev_password} icon={<Key size={13} />} secret />
            )}
            {account.dev_2fa_secret && (
              <CopyableField label="2FA / Backup Code" value={account.dev_2fa_secret} icon={<ShieldCheck size={13} />} secret />
            )}
          </div>
          {account.dev_security_notes && (
            <div style={{ marginTop: '12px' }}>
              <CopyableField label="Security Notes" value={account.dev_security_notes} icon={<FileText size={13} />} multiline />
            </div>
          )}
        </section>
      )}

      {/* VCC */}
      {(account.vcc_number || account.vcc_holder || account.vcc_expiry || account.vcc_cvv || account.vcc_notes) && (
        <section className="info-section" style={{ marginBottom: '20px' }}>
          <h3 style={sectionHeadStyle}><CreditCard size={16} /> Virtual Credit Card</h3>
          <div style={gridTwo}>
            {account.vcc_number && <CopyableField label="Card Number" value={account.vcc_number} icon={<CreditCard size={13} />} secret />}
            {account.vcc_holder && <CopyableField label="Cardholder" value={account.vcc_holder} icon={<User size={13} />} />}
            {account.vcc_expiry && <CopyableField label="Expiry" value={account.vcc_expiry} icon={<CreditCard size={13} />} />}
            {account.vcc_cvv && <CopyableField label="CVV" value={account.vcc_cvv} icon={<CreditCard size={13} />} secret />}
          </div>
          {account.vcc_notes && (
            <div style={{ marginTop: '12px' }}>
              <CopyableField label="VCC Notes" value={account.vcc_notes} icon={<FileText size={13} />} multiline />
            </div>
          )}
        </section>
      )}

      {/* Documents */}
      {accountDocs.length > 0 && (
        <DocSection title="Developer Verification Documents" icon={<FileImage size={16} />} docs={accountDocs} />
      )}
      {company && (
        <>
          <DocSection title="ID — Front" icon={<IdCard size={16} />} docs={idFront} />
          <DocSection title="ID — Back" icon={<IdCard size={16} />} docs={idBack} />
          <DocSection title="Company Documents" icon={<Briefcase size={16} />} docs={companyDoc} />
          <DocSection title="Other Documents" icon={<FileText size={16} />} docs={otherDoc} />
        </>
      )}

      {accountDocs.length === 0 && companyDocs.length === 0 && (
        <section className="info-section">
          <div
            style={{
              padding: '28px', textAlign: 'center', color: 'var(--muted)',
              border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '14px',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            No documents uploaded yet for this account or its company.
          </div>
        </section>
      )}
    </div>
  );
}
