import { getCompanies, getAccounts } from '@/lib/actions';
import CompaniesView from '@/components/CompaniesView';
import CreateCompanyModal from '@/components/CreateCompanyModal';

export default async function CompaniesPage() {
  let companies: any[] = [];
  let accounts: any[] = [];
  try {
    [companies, accounts] = await Promise.all([getCompanies(), getAccounts()]);
  } catch (error) {
    console.error('Failed to load companies:', error);
  }

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '40px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Companies</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Manage company profiles, ID documents, and linked Google Play accounts.
          </p>
        </div>
        <CreateCompanyModal accounts={accounts} />
      </header>

      <CompaniesView initialCompanies={companies} accounts={accounts} />
    </div>
  );
}
