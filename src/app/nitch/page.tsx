import { getNitches } from '@/lib/actions';
import NitchView from '@/components/NitchView';

export default async function NitchPage() {
  let nitches: any[] = [];
  try {
    nitches = await getNitches();
  } catch (error) {
    console.error('Failed to load nitches:', error);
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Nitch</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Shared niches and keywords to work on.
          </p>
        </div>
      </header>

      <NitchView initialNitches={nitches} />
    </div>
  );
}
