'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Loader2, Check, Edit3, ArrowLeftRight,
  DollarSign, Calendar, Receipt, TrendingUp, Wallet,
  Split, Megaphone, Sparkles,
  Infinity as InfinityIcon, Triangle, Box, Coins, Percent,
} from 'lucide-react';
import {
  addIncome, deleteIncome, setExchangeRate, setIncomeSplitPct,
  type IncomeNetwork, type IncomeSummary, type Currency,
} from '@/lib/actions';

type NetworkDef = {
  id: IncomeNetwork;
  name: string;
  initials: string;
  color: string;
  bg: string;
  border: string;
  Icon: React.ComponentType<{ size?: number }>;
  tagline: string;
};

const NETWORKS: NetworkDef[] = [
  {
    id: 'admob',
    name: 'AdMob',
    initials: 'AM',
    color: '#FBBC04',
    bg: 'rgba(251, 188, 4, 0.12)',
    border: 'rgba(251, 188, 4, 0.4)',
    Icon: Megaphone,
    tagline: 'Google',
  },
  {
    id: 'applovin',
    name: 'AppLovin',
    initials: 'AL',
    color: '#00DC78',
    bg: 'rgba(0, 220, 120, 0.12)',
    border: 'rgba(0, 220, 120, 0.4)',
    Icon: Sparkles,
    tagline: 'MAX',
  },
  {
    id: 'audience_network',
    name: 'Audience Network',
    initials: 'AN',
    color: '#1877F2',
    bg: 'rgba(24, 119, 242, 0.12)',
    border: 'rgba(24, 119, 242, 0.4)',
    Icon: InfinityIcon,
    tagline: 'Meta',
  },
  {
    id: 'pangle',
    name: 'Pangle',
    initials: 'PG',
    color: '#FF4D4F',
    bg: 'rgba(255, 77, 79, 0.12)',
    border: 'rgba(255, 77, 79, 0.4)',
    Icon: Triangle,
    tagline: 'ByteDance',
  },
  {
    id: 'unity',
    name: 'Unity',
    initials: 'U',
    color: '#E6E8EB',
    bg: 'rgba(230, 232, 235, 0.1)',
    border: 'rgba(230, 232, 235, 0.35)',
    Icon: Box,
    tagline: 'Unity Ads',
  },
];

const NETWORK_BY_ID: Record<IncomeNetwork, NetworkDef> = NETWORKS.reduce(
  (acc, n) => ({ ...acc, [n.id]: n }),
  {} as Record<IncomeNetwork, NetworkDef>,
);

function fmtUSD(n: number) {
  return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}
function fmtMAD(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n) + ' MAD';
}

function netStyle(n: NetworkDef) {
  return {
    ['--net-color' as any]: n.color,
    ['--net-bg' as any]: n.bg,
    ['--net-border' as any]: n.border,
  } as React.CSSProperties;
}

