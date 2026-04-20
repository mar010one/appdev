import { getAccounts, getCompanies } from "@/lib/actions";
import AccountList from "@/components/AccountList";
import CreateAccountModal from "@/components/CreateAccountModal";

export default async function AccountsPage() {
  const [accountsResult, companiesResult] = await Promise.allSettled([
    getAccounts(),
    getCompanies(),
  ]);
  const accounts: any[] =
    accountsResult.status === 'fulfilled' ? accountsResult.value : [];
  const companies: any[] =
    companiesResult.status === 'fulfilled' ? companiesResult.value : [];
  if (accountsResult.status === 'rejected') {
    console.error('Failed to load accounts:', accountsResult.reason);
  }
  if (companiesResult.status === 'rejected') {
    console.error('Failed to load companies:', companiesResult.reason);
  }

  return (
    <div className="page-container">
      <header className="page-header accounts-page-header">
        <div className="accounts-page-header-text">
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Client Accounts</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>Manage your high-level developer credentials and verification documents.</p>
        </div>
        <CreateAccountModal companies={companies.filter((c: any) => !c.linked_account_id)} />
      </header>

      <div className="accounts-dashboard">
        <AccountList initialAccounts={accounts} />
      </div>
    </div>
  );
}
