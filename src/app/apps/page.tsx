import { getAccounts, getApps } from "@/lib/actions";
import CreateAppModal from "@/components/CreateAppModal";
import AppList from "@/components/AppList";

export default async function AppsPage() {
  const accounts = (await getAccounts()) as any[];
  const apps = (await getApps()) as any[];

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Applications</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>Efficiently track and manage all client mobile app deployments.</p>
        </div>
        <CreateAppModal accounts={accounts} />
      </header>

      <div className="apps-dashboard">
        <AppList initialApps={apps} />
      </div>

    </div>
  );
}
