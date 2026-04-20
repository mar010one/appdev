import { getAccountSharePackage } from '@/lib/actions';
import { notFound } from 'next/navigation';
import AccountSharePackage from '@/components/AccountSharePackage';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (Number.isNaN(accountId)) return { title: 'Account package' };
  const pkg = await getAccountSharePackage(accountId);
  if (!pkg) return { title: 'Account package' };
  const name = pkg.account.developer_name || pkg.account.email;
  return {
    title: `${name} — Developer Account Package`,
    description: `Registration info, credentials, and company documents for ${name}`,
  };
}

export default async function PublicAccountSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (Number.isNaN(accountId)) return notFound();

  const pkg = await getAccountSharePackage(accountId);
  if (!pkg) return notFound();

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
