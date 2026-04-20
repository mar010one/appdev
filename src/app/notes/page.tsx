import NotesView from '@/components/NotesView';

export const dynamic = 'force-dynamic';

export default function NotesPage() {
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Notes</h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            Personal notes — share with the team or specific people.
          </p>
        </div>
      </header>

      <NotesView />
    </div>
  );
}
