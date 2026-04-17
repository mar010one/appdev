import { getAppById, getVersions, getListingVersions } from '@/lib/actions';
import { notFound } from 'next/navigation';
import AppInfoView from '@/components/AppInfoView';
import VersionTimeline from '@/components/VersionTimeline';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (Number.isNaN(appId)) return { title: 'App listing' };
  const app = await getAppById(appId);
  if (!app) return { title: 'App listing' };
  return {
    title: `${app.name} — Store Listing Package`,
    description: app.short_description || `Listing assets and copy for ${app.name}`,
  };
}

export default async function PublicSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (Number.isNaN(appId)) return notFound();

  const app = await getAppById(appId);
  if (!app) return notFound();

  const versions = (await getVersions(appId)) as any[];
  const listingVersions = await getListingVersions(appId);

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
