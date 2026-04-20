'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Search, Share2, StickyNote, Tag, Trash2, Users } from 'lucide-react';
import { deleteNote, getNotes, type Note } from '@/lib/actions';
import { getCurrentUser, type AuthUser } from '@/lib/auth';
import AddNoteModal from './AddNoteModal';
import EditNoteModal from './EditNoteModal';

const COLOR_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  default: { bg: 'rgba(255,255,255,0.02)',  border: 'var(--card-border)',   accent: 'var(--accent)' },
  yellow:  { bg: 'rgba(234,179,8,0.08)',    border: 'rgba(234,179,8,0.25)', accent: '#eab308' },
  blue:    { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.25)',accent: '#3b82f6' },
  green:   { bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.25)', accent: '#22c55e' },
  pink:    { bg: 'rgba(236,72,153,0.08)',   border: 'rgba(236,72,153,0.25)',accent: '#ec4899' },
  purple:  { bg: 'rgba(168,85,247,0.08)',   border: 'rgba(168,85,247,0.25)',accent: '#a855f7' },
};

function colorOf(c?: string | null) {
  return COLOR_STYLES[c || 'default'] || COLOR_STYLES.default;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString();
}

export default function NotesView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((current) => {
      if (cancelled || !current) return;
      setUser(current);
      getNotes(current.email).then((data) => {
        if (!cancelled) {
          setNotes(data);
          setLoading(false);
        }
      });
    });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(notes.map((n) => n.category).filter(Boolean))) as string[],
    [notes],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const me = (user?.email || '').toLowerCase();
    return notes.filter((n) => {
      const isMine = (n.owner_email || '').toLowerCase() === me;
      if (filter === 'mine' && !isMine) return false;
      if (filter === 'shared' && isMine) return false;
      if (filterCategory !== 'all' && n.category !== filterCategory) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.category || '').toLowerCase().includes(q) ||
        (n.owner_email || '').toLowerCase().includes(q)
      );
    });
  }, [notes, search, filter, filterCategory, user]);

  function handleAdd(n: Note) {
    setNotes((prev) => [n, ...prev]);
  }

  function handleUpdate(n: Note) {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this note?')) return;
    setDeletingId(id);
    const res = await deleteNote(id, user?.email);
    setDeletingId(null);
    if (res.success) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } else {
      alert(res.error || 'Delete failed');
    }
  }

  if (!user) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  const me = user.email.toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <AddNoteModal user={user} onAdd={handleAdd} />

        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            className="form-input"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'mine', 'shared'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem', textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'All' : f === 'mine' ? 'My notes' : 'Shared with me'}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCategory('all')}
            className={`btn ${filterCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '64px 32px',
            textAlign: 'center',
          }}
        >
          <StickyNote size={48} color="var(--muted)" />
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No notes here yet</p>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {search ? 'Try a different search term.' : 'Create your first note using the button above.'}
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((n) => {
            const c = colorOf(n.color);
            const isMine = (n.owner_email || '').toLowerCase() === me;
            const sharedList = (n.shared_with || '').split(/[,;\s]+/).filter(Boolean);
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 18,
                  borderRadius: 14,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  backdropFilter: 'blur(var(--glass-blur))',
                  minHeight: 180,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3, color: c.accent }}>
                    {n.title}
                  </h3>
                  {n.is_shared && (
                    <span
                      title={sharedList.length ? `Shared with ${sharedList.length} ${sharedList.length === 1 ? 'person' : 'people'}` : 'Shared with everyone'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.7rem',
                        color: c.accent,
                        padding: '3px 8px',
                        borderRadius: 20,
                        background: 'rgba(255,255,255,0.06)',
                        border: `1px solid ${c.border}`,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <Share2 size={11} />
                      {sharedList.length || 'all'}
                    </span>
                  )}
                </div>

                {n.content && (
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--foreground)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      display: '-webkit-box',
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {n.content}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {n.category && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.72rem',
                        color: 'var(--muted)',
                        padding: '3px 8px',
                        borderRadius: 20,
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <Tag size={10} />
                      {n.category}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                    }}
                  >
                    <Calendar size={10} />
                    {formatDate(n.updated_at)}
                  </span>
                </div>

                {!isMine && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.7rem',
                      color: 'var(--muted)',
                      borderTop: '1px solid var(--card-border)',
                      paddingTop: 8,
                    }}
                  >
                    <Users size={11} />
                    Shared by {n.owner_email}
                  </div>
                )}

                {isMine && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    <EditNoteModal note={n} user={user} onUpdate={handleUpdate} />
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '7px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
