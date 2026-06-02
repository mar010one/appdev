import { getAppById, getVersions, getAccounts } from '@/lib/actions';
import { notFound } from 'next/navigation';
import AppManageView from '@/components/AppManageView';

// Always server-render fresh so the edit modal hydrates the latest custom
// listings straight from the `app` prop (no extra client round-trip).
export const dynamic = 'force-dynamic';

export default async function AppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (Number.isNaN(appId)) return notFound();

  const [app, versions, accounts] = await Promise.all([
    getAppById(appId),
    getVersions(appId) as Promise<any[]>,
    getAccounts() as Promise<any[]>,
  ]);
  if (!app) return notFound();

  return <AppManageView app={app} versions={versions} accounts={accounts} />;
}
