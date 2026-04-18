import { getTutorials } from '@/lib/actions';
import TutorialsView from '@/components/TutorialsView';

export default async function TutorialsPage() {
  let tutorials: any[] = [];
  try {
    tutorials = (await getTutorials()) as any[];
  } catch (error) {
    console.error('Failed to load tutorials:', error);
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Tutorials</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Shared guides and resources — upload files or link to external content.
          </p>
        </div>
      </header>

      <TutorialsView initialTutorials={tutorials} />
    </div>
  );
}
