'use client';

import { useState, useTransition } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Flag,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';
import { addMission, deleteMission, toggleMission, updateMission, type Mission } from '@/lib/actions';
import { getCurrentUser } from '@/lib/auth';

const TEAM_MEMBERS = ['marwan', 'ilyass', 'abdsamad'];

type Props = { initialMissions: Mission[]; today: string };

function toLocalDate(offset: number, base: string): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function labelForDate(date: string, today: string): string {
  const t = new Date(today + 'T00:00:00');
  const d = new Date(date + 'T00:00:00');
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === -1) return 'Yesterday';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === 2) return 'In 2 days';
  if (diff === 3) return 'In 3 days';
  if (diff < 0) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };
const PRIORITY_COLOR: Record<string, string> = {
  high: 'var(--danger, #ef4444)',
  normal: 'var(--accent)',
  low: 'var(--muted)',
};
const PRIORITY_LABEL: Record<string, string> = { high: 'High', normal: 'Normal', low: 'Low' };

export default function MissionsView({ initialMissions, today }: Props) {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [selectedDate, setSelectedDate] = useState(today);
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const DAY_OFFSETS = [-1, 0, 1, 2, 3];
  const dayTabs = DAY_OFFSETS.map((o) => toLocalDate(o, today));

  const visibleMissions = missions
    .filter((m) => m.due_date === selectedDate)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const doneCount = visibleMissions.filter((m) => m.status === 'done').length;

  function handleToggle(id: number) {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === 'done' ? 'pending' : 'done' } : m
      )
    );
    startTransition(async () => {
      await toggleMission(id);
    });
  }

  function handleDelete(id: number) {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      await deleteMission(id);
    });
  }

  function handleUpdate(updated: Mission) {
    setMissions((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function handleAdd(formData: FormData) {
    const res = await addMission(formData);
    if (res.error) return alert(res.error);
    if (res.data) {
      setMissions((prev) => [...prev, res.data!]);
      setShowAdd(false);
    }
  }

  const hasMissionsForDay = (date: string) => missions.some((m) => m.due_date === date);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Day navigator */}
      <div className="glass-card" style={{ padding: '16px 24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <CalendarDays size={18} style={{ color: 'var(--accent)', marginRight: '4px', flexShrink: 0 }} />
          {dayTabs.map((date) => {
            const isActive = date === selectedDate;
            const hasMissions = hasMissionsForDay(date);
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--card-border)',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--foreground)',
                  fontWeight: isActive ? 700 : 400,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                {labelForDate(date, today)}
                {hasMissions && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--accent)' : 'var(--muted)',
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Custom date picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            style={{
              marginLeft: 'auto',
              padding: '7px 12px',
              borderRadius: '10px',
              border: '1px solid var(--card-border)',
              background: 'var(--glass)',
              color: 'var(--foreground)',
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>

      {/* Header for selected day */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {labelForDate(selectedDate, today)}
            <span className="text-muted" style={{ fontWeight: 400, fontSize: '1rem', marginLeft: '10px' }}>
              {selectedDate}
            </span>
          </h2>
          {visibleMissions.length > 0 && (
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
              {doneCount} / {visibleMissions.length} missions completed
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAdd(true)}
          style={{ gap: '8px', display: 'flex', alignItems: 'center' }}
        >
          <Plus size={18} />
          Add Mission
        </button>
      </div>

      {/* Progress bar */}
      {visibleMissions.length > 0 && (
        <div
          style={{
            height: '6px',
            borderRadius: '999px',
            background: 'var(--card-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(doneCount / visibleMissions.length) * 100}%`,
              background: doneCount === visibleMissions.length ? 'var(--success)' : 'var(--accent)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}

      {/* Missions list */}
      {visibleMissions.length === 0 ? (
        <div
          className="glass-card"
          style={{
            textAlign: 'center',
            padding: '56px 24px',
            color: 'var(--muted)',
          }}
        >
          <CalendarDays size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '1.05rem', fontWeight: 500 }}>No missions for {labelForDate(selectedDate, today)}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>Click "Add Mission" to assign one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visibleMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/* Add mission modal */}
      {showAdd && (
        <AddMissionModal
          defaultDate={selectedDate}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}

// ─── MissionCard ─────────────────────────────────────────────────────────────

function MissionCard({
  mission,
  onToggle,
  onDelete,
  onUpdate,
}: {
  mission: Mission;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (m: Mission) => void;
}) {
  const done = mission.status === 'done';
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div
      className="glass-card"
      style={{
        padding: '18px 22px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        opacity: done ? 0.65 : 1,
        borderColor: done ? 'var(--card-border)' : undefined,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(mission.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          flexShrink: 0,
          marginTop: '2px',
          color: done ? 'var(--success)' : 'var(--muted)',
          transition: 'color 0.2s',
        }}
        title={done ? 'Mark as pending' : 'Mark as done'}
      >
        {done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: done ? 'line-through' : 'none',
              color: done ? 'var(--muted)' : 'var(--foreground)',
            }}
          >
            {mission.title}
          </span>

          {/* Priority badge */}
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              background: `${PRIORITY_COLOR[mission.priority]}22`,
              color: PRIORITY_COLOR[mission.priority],
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Flag size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
            {PRIORITY_LABEL[mission.priority]}
          </span>

          {/* Status badge */}
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              background: done ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.1)',
              color: done ? 'var(--success)' : 'var(--muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {done ? 'Done' : 'Pending'}
          </span>
        </div>

        {mission.description && (
          <p
            className="text-muted"
            style={{ fontSize: '0.875rem', marginTop: '6px', lineHeight: 1.5 }}
          >
            {mission.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          {mission.assigned_to && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: 'var(--muted)' }}>
              <User size={13} />
              {mission.assigned_to}
            </span>
          )}
          {mission.created_by && (
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              by {mission.created_by}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={() => setShowEdit(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--muted)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          title="Edit mission"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this mission?')) onDelete(mission.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--muted)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          title="Delete mission"
        >
          <Trash2 size={17} />
        </button>
      </div>

      {showEdit && (
        <EditMissionModal
          mission={mission}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => { onUpdate(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}

// ─── EditMissionModal ─────────────────────────────────────────────────────────

function EditMissionModal({
  mission,
  onClose,
  onSave,
}: {
  mission: Mission;
  onClose: () => void;
  onSave: (m: Mission) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateMission(mission.id, fd);
    setLoading(false);
    if (result.error) return alert(result.error);
    onSave({
      ...mission,
      title: fd.get('title')?.toString() || mission.title,
      description: fd.get('description')?.toString() || '',
      assigned_to: fd.get('assigned_to')?.toString() || '',
      due_date: fd.get('due_date')?.toString() || mission.due_date,
      priority: (fd.get('priority')?.toString() || 'normal') as Mission['priority'],
    });
  }

  return (
    <ModalPortal open={true}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="glass-card"
          style={{ width: '100%', maxWidth: '480px', borderRadius: '20px', padding: '32px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Edit Mission</h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Title *
              </label>
              <input name="title" required defaultValue={mission.title} placeholder="What needs to be done?" style={{ width: '100%' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Description
              </label>
              <textarea name="description" defaultValue={mission.description || ''} placeholder="Optional details…" rows={3} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                  Due Date *
                </label>
                <input name="due_date" type="date" required defaultValue={mission.due_date} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                  Priority
                </label>
                <select name="priority" defaultValue={mission.priority} style={{ width: '100%' }}>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Assign To
              </label>
              <select name="assigned_to" defaultValue={mission.assigned_to || ''} style={{ width: '100%' }}>
                <option value="">— Unassigned —</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

// ─── AddMissionModal ──────────────────────────────────────────────────────────

function AddMissionModal({
  defaultDate,
  onClose,
  onSubmit,
}: {
  defaultDate: string;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const user = typeof window !== 'undefined' ? getCurrentUser() : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (user) formData.set('created_by', user.email.split('@')[0]);
    await onSubmit(formData);
    setLoading(false);
    onClose();
  }

  return (
    <ModalPortal open={true}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '480px',
            borderRadius: '20px',
            padding: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>New Mission</h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Title *
              </label>
              <input
                name="title"
                required
                placeholder="What needs to be done?"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                name="description"
                placeholder="Optional details…"
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                  Due Date *
                </label>
                <input
                  name="due_date"
                  type="date"
                  required
                  defaultValue={defaultDate}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                  Priority
                </label>
                <select name="priority" defaultValue="normal" style={{ width: '100%' }}>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Assign To
              </label>
              <select name="assigned_to" defaultValue="" style={{ width: '100%' }}>
                <option value="">— Unassigned —</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Add Mission'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
