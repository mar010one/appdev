'use client';

import { useState } from 'react';
import { Hash, Plus, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { addNitch, type Nitch } from '@/lib/actions';

export default function AddNitchModal({ onAdd }: { onAdd?: (n: Nitch) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const result = await addNitch(fd);
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
        Add Nitch
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
                  <Hash size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Add Nitch</h2>
                  <p className="text-muted">Add a nitch keyword to work on.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div className="form-group">
                  <label className="form-label">Keyword *</label>
                  <input
                    name="keyword"
                    required
                    placeholder="e.g. fitness tracker"
                    className="form-input"
                  />
                </div>

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

                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea
                    name="note"
                    rows={3}
                    placeholder="Any notes about this nitch…"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select name="priority" className="form-input" defaultValue="medium">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Add Nitch'}
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
