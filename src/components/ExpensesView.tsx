'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, Plus, Trash2, ArrowRight, RefreshCw, Loader2, Check, Edit3,
  TrendingUp, Users, DollarSign, Receipt, Calendar, Tag, ArrowLeftRight,
  Banknote, Clock, CheckCircle2,
} from 'lucide-react';
import {
  addExpense, deleteExpense, setExchangeRate, setExpensePaymentStatus,
  type ExpenseSummary, type Payer, type Currency, type PaymentStatus,
} from '@/lib/actions';

const PEOPLE: { id: Payer; name: string; tone: string }[] = [
  { id: 'marwan',   name: 'Marwan',   tone: 'marwan' },
  { id: 'abdsamad', name: 'Abdsamad', tone: 'abdsamad' },
];

function fmtMAD(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n) + ' MAD';
}
function fmtUSD(n: number) {
  return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}
function personLabel(id: Payer) {
  return PEOPLE.find(p => p.id === id)?.name ?? id;
}

export default function ExpensesView({
  initialRate, summary, expenses,
}: {
  initialRate: number;
  summary: ExpenseSummary;
  expenses: any[];
}) {
  const router = useRouter();
  const [rate, setRate] = useState(initialRate);
  const [rateDraft, setRateDraft] = useState(String(initialRate));
  const [editingRate, setEditingRate] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [, startTransition] = useTransition();

  // Add-expense form state
  const [payer, setPayer] = useState<Payer>('marwan');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('MAD');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Live conversion in the form
  const numericAmount = parseFloat(amount) || 0;
  const liveMAD = currency === 'MAD' ? numericAmount : numericAmount * rate;
  const liveUSD = currency === 'USD' ? numericAmount : numericAmount / rate;

  // Filter
  const [filter, setFilter] = useState<'all' | Payer | 'paid' | 'pending'>('all');
  const filteredExpenses = useMemo(() => {
    if (filter === 'all')     return expenses;
    if (filter === 'paid')    return expenses.filter((e: any) => (e.payment_status || 'paid') === 'paid');
    if (filter === 'pending') return expenses.filter((e: any) => e.payment_status === 'pending');
    return expenses.filter((e: any) => e.payer === filter);
  }, [filter, expenses]);

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

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || numericAmount <= 0) {
      alert('Enter an amount greater than 0.');
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.set('payer', payer);
    fd.set('amount', String(numericAmount));
    fd.set('currency', currency);
    fd.set('paymentStatus', paymentStatus);
    fd.set('description', description);
    fd.set('category', category);
    fd.set('expenseDate', expenseDate);
    const res = await addExpense(fd);
    setSubmitting(false);
    if (res.error) { alert(res.error); return; }
    setAmount('');
    setDescription('');
    setCategory('');
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this charge?')) return;
    const res = await deleteExpense(id);
    if (res.error) { alert(res.error); return; }
    startTransition(() => router.refresh());
  }

  async function togglePaid(id: number, current: PaymentStatus) {
    const next: PaymentStatus = current === 'paid' ? 'pending' : 'paid';
    setTogglingId(id);
    const res = await setExpensePaymentStatus(id, next);
    setTogglingId(null);
    if (res.error) { alert(res.error); return; }
    startTransition(() => router.refresh());
  }

  const settlementSentence =
    summary.whoOwes && summary.whoReceives && summary.settlementMAD > 0.005
      ? `${personLabel(summary.whoOwes)} should send ${personLabel(summary.whoReceives)}`
      : 'All squared up! No payment needed.';

  const pendingCount = expenses.filter((e: any) => e.payment_status === 'pending').length;
  const paidCount    = expenses.filter((e: any) => (e.payment_status || 'paid') === 'paid').length;

  return (
    <div className="page-container expenses-page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Shared Charges</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Track every business expense for Marwan &amp; Abdsamad — paid or kridi (credit) — and see who owes who.
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
              <button type="button" className="btn btn-secondary small" onClick={() => { setRateDraft(String(rate)); setEditingRate(false); }}>
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

      {/* Settlement banner */}
      <section className={`settlement-banner glass-card ${summary.settlementMAD > 0.005 ? 'has-balance' : 'is-even'}`}>
        <div className="settlement-icon"><Banknote size={28} /></div>
        <div className="settlement-body">
          <div className="info-eyebrow">SETTLEMENT (PAID ONLY)</div>
          <h2 className="settlement-line">{settlementSentence}</h2>
          {summary.whoOwes && summary.whoReceives && summary.settlementMAD > 0.005 && (
            <div className="settlement-amounts">
              <span className="settlement-amount-mad">{fmtMAD(summary.settlementMAD)}</span>
              <span className="settlement-amount-usd">≈ {fmtUSD(summary.settlementUSD)}</span>
            </div>
          )}
          {!(summary.whoOwes && summary.whoReceives && summary.settlementMAD > 0.005) && (
            <p className="text-muted">Both partners have contributed an equal share of cash so far.</p>
          )}
          {summary.pendingTotalMAD > 0.005 && (
            <p className="text-muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
              <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {fmtMAD(summary.pendingTotalMAD)} of kridi (credit) is not counted in this settlement.
            </p>
          )}
        </div>
        {summary.whoOwes && summary.whoReceives && summary.settlementMAD > 0.005 && (
          <div className="settlement-flow">
            <div className={`settlement-chip from-${summary.whoOwes}`}>
              <small>FROM</small>
              <strong>{personLabel(summary.whoOwes)}</strong>
            </div>
            <ArrowRight size={22} className="text-muted" />
            <div className={`settlement-chip to-${summary.whoReceives}`}>
              <small>TO</small>
              <strong>{personLabel(summary.whoReceives)}</strong>
            </div>
          </div>
        )}
      </section>

      {/* Stats grid */}
      <section className="exp-stats-grid">
        <div className="exp-stat glass-card">
          <div className="exp-stat-icon"><CheckCircle2 size={20} /></div>
          <div>
            <div className="exp-stat-label">Cash spent (paid)</div>
            <div className="exp-stat-value">{fmtMAD(summary.paidTotalMAD)}</div>
            <div className="exp-stat-sub">≈ {fmtUSD(summary.paidTotalUSD)}</div>
          </div>
        </div>
        <div className="exp-stat glass-card kridi-stat">
          <div className="exp-stat-icon kridi-icon"><Clock size={20} /></div>
          <div>
            <div className="exp-stat-label">Kridi (credit, unpaid)</div>
            <div className="exp-stat-value">{fmtMAD(summary.pendingTotalMAD)}</div>
            <div className="exp-stat-sub">≈ {fmtUSD(summary.pendingTotalUSD)}</div>
          </div>
        </div>
        {PEOPLE.map(p => {
          const me = summary.perPerson[p.id];
          const balanceColor = me.balance > 0.005 ? 'positive' : me.balance < -0.005 ? 'negative' : 'neutral';
          return (
            <div key={p.id} className={`exp-stat glass-card person-stat tone-${p.tone}`}>
              <div className="exp-stat-icon person-avatar">{p.name.charAt(0)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="exp-stat-label">{p.name}</div>
                <div className="exp-stat-value">{fmtMAD(me.paid.mad)}</div>
                <div className="exp-stat-sub">
                  <CheckCircle2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  paid · {me.paid.count} entr{me.paid.count === 1 ? 'y' : 'ies'}
                </div>
                {me.pending.mad > 0.005 && (
                  <div className="exp-stat-sub kridi-line">
                    <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {fmtMAD(me.pending.mad)} kridi · {me.pending.count} commitment{me.pending.count === 1 ? '' : 's'}
                  </div>
                )}
                <div className={`balance-pill balance-${balanceColor}`}>
                  {balanceColor === 'positive' && <>+{fmtMAD(me.balance)} • should receive</>}
                  {balanceColor === 'negative' && <>{fmtMAD(me.balance)} • owes back</>}
                  {balanceColor === 'neutral' && <>Even with fair share</>}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Add expense + Recent list */}
      <div className="exp-grid">
        {/* LEFT: Add form */}
        <section className="glass-card exp-form-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Plus size={20} /> Log a charge</h2>
          </div>

          <form onSubmit={handleAddExpense} className="exp-form">
            <div className="exp-payer-toggle">
              {PEOPLE.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`exp-payer-btn tone-${p.tone} ${payer === p.id ? 'active' : ''}`}
                  onClick={() => setPayer(p.id)}
                >
                  <span className="exp-payer-avatar">{p.name.charAt(0)}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            <div className="exp-amount-row">
              <div className="input-field grow">
                <label>Amount</label>
                <div className="input-with-icon-large">
                  <DollarSign size={20} />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="exp-currency-toggle">
                <button type="button" className={currency === 'MAD' ? 'active' : ''} onClick={() => setCurrency('MAD')}>MAD</button>
                <button type="button" className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
              </div>
            </div>

            {numericAmount > 0 && (
              <div className="exp-conversion-row">
                <RefreshCw size={14} />
                <span>{fmtMAD(liveMAD)}</span>
                <span className="text-muted">·</span>
                <span>{fmtUSD(liveUSD)}</span>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>at 1 USD = {rate.toFixed(2)} MAD</span>
              </div>
            )}

            {/* Paid vs Kridi */}
            <div className="exp-status-toggle">
              <label className="exp-status-label">Payment status</label>
              <div className="exp-status-options">
                <button
                  type="button"
                  className={`exp-status-btn paid ${paymentStatus === 'paid' ? 'active' : ''}`}
                  onClick={() => setPaymentStatus('paid')}
                >
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Paid</strong>
                    <small>Cash already left the pocket</small>
                  </div>
                </button>
                <button
                  type="button"
                  className={`exp-status-btn pending ${paymentStatus === 'pending' ? 'active' : ''}`}
                  onClick={() => setPaymentStatus('pending')}
                >
                  <Clock size={16} />
                  <div>
                    <strong>Kridi (credit)</strong>
                    <small>Promised — not paid yet</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="exp-form-grid-2">
              <div className="input-field">
                <label>Description</label>
                <div className="input-with-icon-large">
                  <Receipt size={20} />
                  <input
                    type="text"
                    placeholder="e.g. Vercel subscription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-field">
                <label>Category (optional)</label>
                <div className="input-with-icon-large">
                  <Tag size={20} />
                  <input
                    type="text"
                    placeholder="e.g. Hosting, Tools, Ads"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-field" style={{ gridColumn: '1 / -1' }}>
                <label>Date</label>
                <div className="input-with-icon-large">
                  <Calendar size={20} />
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-accent btn-glow full-width" disabled={submitting}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {submitting ? 'Saving…' : `Add ${paymentStatus === 'paid' ? 'paid charge' : 'kridi'} for ${personLabel(payer)}`}
            </button>
          </form>
        </section>

        {/* RIGHT: Expenses list */}
        <section className="glass-card exp-list-card">
          <div className="info-section-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Wallet size={20} /> All charges</h2>
            <div className="exp-filter-tabs">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All ({expenses.length})</button>
              <button className={filter === 'paid' ? 'active filter-paid' : 'filter-paid'} onClick={() => setFilter('paid')}>Paid ({paidCount})</button>
              <button className={filter === 'pending' ? 'active filter-pending' : 'filter-pending'} onClick={() => setFilter('pending')}>Kridi ({pendingCount})</button>
              {PEOPLE.map(p => (
                <button key={p.id} className={`tone-${p.tone} ${filter === p.id ? 'active' : ''}`} onClick={() => setFilter(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="empty-screens" style={{ marginTop: 16 }}>
              <Wallet size={28} />
              <p>No charges to show.</p>
            </div>
          ) : (
            <div className="exp-table">
              {filteredExpenses.map((e: any) => {
                const status: PaymentStatus = e.payment_status === 'pending' ? 'pending' : 'paid';
                return (
                  <div key={e.id} className={`exp-row tone-${e.payer} status-${status}`}>
                    <div className="exp-row-payer">
                      <div className="exp-payer-avatar">{personLabel(e.payer).charAt(0)}</div>
                      <div>
                        <strong>{personLabel(e.payer)}</strong>
                        <small>{e.expense_date || new Date(e.created_at).toLocaleDateString()}</small>
                      </div>
                    </div>
                    <div className="exp-row-desc">
                      <strong>{e.description || 'Untitled charge'}</strong>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {e.category && <span className="exp-row-tag">{e.category}</span>}
                        <button
                          type="button"
                          className={`exp-status-pill ${status} ${togglingId === e.id ? 'is-pending' : ''}`}
                          onClick={() => togglePaid(e.id, status)}
                          disabled={togglingId === e.id}
                          title={status === 'paid' ? 'Mark as kridi (credit)' : 'Mark as paid'}
                        >
                          {togglingId === e.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : status === 'paid'
                              ? <CheckCircle2 size={11} />
                              : <Clock size={11} />}
                          {status === 'paid' ? 'Paid' : 'Kridi'}
                        </button>
                      </div>
                    </div>
                    <div className="exp-row-amount">
                      <div className="exp-row-amount-primary">
                        {e.currency === 'MAD' ? fmtMAD(e.amount) : fmtUSD(e.amount)}
                      </div>
                      <div className="exp-row-amount-secondary">
                        {e.currency === 'MAD'
                          ? `≈ ${fmtUSD(e.amount_usd)}`
                          : `≈ ${fmtMAD(e.amount_mad)}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary small"
                      style={{ width: 36, padding: 0, justifyContent: 'center', color: '#ef4444' }}
                      onClick={() => handleDelete(e.id)}
                      title="Delete charge"
                    >
                      <Trash2 size={14} />
                    </button>
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
