'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Loader2, CircleDashed, CheckCircle2, XCircle, ShieldAlert, Ban, Clock, Lock } from 'lucide-react';
import { updateAppStatus, type AppStatus } from '@/lib/actions';

export const STATUS_OPTIONS: { value: AppStatus; label: string; description: string }[] = [
  { value: 'draft',          label: 'Draft',          description: 'Not submitted yet' },
  { value: 'pending_review', label: 'Pending Review', description: 'Submitted, awaiting store review' },
  { value: 'live',           label: 'Live',           description: 'Published on the store' },
  { value: 'rejected',       label: 'Rejected',       description: 'Store review rejected the build' },
  { value: 'suspended',      label: 'Suspended',      description: 'Store has temporarily suspended' },
  { value: 'removed',        label: 'Removed',        description: 'Pulled / unpublished' },
  { value: 'closed',         label: 'Closed',         description: 'Account terminated — app closed' },
];

export function statusIcon(status: string, size = 12) {
  switch (status) {
    case 'live':           return <CheckCircle2 size={size} />;
    case 'pending_review': return <Clock size={size} />;
    case 'rejected':       return <XCircle size={size} />;
    case 'suspended':      return <ShieldAlert size={size} />;
    case 'removed':        return <Ban size={size} />;
    case 'closed':         return <Lock size={size} />;
    default:               return <CircleDashed size={size} />;
  }
}

export function statusLabel(status: string) {
  return STATUS_OPTIONS.find(o => o.value === status)?.label ?? 'Draft';
}

export default function AppStatusMenu({
  appId,
  status,
  size = 'normal',
}: {
  appId: number;
  status: string;
  size?: 'normal' | 'large';
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState(status || 'draft');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCurrent(status || 'draft'), [status]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function pick(value: AppStatus) {
    if (value === current) { setOpen(false); return; }
    setPending(true);
    const res = await updateAppStatus(appId, value);
    setPending(false);
    if (res.error) { alert(res.error); return; }
    setCurrent(value);
    setOpen(false);
  }

  return (
    <div className={`status-menu-wrap ${size}`} ref={wrapperRef}>
      <button
        type="button"
        className={`status-pill status-${current} ${pending ? 'is-pending' : ''}`}
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        title="Change app status"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : statusIcon(current)}
        <span>{statusLabel(current)}</span>
        <ChevronDown size={12} className="status-chev" />
      </button>

      {open && (
        <div className="status-menu" role="menu">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              className={`status-menu-item status-${opt.value} ${opt.value === current ? 'is-current' : ''}`}
              onClick={() => pick(opt.value)}
            >
              <span className="status-menu-item-icon">{statusIcon(opt.value, 14)}</span>
              <span className="status-menu-item-text">
                <strong>{opt.label}</strong>
                <small>{opt.description}</small>
              </span>
              {opt.value === current && <Check size={14} className="status-menu-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
