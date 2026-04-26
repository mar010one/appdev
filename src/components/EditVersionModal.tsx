'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, X, Loader2, Save, Hash, Calendar, FileText } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { updateVersion } from '@/lib/actions';

type Version = {
  id: number;
  version_number: string;
  changelog?: string;
  release_date?: string;
};

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DD in local time so the picker shows the day the user expects
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EditVersionModal({
  version,
  isLatest = false,
  triggerLabel,
}: {
  version: Version;
  isLatest?: boolean;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [versionNumber, setVersionNumber] = useState(version.version_number);
  const [changelog, setChangelog] = useState(version.changelog || '');
  const [releaseDate, setReleaseDate] = useState(toDateInputValue(version.release_date));

  // Refresh local state when the modal opens or the version prop changes,
  // so we don't show stale values after a previous edit.
  useEffect(() => {
    if (!open) return;
    setVersionNumber(version.version_number);
    setChangelog(version.changelog || '');
    setReleaseDate(toDateInputValue(version.release_date));
  }, [open, version]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!versionNumber.trim()) {
      alert('Version number is required.');
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set('versionNumber', versionNumber.trim());
    fd.set('changelog', changelog);
    if (releaseDate) fd.set('releaseDate', releaseDate);

    const res = await updateVersion(version.id, fd);
    setPending(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary small"
        style={{
          width: triggerLabel ? 'auto' : 32,
          padding: triggerLabel ? '8px 12px' : 0,
          justifyContent: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: triggerLabel ? 6 : 0,
        }}
        onClick={() => setOpen(true)}
        title={`Edit version ${version.version_number}`}
      >
        <Edit3 size={14} />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      <ModalPortal open={open}>
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 560, width: '100%' }}
          >
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Edit3 size={20} /> Edit version
                  {isLatest && (
                    <span
                      className="char-count-pill"
                      style={{
                        color: '#22c55e',
                        borderColor: 'rgba(34, 197, 94, 0.3)',
                        background: 'rgba(34, 197, 94, 0.08)',
                      }}
                    >
                      LATEST
                    </span>
                  )}
                </h2>
                <p className="text-muted" style={{ marginTop: 6 }}>
                  Update version metadata. Binaries and screenshots stay attached to the original release.
                </p>
              </div>
              <button className="modal-close" onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-body">
              <div className="input-field">
                <label>Version Number</label>
                <div className="input-with-icon-large">
                  <Hash size={18} />
                  <input
                    type="text"
                    value={versionNumber}
                    onChange={(e) => setVersionNumber(e.target.value)}
                    placeholder="e.g. 1.0.1"
                    required
                  />
                </div>
              </div>

              <div className="input-field" style={{ marginTop: 18 }}>
                <label>Release Date</label>
                <div className="input-with-icon-large">
                  <Calendar size={18} />
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-field" style={{ marginTop: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} /> What's new (Changelog)
                </label>
                <textarea
                  rows={6}
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  className="glass-input editor-textarea premium-scroll"
                  placeholder={'• Fixed crash on launch\n• Updated icon\n• 3 new screenshots'}
                  style={{ minHeight: 160, padding: 14, borderRadius: 14 }}
                />
              </div>

              <div
                className="modal-footer"
                style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent btn-glow"
                  disabled={pending || !versionNumber.trim()}
                >
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
