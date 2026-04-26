import { getAppById, getAppIdByShareIndex, getVersions, getListingVersions } from '@/lib/actions';
import { notFound, redirect } from 'next/navigation';
import AppInfoView from '@/components/AppInfoView';
import VersionTimeline from '@/components/VersionTimeline';
import type { Metadata } from 'next';

// `[id]` here is the 1-based share index (`/a3` → 3rd app), not the DB row id.
async function resolveAppId(idParam: string): Promise<number | null> {
  const idx = parseInt(idParam, 10);
  if (Number.isNaN(idx)) return null;
  return await getAppIdByShareIndex(idx);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const appId = await resolveAppId(id);
  if (!appId) return { title: 'App listing' };
  const app = await getAppById(appId);
  if (!app || !app.share_active) return { title: 'App listing' };
  return {
    title: `${app.name} — Store Listing Package`,
    description: app.short_description || `Listing assets and copy for ${app.name}`,
  };
}

export default async function PublicSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = await resolveAppId(id);
  if (!appId) return notFound();

  const [app, versions, listingVersions] = await Promise.all([
    getAppById(appId),
    getVersions(appId) as Promise<any[]>,
    getListingVersions(appId),
  ]);
  if (!app) return notFound();
  if (!app.share_active) redirect('/login');

  return (
    <>
      <header className="public-header">
        <div className="public-header-inner">
          <div className="public-brand">
            <div className="logo-icon">A</div>
            <span className="logo-text">AppManager<span className="gold">Pro</span></span>
          </div>
          <span className="public-header-tag">Store Listing Package</span>
        </div>
      </header>

      <AppInfoView app={app} listingVersions={listingVersions} variant="share" />

      {versions.length > 0 && (
        <div className="container" style={{ paddingTop: 0 }}>
          <VersionTimeline versions={versions} variant="share" />
        </div>
      )}

      <footer className="public-footer">
        <p>This is a read-only listing package shared with the upload team. Copy text fields, download assets, and use the latest AAB to publish on the store.</p>
      </footer>
    </>
  );
}
