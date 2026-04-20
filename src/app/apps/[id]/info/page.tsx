import { getAppById, getListingVersions } from '@/lib/actions';
import { notFound } from 'next/navigation';
import AppInfoView from '@/components/AppInfoView';

export default async function AppInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (Number.isNaN(appId)) return notFound();

  const [app, listingVersions] = await Promise.all([
    getAppById(appId),
    getListingVersions(appId),
  ]);
  if (!app) return notFound();

  return <AppInfoView app={app} listingVersions={listingVersions} />;
}
