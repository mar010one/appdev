'use client';

import { useState } from 'react';
import { BookOpen, ExternalLink, Plus, Upload, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { addTutorial } from '@/lib/actions';

export default function CreateTutorialModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [type, setType] = useState<'link' | 'upload'>('link');
  const [fileName, setFileName] = useState('');

  function handleOpen() {
    setIsOpen(true);
    setType('link');
    setFileName('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set('type', type);
    const result = await addTutorial(fd);
    setIsPending(false);
    if (result.success) {
      setIsOpen(false);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  return (
    <>
      <button onClick={handleOpen} className="btn btn-primary">
        <Plus size={20} />
        Add Tutorial
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 540, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="app-icon-preview" style={{ background: 'var(--accent-glow)' }}>
                  <BookOpen size={22} color="var(--accent)" />
                </div>
                <div>
                  <h2>Add Tutorial</h2>
                  <p className="text-muted">Upload a video/file or paste a YouTube or external link.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Type toggle */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setType('link')}
                    className={`btn ${type === 'link' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <ExternalLink size={16} />
                    External Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('upload')}
                    className={`btn ${type === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Upload size={16} />
                    Upload File
                  </button>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. How to publish on Google Play"
                    className="form-input"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Brief summary of what this tutorial covers…"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    name="category"
                    placeholder="e.g. Publishing, Design, Legal…"
                    className="form-input"
                  />
                </div>

                {/* Conditional: URL or file */}
                {type === 'link' ? (
                  <div className="form-group">
                    <label className="form-label">URL *</label>
                    <input
                      name="url"
                      type="url"
                      required
                      placeholder="https://youtube.com/watch?v=… or any URL"
                      className="form-input"
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">File *</label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        border: '1px dashed var(--card-border)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: fileName ? 'var(--foreground)' : 'var(--muted)',
                        background: 'var(--glass)',
                      }}
                    >
                      <Upload size={18} color="var(--accent)" />
                      <span style={{ flex: 1, fontSize: '0.9rem' }}>
                        {fileName || 'Click to choose a file…'}
                      </span>
                      <input
                        name="file"
                        type="file"
                        required
                        accept="video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                        style={{ display: 'none' }}
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                      />
                    </label>
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Add Tutorial'}
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
