import { getAccountById, getApps, getCompanies } from '@/lib/actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Globe, Phone, Hash, Smartphone, ShieldCheck, ShieldAlert, Building2 } from 'lucide-react';
import AppList from '@/components/AppList';
import EditAccountModal from '@/components/EditAccountModal';
import CreateAppModal from '@/components/CreateAppModal';
import AccountSecureInfo from '@/components/AccountSecureInfo';
import AccountShareLinkButton from '@/components/AccountShareLinkButton';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (Number.isNaN(accountId)) return notFound();

  const account = await getAccountById(accountId);
  if (!account) return notFound();

  const [apps, allCompanies] = await Promise.all([
    getApps(accountId) as Promise<any[]>,
    getCompanies(),
  ]);

  const platformLabel = account.type === 'google_play' ? 'Google Play Console' : 'App Store Connect';
  const platformInitial = account.type === 'google_play' ? 'G' : 'A';

  return (
    <div className="container animate-in account-detail-page">
      <Link href="/accounts" className="back-link">
        <ArrowLeft size={16} />
        Back to Client Accounts
      </Link>

      {/* Account hero */}
      <header className="account-hero glass-card">
        <div className="account-hero-left">
          <div className={`platform-icon-large ${account.type}`}>{platformInitial}</div>
          <div>
            <div className="info-eyebrow">{platformLabel}</div>
            <h1 className="info-title">{account.developer_name || account.email}</h1>
            <div className="account-hero-meta">
              <span className="info-pill"><Mail size={12} /> {account.email}</span>
              {account.developer_id && (
                <span className="info-pill"><Hash size={12} /> {account.developer_id}</span>
              )}
              {account.company_name && (
                <span className="info-pill"><Building2 size={12} /> {account.company_name}</span>
              )}
              {account.website && (
                <a href={account.website} target="_blank" rel="noreferrer" className="info-pill">
                  <Globe size={12} /> Website
                </a>
              )}
              {account.phone && (
                <span className="info-pill"><Phone size={12} /> {account.phone}</span>
              )}
              <span className={`status-pill ${account.status === 'active' ? 'status-live' : 'status-suspended'}`}>
                {account.status === 'active' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                {account.status === 'active' ? 'Active' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
        <div className="account-hero-actions">
          <AccountShareLinkButton accountId={account.id} />
          <EditAccountModal account={account} allCompanies={allCompanies} />
          <CreateAppModal accounts={[account]} />
        </div>
      </header>

      {/* App stats */}
      <div className="account-stats-row">
        <div className="account-stat">
          <span className="account-stat-num">{apps.length}</span>
          <span className="account-stat-label">Total Apps</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-num">{apps.filter(a => a.status === 'live').length}</span>
          <span className="account-stat-label">Live</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-num">{apps.filter(a => a.status === 'rejected').length}</span>
          <span className="account-stat-label">Rejected</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-num">{apps.filter(a => a.status === 'suspended').length}</span>
          <span className="account-stat-label">Suspended</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-num">{apps.filter(a => a.status === 'removed').length}</span>
          <span className="account-stat-label">Removed</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-num">{apps.filter(a => a.status === 'closed').length}</span>
          <span className="account-stat-label">Closed</span>
        </div>
      </div>

      {/* Secure credentials panel */}
      <AccountSecureInfo account={account} />

      {/* Apps under this account */}
      <section className="account-apps-section">
        <div className="section-head-row">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone size={22} /> Applications
          </h2>
        </div>
        <AppList
          initialApps={apps}
          hideDeveloperColumn
          emptyMessage="No applications registered under this developer yet. Use 'Register New App' above to add one."
        />
      </section>
    </div>
  );
}
