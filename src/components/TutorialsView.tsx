'use client';

import { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  File,
  FileText,
  Play,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

function YtIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"
        fill="#ff0000"
      />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#fff" />
    </svg>
  );
}
import ModalPortal from '@/components/ModalPortal';
import { deleteTutorial } from '@/lib/actions';
import CreateTutorialModal from '@/components/CreateTutorialModal';
import EditTutorialModal from '@/components/EditTutorialModal';

type Tutorial = {
  id: number;
  title: string;
  description?: string;
  type: 'link' | 'upload';
  file_path?: string;
  file_name?: string;
  url?: string;
  category?: string;
  created_at: string;
};

const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];

function getYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/embed\/([^?#]+)/,
    /youtube\.com\/shorts\/([^?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isVideoFile(filePath?: string): boolean {
  if (!filePath) return false;
  return VIDEO_EXTS.includes(filePath.split('.').pop()?.toLowerCase() || '');
}

function isYouTube(url?: string): boolean {
  return !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));
}

function isVideo(t: Tutorial): boolean {
  return isYouTube(t.url) || isVideoFile(t.file_path);
}

// ─── Video Player Modal ───────────────────────────────────────────────────────

function VideoPlayerModal({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial;
  onClose: () => void;
}) {
  const ytId = tutorial.url ? getYouTubeId(tutorial.url) : null;

  return (
    <ModalPortal open>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '90vw',
            maxWidth: 900,
            background: 'var(--card)',
            borderRadius: 16,
            border: '1px solid var(--card-border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--card-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {ytId ? (
                <YtIcon size={20} />
              ) : (
                <Play size={20} color="var(--accent)" />
              )}
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{tutorial.title}</span>
            </div>
            <button className="modal-close" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {/* Player */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
            {ytId ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                title={tutorial.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            ) : (
              <video
                src={tutorial.file_path}
                controls
                autoPlay
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  background: '#000',
                }}
              />
            )}
          </div>

          {/* Description */}
          {tutorial.description && (
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--card-border)',
                fontSize: '0.88rem',
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}
            >
              {tutorial.description}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

// ─── Card thumbnail ───────────────────────────────────────────────────────────

function CardThumbnail({ tutorial }: { tutorial: Tutorial }) {
  const ytId = tutorial.url ? getYouTubeId(tutorial.url) : null;

  if (ytId) {
    return (
      <div
        style={{
          position: 'relative',
          borderRadius: '10px 10px 0 0',
          overflow: 'hidden',
          aspectRatio: '16/9',
          background: '#000',
          margin: '-20px -20px 0 -20px',
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt={tutorial.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#ff0000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255,0,0,0.5)',
            }}
          >
            <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
          </div>
        </div>
      </div>
    );
  }

  if (isVideoFile(tutorial.file_path)) {
    return (
      <div
        style={{
          position: 'relative',
          borderRadius: '10px 10px 0 0',
          overflow: 'hidden',
          aspectRatio: '16/9',
          background: 'rgba(234,179,8,0.06)',
          margin: '-20px -20px 0 -20px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          src={tutorial.file_path}
          muted
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px var(--accent-glow)',
          }}
        >
          <Play size={20} color="#000" fill="#000" style={{ marginLeft: 3 }} />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function TutorialsView({ initialTutorials }: { initialTutorials: Tutorial[] }) {
  const [tutorials, setTutorials] = useState<Tutorial[]>(initialTutorials);

  function handleAdd(t: Tutorial) {
    setTutorials((prev) => [t, ...prev]);
  }

  function handleUpdate(t: Tutorial) {
    setTutorials((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'link' | 'upload'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [playing, setPlaying] = useState<Tutorial | null>(null);

  const filtered = tutorials.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q);
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  async function handleDelete(id: number) {
    if (!confirm('Delete this tutorial?')) return;
    setDeletingId(id);
    const result = await deleteTutorial(id);
    setDeletingId(null);
    if (result.success) {
      setTutorials((prev) => prev.filter((t) => t.id !== id));
    } else {
      alert(result.error || 'Delete failed');
    }
  }

  return (
    <>
      {playing && <VideoPlayerModal tutorial={playing} onClose={() => setPlaying(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <CreateTutorialModal onAdd={handleAdd} />
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
              placeholder="Search tutorials…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'link', 'upload'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`btn ${filterType === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {f === 'all' ? 'All' : f === 'link' ? 'Links' : 'Files'}
              </button>
            ))}
          </div>
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
            <BookOpen size={48} color="var(--muted)" />
            <div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>No tutorials found</p>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                {search
                  ? 'Try a different search term.'
                  : 'Add the first tutorial using the button above.'}
              </p>
            </div>
          </div>
        )}

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          {filtered.map((t) => {
            const video = isVideo(t);
            const ytId = t.url ? getYouTubeId(t.url) : null;

            return (
              <div
                key={t.id}
                className="glass-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}
              >
                {/* Thumbnail (videos only) */}
                {video && <CardThumbnail tutorial={t} />}

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: ytId
                        ? 'rgba(255,0,0,0.1)'
                        : video
                        ? 'var(--accent-glow)'
                        : t.type === 'link'
                        ? 'rgba(66,133,244,0.12)'
                        : 'var(--accent-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {ytId ? (
                      <YtIcon size={20} />
                    ) : video ? (
                      <Play size={20} color="var(--accent)" />
                    ) : t.type === 'link' ? (
                      <ExternalLink size={20} color="#4285f4" />
                    ) : (
                      <FileText size={20} color="var(--accent)" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, lineHeight: 1.3 }}>
                      {t.title}
                    </p>
                    {t.description && (
                      <p
                        className="text-muted"
                        style={{
                          fontSize: '0.82rem',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {t.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: ytId
                        ? 'rgba(255,0,0,0.1)'
                        : video
                        ? 'var(--accent-glow)'
                        : t.type === 'link'
                        ? 'rgba(66,133,244,0.12)'
                        : 'var(--accent-glow)',
                      color: ytId ? '#ff4444' : video ? 'var(--accent)' : t.type === 'link' ? '#4285f4' : 'var(--accent)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {ytId ? 'YouTube' : video ? 'Video' : t.type === 'link' ? 'Link' : 'File'}
                  </span>
                  {t.category && (
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
                      }}
                    >
                      <Tag size={11} />
                      {t.category}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
                  {video ? (
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                      onClick={() => setPlaying(t)}
                    >
                      <Play size={15} fill="currentColor" />
                      Watch
                    </button>
                  ) : t.type === 'link' && t.url ? (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                    >
                      <ExternalLink size={15} />
                      Open Link
                    </a>
                  ) : t.file_path ? (
                    <a
                      href={t.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                      download={t.file_name || undefined}
                    >
                      <File size={15} />
                      View / Download
                    </a>
                  ) : null}

                  <EditTutorialModal tutorial={t} onUpdate={handleUpdate} />
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
