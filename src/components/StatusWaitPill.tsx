'use client';

import { Clock, AlertTriangle, Hourglass } from 'lucide-react';

const TERMINAL_STATUSES = new Set(['live', 'suspended', 'closed', 'removed']);

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  if (ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export default function StatusWaitPill({
  status,
  statusUpdatedAt,
  createdAt,
}: {
  status?: string | null;
  statusUpdatedAt?: string | null;
  createdAt?: string | null;
}) {
  const s = (status || 'draft').toLowerCase();
  if (TERMINAL_STATUSES.has(s)) return null;

  const days = daysSince(statusUpdatedAt || createdAt);
  if (days === null) return null;

  // Thresholds: 0–2 calm, 3–5 nudge, 6+ overdue.
  const tone =
    days >= 6 ? 'overdue' :
    days >= 3 ? 'warn' :
    'calm';

  const palette = {
    calm: {
      color: '#9ca3af',
      bg: 'rgba(156, 163, 175, 0.10)',
      border: 'rgba(156, 163, 175, 0.30)',
      Icon: Clock,
    },
    warn: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.35)',
      Icon: Hourglass,
    },
    overdue: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.40)',
      Icon: AlertTriangle,
    },
  }[tone];

  const Icon = palette.Icon;
  const label =
    days === 0 ? 'today' :
    days === 1 ? '1 day' :
    `${days} days`;

  const tooltip =
    tone === 'overdue' ? `Waiting ${label} — chase Google review` :
    tone === 'warn'    ? `Waiting ${label} — check email for Google's response` :
                         `Waiting ${label}`;

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginLeft: 8,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: palette.color,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}
