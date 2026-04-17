'use client';

import { Smartphone, ExternalLink, ChevronRight, Hash, Trash2, Share2, Check, History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import EditAppModal from "./EditAppModal";
import AppStatusMenu from "./AppStatusMenu";
import { deleteApp } from "@/lib/actions";

export default function AppList({
  initialApps,
  hideDeveloperColumn = false,
  emptyMessage = 'No applications registered yet.',
}: {
  initialApps: any[];
  hideDeveloperColumn?: boolean;
  emptyMessage?: string;
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function handleDelete(id: number, name: string) {
    if (confirm(`Are you sure you want to delete ${name}? This will remove all version history.`)) {
      const result = await deleteApp(id);
      if (result.error) alert(result.error);
    }
  }

  async function handleShare(id: number) {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1800);
    } catch {
      window.prompt('Copy this share link:', url);
    }
  }

  return (
    <div className="list-container">
      {/* Header Row */}
      <div className="list-header" style={{ display: 'flex', padding: '16px 24px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <div style={{ flex: 2 }}>Application</div>
        {!hideDeveloperColumn && <div style={{ flex: 1.5 }}>Developer Account</div>}
        <div style={{ flex: 1 }}>Status</div>
        <div style={{ flex: 0.8 }}>Last Version</div>
        <div style={{ flex: 1.4, textAlign: 'right' }}>Actions</div>
      </div>

      <div className="list-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {initialApps.map((app: any) => (
          <div key={app.id} className={`list-item-row premium-card status-row-${app.status || 'draft'}`} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: '24px' }}>
            {/* App Column — clickable into the management page */}
            <Link
              href={`/apps/${app.id}`}
              style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '16px', color: 'inherit', textDecoration: 'none' }}
              title="Open app management"
            >
              <div className="app-icon-wrapper">
                {app.icon_small_path ? (
                  <img src={app.icon_small_path} alt={app.name} className="list-app-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--card-border)' }}>
                    <Smartphone size={20} className="text-muted" />
                  </div>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{app.name}</h3>
                <p className="text-muted small-text" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{app.short_description || 'No tagline'}</p>
              </div>
            </Link>

            {/* Developer Column */}
            {!hideDeveloperColumn && (
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Link href={`/accounts/${app.account_id}`} style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {app.account_developer_name || app.account_email}
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent)' }}>
                  <Hash size={12} />
                  <span>{app.account_developer_id || 'No ID'}</span>
                </div>
              </div>
            )}

            {/* Status Column */}
            <div style={{ flex: 1 }}>
              <AppStatusMenu appId={app.id} status={app.status || 'draft'} />
            </div>

            {/* Version Column */}
            <div style={{ flex: 0.8 }}>
              <div className="version-tag" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-block' }}>
                {app.latest_version || 'No Release'}
              </div>
            </div>

            {/* Actions Column */}
            <div style={{ flex: 1.4, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => handleShare(app.id)}
                className={`btn btn-secondary small ${copiedId === app.id ? 'success' : ''}`}
                style={{ width: '40px', padding: 0, justifyContent: 'center' }}
                title="Copy public share link for the upload team"
              >
                {copiedId === app.id ? <Check size={16} /> : <Share2 size={16} />}
              </button>
              <Link
                href={`/apps/${app.id}`}
                className="btn btn-secondary small"
                style={{ width: '40px', padding: 0, justifyContent: 'center' }}
                title="Manage versions / upload AAB"
              >
                <History size={16} />
              </Link>
              <EditAppModal app={app} />
              <button
                onClick={() => handleDelete(app.id, app.name)}
                className="btn btn-secondary small"
                style={{ width: '40px', padding: 0, justifyContent: 'center', color: '#ef4444' }}
              >
                <Trash2 size={16} />
              </button>
              {app.store_url && (
                <a href={app.store_url} target="_blank" rel="noreferrer" className="btn btn-secondary small" style={{ width: '40px', padding: 0, justifyContent: 'center' }}>
                  <ExternalLink size={16} />
                </a>
              )}
              <Link href={`/apps/${app.id}/info`} className="btn btn-primary small" style={{ padding: '8px 20px' }}>
                Listing Info
                <ChevronRight size={14} style={{ marginLeft: '8px' }} />
              </Link>
            </div>
          </div>
        ))}

        {initialApps.length === 0 && (
          <div className="premium-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
            <Smartphone size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
