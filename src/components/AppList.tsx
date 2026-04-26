'use client';

import { Smartphone, ChevronRight, Hash, Trash2, Share2, Check, History, Eye, Package, Tag, Filter, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EditAppModal from "./EditAppModal";
import AppStatusMenu from "./AppStatusMenu";
import StatusWaitPill from "./StatusWaitPill";
import { buildPlayStoreUrl } from "./CreateAppModal";
import { deleteApp, getUserPref, setUserPref } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

const APP_NAME_MAX = 28;
function truncateName(name: string) {
  if (!name) return '';
  return name.length > APP_NAME_MAX ? `${name.slice(0, APP_NAME_MAX - 1).trimEnd()}…` : name;
}

type StatusFilter = 'all' | 'live' | 'pending_review' | 'suspended' | 'removed' | 'rejected' | 'closed' | 'draft';
type SortMode = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',            label: 'All apps' },
  { value: 'live',           label: 'Live only' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'suspended',      label: 'Suspended' },
  { value: 'removed',        label: 'Removed' },
  { value: 'rejected',       label: 'Rejected' },
  { value: 'closed',         label: 'Closed' },
  { value: 'draft',          label: 'Draft' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',    label: 'Oldest first' },
  { value: 'name_asc',  label: 'Name (A → Z)' },
  { value: 'name_desc', label: 'Name (Z → A)' },
];

const APPS_PREF_KEY = 'apps_list_filter';

export default function AppList({
  initialApps,
  hideDeveloperColumn = false,
  emptyMessage = 'No applications registered yet.',
}: {
  initialApps: any[];
  hideDeveloperColumn?: boolean;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const userEmailRef = useRef<string | null>(null);
  const prefsLoadedRef = useRef(false);

  // Load saved prefs from Supabase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      userEmailRef.current = user?.email ?? null;
      if (!user?.email) {
        prefsLoadedRef.current = true;
        return;
      }
      const saved = await getUserPref<{ statusFilter?: StatusFilter; sortMode?: SortMode }>(
        user.email,
        APPS_PREF_KEY,
      );
      if (cancelled) return;
      if (saved?.statusFilter) setStatusFilter(saved.statusFilter);
      if (saved?.sortMode) setSortMode(saved.sortMode);
      prefsLoadedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist prefs when they change (skip the initial mount + the load).
  useEffect(() => {
    if (!prefsLoadedRef.current) return;
    const email = userEmailRef.current;
    if (!email) return;
    setUserPref(email, APPS_PREF_KEY, { statusFilter, sortMode }).catch(() => {});
  }, [statusFilter, sortMode]);

  const visibleApps = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? initialApps
      : initialApps.filter((a: any) => (a.status || 'draft') === statusFilter);

    const copy = [...filtered];
    copy.sort((a: any, b: any) => {
      switch (sortMode) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return copy;
  }, [initialApps, statusFilter, sortMode]);

  async function handleDelete(id: number, name: string) {
    if (confirm(`Are you sure you want to delete ${name}? This will remove all version history.`)) {
      const result = await deleteApp(id);
      if (result.error) alert(result.error);
      else router.refresh();
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

  const totalCount = initialApps.length;
  const showingCount = visibleApps.length;

  return (
    <div className="list-container">
      {/* Filter / sort bar */}
      <div
        className="apps-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          marginBottom: '12px',
          background: 'var(--glass)',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
        }}
      >
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <Filter size={14} /> Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'var(--bg)',
              color: 'var(--fg, #fff)',
              border: '1px solid var(--card-border)',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <ArrowUpDown size={14} /> Sort
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'var(--bg)',
              color: 'var(--fg, #fff)',
              border: '1px solid var(--card-border)',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--muted)' }}>
          {showingCount === totalCount
            ? `${totalCount} app${totalCount === 1 ? '' : 's'}`
            : `${showingCount} of ${totalCount}`}
        </div>
      </div>

      {/* Header Row */}
      <div className="list-header" style={{ display: 'flex', padding: '16px 24px', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <div style={{ flex: 2 }}>Application</div>
        {!hideDeveloperColumn && <div style={{ flex: 1.5 }}>Developer Account</div>}
        <div style={{ flex: 1 }}>Status</div>
        <div style={{ flex: 0.8 }}>Last Version</div>
        <div style={{ flex: 1.4, textAlign: 'right' }}>Actions</div>
      </div>

      <div className="list-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleApps.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
            {totalCount === 0 ? emptyMessage : 'No apps match the current filter.'}
          </div>
        )}
        {visibleApps.map((app: any) => {
          const seeAppUrl = buildPlayStoreUrl(app.package_name) || app.store_url || '';
          return (
          <div key={app.id} className={`list-item-row premium-card status-row-${app.status || 'draft'}`} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: '24px' }}>
            {/* App Column — clickable into the management page */}
            <Link
              href={`/apps/${app.id}`}
              style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '16px', color: 'inherit', textDecoration: 'none', minWidth: 0 }}
              title={app.name}
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
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={app.name}
                >
                  {truncateName(app.name)}
                </h3>
                <p
                  className="text-muted small-text"
                  style={{
                    fontSize: '0.8rem',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {app.short_description || 'No tagline'}
                </p>
                {(app.package_name || app.category) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {app.package_name && (
                      <span
                        title={app.package_name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          color: 'var(--muted)',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--card-border)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Package size={10} />
                        {app.package_name}
                      </span>
                    )}
                    {app.category && (
                      <span
                        title={`Category: ${app.category}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          color: 'var(--accent)',
                          background: 'rgba(212, 175, 55, 0.1)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        <Tag size={10} />
                        {app.category}
                      </span>
                    )}
                  </div>
                )}
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <AppStatusMenu appId={app.id} status={app.status || 'draft'} />
              <StatusWaitPill
                status={app.status}
                statusUpdatedAt={app.status_updated_at}
                createdAt={app.created_at}
              />
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
              {seeAppUrl ? (
                <a
                  href={seeAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary small"
                  style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title={`Open ${app.name} on the store`}
                >
                  <Eye size={16} />
                  <span>See App</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary small"
                  style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.5, cursor: 'not-allowed' }}
                  title="Add a package name to enable See App"
                  disabled
                >
                  <Eye size={16} />
                  <span>See App</span>
                </button>
              )}
              <Link href={`/apps/${app.id}/info`} className="btn btn-primary small" style={{ padding: '8px 20px' }}>
                Listing Info
                <ChevronRight size={14} style={{ marginLeft: '8px' }} />
              </Link>
            </div>
          </div>
          );
        })}

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
