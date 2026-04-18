'use client';

import { useState } from 'react';
import { Globe, Pencil, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateWebsite } from '@/lib/actions';

type Website = {
  id: number;
  title: string;
  url: string;
  description?: string;
  category?: string;
  created_at: string;
};

export default function EditWebsiteModal({
  website,
  onUpdate,
}: {
  website: Website;
  onUpdate?: (w: Website) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateWebsite(website.id, fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
      if (result.data) onUpdate?.(result.data as Website);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button
        className="btn btn-secondary"
        style={{ padding: '7px 10px' }}
        onClick={() => setIsOpen(true)}
        title="Edit"
      >
        <Pencil size={14} />
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 520, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <Globe size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Edit Website</h2>
                  <p className="text-muted">Update the website details.</p>
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
                    defaultValue={website.title}
                    placeholder="e.g. Google Play Console"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL *</label>
                  <input
                    name="url"
                    type="url"
                    required
                    defaultValue={website.url}
                    placeholder="https://…"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={website.description || ''}
                    placeholder="What is this website for?"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    name="category"
                    defaultValue={website.category || ''}
                    placeholder="e.g. Tools, Resources, Social…"
                    className="form-input"
                  />
                </div>

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
