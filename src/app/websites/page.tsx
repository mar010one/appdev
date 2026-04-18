import { getWebsites } from '@/lib/actions';
import WebsitesView from '@/components/WebsitesView';

export default async function WebsitesPage() {
  let websites: any[] = [];
  try {
    websites = (await getWebsites()) as any[];
  } catch (error) {
    console.error('Failed to load websites:', error);
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Websites</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Shared websites and links for the team.
          </p>
        </div>
      </header>

      <WebsitesView initialWebsites={websites} />
    </div>
  );
}
