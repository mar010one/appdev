import { getAccounts, getCompanies } from "@/lib/actions";
import AccountList from "@/components/AccountList";
import CreateAccountModal from "@/components/CreateAccountModal";
import { Users } from "lucide-react";

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
      <header style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '20px', marginBottom: '32px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(234,179,8,0.18), rgba(234,179,8,0.06))',
            border: '1px solid rgba(234,179,8,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 6px rgba(234,179,8,0.06)',
            color: 'var(--accent)',
          }}>
            <Users size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Client Accounts
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Developer credentials and verification documents.
            </p>
          </div>
        </div>
        <CreateAccountModal companies={companies.filter((c: any) => !c.linked_account_id)} />
      </header>

      <AccountList initialAccounts={accounts} />
    </div>
  );
}
