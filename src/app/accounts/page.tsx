import { getAccounts } from "@/lib/actions";
import AccountList from "@/components/AccountList";
import CreateAccountModal from "@/components/CreateAccountModal";

export default async function AccountsPage() {
  let accounts = [];
  try {
    accounts = (await getAccounts()) as any[];
  } catch (error) {
    console.error("Failed to load accounts:", error);
  }

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Client Accounts</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>Manage your high-level developer credentials and verification documents.</p>
        </div>
        <CreateAccountModal />
      </header>

      <div className="accounts-dashboard">
        <AccountList initialAccounts={accounts} />
      </div>
    </div>
  );
}
