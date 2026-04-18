'use client';

import { useState } from 'react';
import { ExternalLink, Hash, Search, Trash2 } from 'lucide-react';
import { deleteNitch, type Nitch, type NitchPriority } from '@/lib/actions';
import AddNitchModal from './AddNitchModal';
import EditNitchModal from './EditNitchModal';

const PRIORITY: Record<NitchPriority, { bg: string; text: string; label: string }> = {
  high:   { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', label: 'High' },
  medium: { bg: 'rgba(234,179,8,0.12)',   text: '#eab308', label: 'Medium' },
  low:    { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', label: 'Low' },
};

export default function NitchView({ initialNitches }: { initialNitches: Nitch[] }) {
  const [nitches, setNitches] = useState<Nitch[]>(initialNitches);

  function handleAdd(n: Nitch) {
    setNitches((prev) => [n, ...prev]);
  }

  function handleUpdate(n: Nitch) {
    setNitches((prev) => prev.map((x) => (x.id === n.id ? n : x)));
  }
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | NitchPriority>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = nitches.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      n.keyword.toLowerCase().includes(q) ||
      n.url.toLowerCase().includes(q) ||
      (n.note || '').toLowerCase().includes(q);
    const matchesPriority = filterPriority === 'all' || n.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  async function handleDelete(id: number) {
    if (!confirm('Delete this nitch?')) return;
    setDeletingId(id);
    const result = await deleteNitch(id);
    setDeletingId(null);
    if (result.success) {
      setNitches((prev) => prev.filter((n) => n.id !== id));
    } else {
      alert(result.error || 'Delete failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            className="form-input"
            placeholder="Search niches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <AddNitchModal onAdd={handleAdd} />

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`btn ${filterPriority === p ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {p === 'all' ? 'All' : PRIORITY[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '64px 32px', textAlign: 'center' }}
        >
          <Hash size={48} color="var(--muted)" />
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No niches found</p>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {search ? 'Try a different search term.' : 'Add the first nitch using the button above.'}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 3fr 100px 140px',
              gap: '0',
              padding: '12px 20px',
              borderBottom: '1px solid var(--card-border)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {['Keyword', 'URL', 'Note', 'Priority', ''].map((h) => (
              <span key={h} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((n, i) => {
            const p = PRIORITY[n.priority];
            return (
              <div
                key={n.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 3fr 100px 140px',
                  gap: '0',
                  padding: '16px 20px',
                  alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Keyword */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 8, background: 'var(--accent-glow)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <Hash size={15} color="var(--accent)" />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.keyword}
                  </span>
                </div>

                {/* URL */}
                <span
                  style={{ fontSize: '0.82rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}
                  title={n.url}
                >
                  {n.url}
                </span>

                {/* Note */}
                <span
                  style={{ fontSize: '0.85rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}
                  title={n.note || ''}
                >
                  {n.note || '—'}
                </span>

                {/* Priority */}
                <div>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      fontSize: '0.75rem', fontWeight: 600,
                      padding: '3px 10px', borderRadius: 20,
                      background: p.bg, color: p.text,
                    }}
                  >
                    {p.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                  <EditNitchModal nitch={n} onUpdate={handleUpdate} />
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '7px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={() => handleDelete(n.id)}
                    disabled={deletingId === n.id}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
