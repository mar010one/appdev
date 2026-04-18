'use client';

import { useState } from 'react';
import { ExternalLink, Globe, Search, Tag, Trash2 } from 'lucide-react';
import { deleteWebsite } from '@/lib/actions';
import AddWebsiteModal from './AddWebsiteModal';
import EditWebsiteModal from './EditWebsiteModal';

type Website = {
  id: number;
  title: string;
  url: string;
  description?: string;
  category?: string;
  created_at: string;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function WebsitesView({ initialWebsites }: { initialWebsites: Website[] }) {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleAdd(w: Website) {
    setWebsites((prev) => [w, ...prev]);
  }

  function handleUpdate(w: Website) {
    setWebsites((prev) => prev.map((x) => (x.id === w.id ? w : x)));
  }

  const categories = Array.from(
    new Set(websites.map((w) => w.category).filter(Boolean))
  ) as string[];

  const filtered = websites.filter((w) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      w.title.toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q) ||
      (w.category || '').toLowerCase().includes(q) ||
      w.url.toLowerCase().includes(q);
    const matchesCategory = filterCategory === 'all' || w.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleDelete(id: number) {
    if (!confirm('Delete this website?')) return;
    setDeletingId(id);
    const result = await deleteWebsite(id);
    setDeletingId(null);
    if (result.success) {
      setWebsites((prev) => prev.filter((w) => w.id !== id));
    } else {
      alert(result.error || 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <AddWebsiteModal onAdd={handleAdd} />
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            className="form-input"
            placeholder="Search websites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterCategory('all')}
              className={`btn ${filterCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '64px 32px',
            textAlign: 'center',
          }}
        >
          <Globe size={48} color="var(--muted)" />
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No websites found</p>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {search
                ? 'Try a different search term.'
                : 'Add the first website using the button above.'}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((w, i) => (
            <div
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                borderBottom:
                  i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
            >
              {/* Icon */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  background: 'var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Globe size={17} color="var(--accent)" />
              </div>

              {/* Title + domain */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 }}>
                  {w.title}
                </p>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getDomain(w.url)}
                  {w.description && (
                    <span style={{ marginLeft: 10 }}>— {w.description}</span>
                  )}
                </p>
              </div>

              {/* Category badge */}
              {w.category && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1px solid var(--card-border)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Tag size={11} />
                  {w.category}
                </span>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <a
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                >
                  <ExternalLink size={13} />
                  Open
                </a>
                <EditWebsiteModal website={w} onUpdate={handleUpdate} />
                <button
                  className="btn btn-secondary"
                  style={{ padding: '7px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={() => handleDelete(w.id)}
                  disabled={deletingId === w.id}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
