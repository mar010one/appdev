import { getMissions } from '@/lib/actions';
import MissionsView from '@/components/MissionsView';

export default async function MissionsPage() {
  // today in YYYY-MM-DD (server-side, UTC — matches what the client date input produces)
  const today = new Date().toISOString().slice(0, 10);

  let missions: Awaited<ReturnType<typeof getMissions>> = [];
  try {
    missions = await getMissions();
  } catch (error) {
    console.error('Failed to load missions:', error);
  }

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{
          marginBottom: '40px',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Daily Missions</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem', marginTop: '6px' }}>
          Assign and track team missions day by day.
        </p>
      </header>

      <MissionsView initialMissions={missions} today={today} />
    </div>
  );
}
