import { getAccountIdByShareIndex, getAccountSharePackage } from '@/lib/actions';
import { notFound, redirect } from 'next/navigation';
import AccountSharePackage from '@/components/AccountSharePackage';
import type { Metadata } from 'next';

// `[id]` here is the 1-based share index (`/s2` → 2nd account), not the DB row id.
async function resolveAccountId(idParam: string): Promise<number | null> {
  const idx = parseInt(idParam, 10);
  if (Number.isNaN(idx)) return null;
  return await getAccountIdByShareIndex(idx);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const accountId = await resolveAccountId(id);
  if (!accountId) return { title: 'Account package' };
  const pkg = await getAccountSharePackage(accountId);
  if (!pkg || !pkg.account.share_active) return { title: 'Account package' };
  const name = pkg.account.developer_name || pkg.account.email;
  return {
    title: `${name} — Developer Account Package`,
    description: `Registration info, credentials, and company documents for ${name}`,
  };
}

export default async function PublicAccountSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = await resolveAccountId(id);
  if (!accountId) return notFound();

  const pkg = await getAccountSharePackage(accountId);
  if (!pkg) return notFound();
  if (!pkg.account.share_active) redirect('/login');

  return (
    <>
      <header className="public-header">
        <div className="public-header-inner">
          <div className="public-brand">
            <div className="logo-icon">A</div>
            <span className="logo-text">AppManager<span className="gold">Pro</span></span>
          </div>
          <span className="public-header-tag">Developer Account Package</span>
        </div>
      </header>

      <AccountSharePackage account={pkg.account} company={pkg.company} />

      <footer className="public-footer">
        <p>Read-only package shared with the registration team. Copy fields, download documents, and proceed with the account setup.</p>
      </footer>
    </>
  );
}
