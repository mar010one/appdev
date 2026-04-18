'use client';

import { useState } from 'react';
import { Globe, Plus, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { addWebsite } from '@/lib/actions';

export default function AddWebsiteModal({ onAdd }: { onAdd?: (w: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const result = await addWebsite(fd);
    setIsPending(false);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
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
        Add Website
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 520, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <Globe size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Add Website</h2>
                  <p className="text-muted">Save a website or link to share with the team.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Google Play Console"
                    className="form-input"
                  />
                </div>

                {/* URL */}
                <div className="form-group">
                  <label className="form-label">URL *</label>
                  <input
                    name="url"
                    type="url"
                    required
                    placeholder="https://…"
                    className="form-input"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="What is this website for?"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    name="category"
                    placeholder="e.g. Tools, Resources, Social…"
                    className="form-input"
                  />
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Add Website'}
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