export default function IncomeView({
  initialRate, summary, incomes,
}: {
  initialRate: number;
  summary: IncomeSummary;
  incomes: any[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Exchange rate
  const [rate, setRate] = useState(initialRate);
  const [rateDraft, setRateDraft] = useState(String(initialRate));
  const [editingRate, setEditingRate] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  // Split percentage (Marwan %; Abdsamad = 100 - Marwan).
  // `editingPctIn` tracks which location opened the editor so only one
  // popover shows at a time (hero badge or Log-payouts form).
  const [pctMarwan, setPctMarwan] = useState<number>(summary.splitPctMarwan);
  const [pctDraft, setPctDraft] = useState<string>(String(summary.splitPctMarwan));
  const [editingPctIn, setEditingPctIn] = useState<null | 'hero' | 'form'>(null);
  const [savingPct, setSavingPct] = useState(false);

  // Add-income form: multi-select networks with per-network amount + currency
  const [selectedNetworks, setSelectedNetworks] = useState<IncomeNetwork[]>(['admob']);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [currencies, setCurrencies] = useState<Record<string, Currency>>({});
  const [description, setDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Filter — multi-select (empty = show all)
  const [activeFilters, setActiveFilters] = useState<IncomeNetwork[]>([]);
  const filteredIncomes = useMemo(() => {
    if (activeFilters.length === 0) return incomes;
    return incomes.filter((row: any) => activeFilters.includes(row.network));
  }, [activeFilters, incomes]);

  // Split happens per-payout (not on the cumulative total), so we only
  // need the percentages here — partner amounts are computed inside each row.
  const pctAbdsamad = 100 - pctMarwan;

  // Live conversion preview (sum across selected networks)
  const liveTotals = useMemo(() => {
    let usd = 0;
    let mad = 0;
    for (const id of selectedNetworks) {
      const n = parseFloat(amounts[id] || '0');
      if (!Number.isFinite(n) || n <= 0) continue;
      const c = currencies[id] || 'USD';
      usd += c === 'USD' ? n : n / rate;
      mad += c === 'MAD' ? n : n * rate;
    }
    return { usd, mad };
  }, [selectedNetworks, amounts, currencies, rate]);

  function toggleSelected(id: IncomeNetwork) {
    setSelectedNetworks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleFilter(id: IncomeNetwork) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function saveRate() {
    const r = parseFloat(rateDraft);
    if (!Number.isFinite(r) || r <= 0) {
      alert('Enter a positive number.');
      return;
    }
    setSavingRate(true);
    const res = await setExchangeRate(r);
    setSavingRate(false);
    if (res.error) { alert(res.error); return; }
    setRate(r);
    setEditingRate(false);
  }

  async function savePct() {
    const p = parseFloat(pctDraft);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      alert('Percentage must be between 0 and 100.');
      return;
    }
    setSavingPct(true);
    const res = await setIncomeSplitPct(p);
    setSavingPct(false);
    if (res.error) { alert(res.error); return; }
    setPctMarwan(p);
    setEditingPctIn(null);
  }

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    if (selectedNetworks.length === 0) {
      alert('Select at least one network.');
      return;
    }
    const rows = selectedNetworks
      .map((id) => ({
        id,
        amount: parseFloat(amounts[id] || '0'),
        currency: (currencies[id] || 'USD') as Currency,
      }))
      .filter((r) => Number.isFinite(r.amount) && r.amount > 0);

    if (rows.length === 0) {
      alert('Enter at least one amount greater than 0.');
      return;
    }
    if (rows.length !== selectedNetworks.length) {
      const missing = selectedNetworks
        .filter((id) => !rows.find((r) => r.id === id))
        .map((id) => NETWORK_BY_ID[id].name)
        .join(', ');
      if (!confirm(`Skip these networks (no amount entered)?\n\n${missing}`)) return;
    }

    setSubmitting(true);
    try {
      for (const r of rows) {
        const fd = new FormData();
        fd.set('network', r.id);
        fd.set('amount', String(r.amount));
        fd.set('currency', r.currency);
        fd.set('description', description);
        fd.set('incomeDate', incomeDate);
        const res = await addIncome(fd);
        if (res.error) {
          alert(`Failed for ${NETWORK_BY_ID[r.id].name}: ${res.error}`);
          setSubmitting(false);
          return;
        }
      }
      setAmounts({});
      setDescription('');
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this payout entry?')) return;
    const res = await deleteIncome(id);
    if (res.error) { alert(res.error); return; }
    startTransition(() => router.refresh());
  }

  const networkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of incomes) counts[row.network] = (counts[row.network] || 0) + 1;
    return counts;
  }, [incomes]);

  const draftMarwan = Math.max(0, Math.min(100, parseFloat(pctDraft) || 0));
  const draftAbdsamad = 100 - draftMarwan;

  function renderPctEditor() {
    return (
      <div className="income-pct-editor">
        <div className="income-pct-header">
          <div className="income-pct-header-title">
            <Split size={14} /> <span>Percentage split</span>
          </div>
          <div className="income-pct-actions">
            <button type="button" className="btn btn-secondary small"
              onClick={() => { setPctDraft(String(pctMarwan)); setEditingPctIn(null); }}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary small" onClick={savePct} disabled={savingPct}>
              {savingPct ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Save
            </button>
          </div>
        </div>

        <div className="income-pct-partners">
          <div className="income-pct-partner tone-marwan">
            <div className="income-pct-partner-avatar">M</div>
            <div className="income-pct-partner-body">
              <small>MARWAN</small>
              <div className="income-pct-partner-value">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={pctDraft}
                  onChange={(e) => setPctDraft(e.target.value)}
                  aria-label="Marwan percentage"
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <div className="income-pct-partner tone-abdsamad">
            <div className="income-pct-partner-avatar">A</div>
            <div className="income-pct-partner-body">
              <small>ABDSAMAD</small>
              <div className="income-pct-partner-value">
                <strong>{draftAbdsamad}</strong>
                <span>%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="income-pct-slider-wrap">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={draftMarwan}
            onChange={(e) => setPctDraft(e.target.value)}
            className="income-pct-slider"
            style={{ ['--pct' as any]: `${draftMarwan}%` }}
            aria-label="Adjust split"
          />
          <div className="income-pct-slider-ticks">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>

        <div className="income-pct-presets">
          {[
            { m: 50, a: 50 },
            { m: 60, a: 40 },
            { m: 70, a: 30 },
            { m: 80, a: 20 },
          ].map((p) => (
            <button
              key={p.m}
              type="button"
              className={`income-pct-preset ${draftMarwan === p.m ? 'active' : ''}`}
              onClick={() => setPctDraft(String(p.m))}
            >
              <strong>{p.m}<span>/</span>{p.a}</strong>
              <small>M / A</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container income-page">
      <header
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, gap: 24, flexWrap: 'wrap' }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Network Income</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Every payout we received from AdMob, AppLovin, Audience Network, Pangle &amp; Unity — and how we split it.
          </p>
        </div>
        <div className="rate-pill">
          <div className="rate-pill-icon"><ArrowLeftRight size={18} /></div>
          {editingRate ? (
            <div className="rate-pill-edit">
              <span>1 USD =</span>
              <input
                type="number"
                step="0.01"
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                autoFocus
              />
              <span>MAD</span>
              <button type="button" className="btn btn-primary small" onClick={saveRate} disabled={savingRate}>
                {savingRate ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
              <button type="button" className="btn btn-secondary small"
                onClick={() => { setRateDraft(String(rate)); setEditingRate(false); }}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div>
                <strong>1 USD = {rate.toFixed(2)} MAD</strong>
                <span className="text-muted" style={{ fontSize: '0.78rem', display: 'block' }}>USD ↔ MAD exchange rate</span>
              </div>
              <button type="button" className="btn btn-secondary small" onClick={() => setEditingRate(true)}>
                <Edit3 size={14} /> Update
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero: total + split */}
      <section className="income-hero glass-card">
        <div className="income-hero-main">
          <div className="income-hero-icon"><Wallet size={30} /></div>
          <div>
            <div className="info-eyebrow">TOTAL RECEIVED FROM NETWORKS</div>
            <h2 className="income-hero-amount">{fmtUSD(summary.totalUSD)}</h2>
            <p className="text-muted income-hero-sub">
              ≈ {fmtMAD(summary.totalMAD)} · {summary.entries} payout{summary.entries === 1 ? '' : 's'} across {NETWORKS.length} networks
            </p>
          </div>
        </div>

        <div className="income-split-flow">
          <div className="income-split-pill-row">
            <div className="income-split-pill">
              <Split size={14} /> {pctMarwan}% / {pctAbdsamad}% split
            </div>
            {editingPctIn === null ? (
              <button type="button" className="btn btn-secondary small" onClick={() => setEditingPctIn('hero')}>
                <Percent size={13} /> Edit split
              </button>
            ) : null}
          </div>

          {editingPctIn === 'hero' && renderPctEditor()}

          <p className="text-muted income-split-helper">
            The split applies to <strong>each payout individually</strong> — open any entry in the All Payouts list below to see what Marwan &amp; Abdsamad get from it.
          </p>
        </div>
      </section>

      {/* Networks grid */}
      <section className="income-networks-grid">
        {NETWORKS.map((n) => {
          const bucket = summary.perNetwork[n.id];
          const Icon = n.Icon;
          const share = summary.totalUSD > 0 ? (bucket.usd / summary.totalUSD) * 100 : 0;
          return (
            <div key={n.id} className="income-network-card glass-card" style={netStyle(n)}>
              <div className="income-network-head">
                <div className="income-network-logo">
                  <Icon size={22} />
                  <span className="income-network-initials">{n.initials}</span>
                </div>
                <div className="income-network-meta">
                  <strong>{n.name}</strong>
                  <small>{n.tagline}</small>
                </div>
              </div>
              <div className="income-network-amount">{fmtUSD(bucket.usd)}</div>
              <div className="income-network-mad">≈ {fmtMAD(bucket.mad)}</div>
              <div className="income-network-bar">
                <div className="income-network-bar-fill" style={{ width: `${Math.min(share, 100)}%` }} />
              </div>
              <div className="income-network-foot">
                <span>{bucket.count} payout{bucket.count === 1 ? '' : 's'}</span>
                <span>{share.toFixed(1)}% of total</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Add income + entries list */}
      <div className="exp-grid">
        {/* LEFT: form */}
        <section className="glass-card exp-form-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={20} /> Log payouts
            </h2>
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>
              {selectedNetworks.length} network{selectedNetworks.length === 1 ? '' : 's'} selected
            </span>
          </div>

          <form onSubmit={handleAddIncome} className="exp-form">
            <div className="income-form-split-row">
              <div className="income-split-pill">
                <Split size={14} /> {pctMarwan}% / {pctAbdsamad}% split
              </div>
              {editingPctIn === null ? (
                <button type="button" className="btn btn-secondary small" onClick={() => setEditingPctIn('form')}>
                  <Percent size={13} /> Edit split
                </button>
              ) : null}
            </div>

            {editingPctIn === 'form' && renderPctEditor()}

            <div>
              <label className="exp-status-label">Networks (select one or more)</label>
              <div className="income-network-toggle">
                {NETWORKS.map((n) => {
                  const Icon = n.Icon;
                  const isOn = selectedNetworks.includes(n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`income-network-toggle-btn ${isOn ? 'active' : ''}`}
                      style={netStyle(n)}
                      onClick={() => toggleSelected(n.id)}
                      aria-pressed={isOn}
                    >
                      {isOn && <Check size={12} />}
                      <Icon size={16} />
                      <span>{n.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* One amount row per selected network */}
            {selectedNetworks.length > 0 && (
              <div className="income-multi-rows">
                {selectedNetworks.map((id) => {
                  const def = NETWORK_BY_ID[id];
                  const Icon = def.Icon;
                  const cur = currencies[id] || 'USD';
                  const val = amounts[id] || '';
                  const num = parseFloat(val) || 0;
                  const marwanShare = (num * pctMarwan) / 100;
                  const abdsamadShare = (num * pctAbdsamad) / 100;
                  const fmt = cur === 'USD' ? fmtUSD : fmtMAD;
                  return (
                    <div key={id} className="income-multi-row" style={netStyle(def)}>
                      <div className="income-multi-row-top">
                        <div className="income-multi-row-label">
                          <div className="income-multi-row-icon"><Icon size={16} /></div>
                          <strong>{def.name}</strong>
                        </div>
                        <div className="income-multi-row-input">
                          <DollarSign size={16} />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={val}
                            onChange={(e) => setAmounts({ ...amounts, [id]: e.target.value })}
                          />
                        </div>
                        <div className="exp-currency-toggle income-multi-cur">
                          <button
                            type="button"
                            className={cur === 'USD' ? 'active' : ''}
                            onClick={() => setCurrencies({ ...currencies, [id]: 'USD' })}
                          >USD</button>
                          <button
                            type="button"
                            className={cur === 'MAD' ? 'active' : ''}
                            onClick={() => setCurrencies({ ...currencies, [id]: 'MAD' })}
                          >MAD</button>
                        </div>
                      </div>

                      {num > 0 && (
                        <div className="income-multi-row-split">
                          <Split size={12} />
                          <span className="income-multi-row-split-label">
                            {pctMarwan}/{pctAbdsamad} split
                          </span>
                          <span className="income-split-chip tone-marwan">
                            <span className="income-split-chip-avatar">M</span>
                            {fmt(marwanShare)}
                          </span>
                          <span className="income-split-chip tone-abdsamad">
                            <span className="income-split-chip-avatar">A</span>
                            {fmt(abdsamadShare)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {liveTotals.usd > 0 && (
              <div className="exp-conversion-row income-conversion">
                <TrendingUp size={14} />
                <span>{fmtUSD(liveTotals.usd)}</span>
                <span className="text-muted">·</span>
                <span>{fmtMAD(liveTotals.mad)}</span>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                  combined · {pctMarwan}/{pctAbdsamad} → M {fmtUSD((liveTotals.usd * pctMarwan) / 100)} · A {fmtUSD((liveTotals.usd * pctAbdsamad) / 100)}
                </span>
              </div>
            )}

            <div className="exp-form-grid-2">
              <div className="input-field">
                <label>Note (shared, optional)</label>
                <div className="input-with-icon-large">
                  <Receipt size={20} />
                  <input
                    type="text"
                    placeholder="e.g. October payouts"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-field">
                <label>Date received</label>
                <div className="input-with-icon-large">
                  <Calendar size={20} />
                  <input
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-accent btn-glow full-width" disabled={submitting || selectedNetworks.length === 0}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Coins size={18} />}
              {submitting
                ? 'Saving…'
                : selectedNetworks.length === 1
                  ? `Add payout from ${NETWORK_BY_ID[selectedNetworks[0]].name}`
                  : `Add ${selectedNetworks.length} payouts`}
            </button>
          </form>
        </section>

        {/* RIGHT: list */}
        <section className="glass-card exp-list-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wallet size={20} /> All payouts
            </h2>
            <div className="exp-filter-tabs income-filter-tabs">
              <button
                className={activeFilters.length === 0 ? 'active' : ''}
                onClick={() => setActiveFilters([])}
              >
                All ({incomes.length})
              </button>
              {NETWORKS.map((n) => {
                const isOn = activeFilters.includes(n.id);
                return (
                  <button
                    key={n.id}
                    className={isOn ? 'active' : ''}
                    style={netStyle(n)}
                    onClick={() => toggleFilter(n.id)}
                    aria-pressed={isOn}
                  >
                    {isOn && <Check size={11} />} {n.name} ({networkCounts[n.id] || 0})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredIncomes.length === 0 ? (
            <div className="empty-screens" style={{ marginTop: 16 }}>
              <Wallet size={28} />
              <p>No payouts logged yet.</p>
            </div>
          ) : (
            <div className="exp-table">
              {filteredIncomes.map((row: any) => {
                const def = NETWORK_BY_ID[row.network as IncomeNetwork];
                if (!def) return null;
                const Icon = def.Icon;
                const rowAmountInCurrency = Number(row.amount) || 0;
                const rowMarwan = (rowAmountInCurrency * pctMarwan) / 100;
                const rowAbdsamad = (rowAmountInCurrency * pctAbdsamad) / 100;
                const fmtRow = row.currency === 'USD' ? fmtUSD : fmtMAD;
                return (
                  <div key={row.id} className="exp-row income-row" style={netStyle(def)}>
                    <div className="exp-row-payer">
                      <div className="income-row-logo">
                        <Icon size={18} />
                      </div>
                      <div>
                        <strong>{def.name}</strong>
                        <small>{row.income_date || new Date(row.created_at).toLocaleDateString()}</small>
                      </div>
                    </div>
                    <div className="exp-row-desc">
                      <strong>{row.description || `${def.name} payout`}</strong>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span
                          className="exp-row-tag"
                          style={{ color: def.color, borderColor: def.border, background: def.bg }}
                        >
                          {def.tagline}
                        </span>
                      </div>
                    </div>
                    <div className="exp-row-amount">
                      <div className="exp-row-amount-primary" style={{ color: def.color }}>
                        {row.currency === 'USD' ? fmtUSD(row.amount) : fmtMAD(row.amount)}
                      </div>
                      <div className="exp-row-amount-secondary">
                        {row.currency === 'USD'
                          ? `≈ ${fmtMAD(row.amount_mad)}`
                          : `≈ ${fmtUSD(row.amount_usd)}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary small"
                      style={{ width: 36, padding: 0, justifyContent: 'center', color: '#ef4444' }}
                      onClick={() => handleDelete(row.id)}
                      title="Delete payout"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="income-row-split">
                      <span className="income-row-split-label">
                        <Split size={11} /> {pctMarwan}/{pctAbdsamad}
                      </span>
                      <span className="income-split-chip tone-marwan">
                        <span className="income-split-chip-avatar">M</span>
                        {fmtRow(rowMarwan)}
                      </span>
                      <span className="income-split-chip tone-abdsamad">
                        <span className="income-split-chip-avatar">A</span>
                        {fmtRow(rowAbdsamad)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
