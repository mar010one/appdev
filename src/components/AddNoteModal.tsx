'use client';

import { useState } from 'react';
import { Plus, StickyNote, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { addNote, type Note } from '@/lib/actions';
import type { AuthUser } from '@/lib/auth';

const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', swatch: '#94a3b8' },
  { value: 'yellow',  label: 'Yellow',  swatch: '#eab308' },
  { value: 'blue',    label: 'Blue',    swatch: '#3b82f6' },
  { value: 'green',   label: 'Green',   swatch: '#22c55e' },
  { value: 'pink',    label: 'Pink',    swatch: '#ec4899' },
  { value: 'purple',  label: 'Purple',  swatch: '#a855f7' },
];

export default function AddNoteModal({
  user,
  onAdd,
}: {
  user: AuthUser;
  onAdd?: (n: Note) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [color, setColor] = useState('default');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set('owner_email', user.email);
    fd.set('color', color);
    if (!isShared) fd.delete('is_shared');
    const result = await addNote(fd);
    setIsPending(false);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
      setIsShared(false);
      setColor('default');
      setIsOpen(false);
      if (result.data) onAdd?.(result.data);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        <Plus size={20} />
        Add Note
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 560, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <StickyNote size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Add Note</h2>
                  <p className="text-muted">Capture an idea — share it with the team if you like.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input name="title" required placeholder="Note title…" className="form-input" autoFocus />
                </div>

                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    name="content"
                    rows={6}
                    placeholder="Write your note…"
                    className="form-input"
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
                    <label className="form-label">Category</label>
                    <input name="category" placeholder="e.g. Ideas, Project, Personal…" className="form-input" />
                  </div>
                  <div className="form-group" style={{ minWidth: 180 }}>
                    <label className="form-label">Color</label>
                    <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          title={c.label}
                          aria-label={c.label}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: c.swatch,
                            border: color === c.value ? '2px solid var(--foreground)' : '2px solid transparent',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="form-group"
                  style={{
                    padding: 14,
                    border: '1px solid var(--card-border)',
                    borderRadius: 10,
                    background: 'var(--glass)',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: isShared ? 12 : 0 }}>
                    <input
                      type="checkbox"
                      name="is_shared"
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>Share this note</span>
                  </label>
                  {isShared && (
                    <>
                      <input
                        name="shared_with"
                        placeholder="email1@example.com, email2@example.com"
                        className="form-input"
                        style={{ marginBottom: 6 }}
                      />
                      <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                        Leave empty to share with everyone on the team.
                      </p>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Add Note'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
