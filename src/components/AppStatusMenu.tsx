'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCurrent(status || 'draft'), [status]);

  // Position the dropdown below the trigger, flipping upward if there's no room
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function place() {
      const t = triggerRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const menuW = 260;
      const menuH = menuRef.current?.offsetHeight ?? 360;
      let left = rect.left;
      if (left + menuW > window.innerWidth - 12) left = window.innerWidth - menuW - 12;
      if (left < 12) left = 12;
      let top = rect.bottom + 8;
      if (top + menuH > window.innerHeight - 12) {
        top = Math.max(12, rect.top - menuH - 8);
      }
      setCoords({ top, left, width: menuW });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
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

  const menu = open && coords && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      className="status-menu"
      role="menu"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
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
    </div>,
    document.body,
  ) : null;

  return (
    <div className={`status-menu-wrap ${size}`} ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`status-pill status-${current} ${pending ? 'is-pending' : ''} ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        title="Change app status"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : statusIcon(current)}
        <span>{statusLabel(current)}</span>
        <ChevronDown size={12} className="status-chev" />
      </button>
      {menu}
    </div>
  );
}
