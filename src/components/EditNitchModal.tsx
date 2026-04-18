'use client';

import { useState } from 'react';
import { Hash, Pencil, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateNitch, type Nitch, type NitchPriority } from '@/lib/actions';

const PRIORITIES: NitchPriority[] = ['high', 'medium', 'low'];

export default function EditNitchModal({
  nitch,
  onUpdate,
}: {
  nitch: Nitch;
  onUpdate?: (n: Nitch) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [priority, setPriority] = useState<NitchPriority>(nitch.priority);

  function handleOpen() {
    setPriority(nitch.priority);
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set('priority', priority);
    const result = await updateNitch(nitch.id, fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
      if (result.data) onUpdate?.(result.data as Nitch);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button
        className="btn btn-secondary"
        style={{ padding: '7px 10px' }}
        onClick={handleOpen}
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
                  <Hash size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Edit Nitch</h2>
                  <p className="text-muted">Update the nitch details.</p>
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
                    defaultValue={nitch.keyword}
                    placeholder="e.g. fitness app"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL *</label>
                  <input
                    name="url"
                    type="url"
                    required
                    defaultValue={nitch.url}
                    placeholder="https://…"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea
                    name="note"
                    rows={3}
                    defaultValue={nitch.note || ''}
                    placeholder="Any observations or context…"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`btn ${priority === p ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
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
