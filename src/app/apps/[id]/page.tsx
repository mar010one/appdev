import { getAppById, getVersions } from '@/lib/actions';
import { notFound } from 'next/navigation';
import AppManageView from '@/components/AppManageView';

export default async function AppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (Number.isNaN(appId)) return notFound();

  const app = await getAppById(appId);
  if (!app) return notFound();

  const versions = (await getVersions(appId)) as any[];

  return <AppManageView app={app} versions={versions} />;
}
