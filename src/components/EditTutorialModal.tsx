'use client';

import { useState } from 'react';
import { BookOpen, Pencil, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateTutorial } from '@/lib/actions';

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

export default function EditTutorialModal({
  tutorial,
  onUpdate,
}: {
  tutorial: Tutorial;
  onUpdate?: (t: Tutorial) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateTutorial(tutorial.id, fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
      if (result.data) onUpdate?.(result.data as Tutorial);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button
        className="btn btn-secondary"
        style={{ padding: '8px 12px' }}
        onClick={() => setIsOpen(true)}
        title="Edit"
      >
        <Pencil size={15} />
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 540, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <BookOpen size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Edit Tutorial</h2>
                  <p className="text-muted">Update the tutorial details.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    name="title"
                    required
                    defaultValue={tutorial.title}
                    placeholder="e.g. How to publish on Google Play"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={tutorial.description || ''}
                    placeholder="Brief summary…"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    name="category"
                    defaultValue={tutorial.category || ''}
                    placeholder="e.g. Publishing, Design, Legal…"
                    className="form-input"
                  />
                </div>

                {tutorial.type === 'link' && (
                  <div className="form-group">
                    <label className="form-label">URL</label>
                    <input
                      name="url"
                      type="url"
                      defaultValue={tutorial.url || ''}
                      placeholder="https://…"
                      className="form-input"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Save Changes'}
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
