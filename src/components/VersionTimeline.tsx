'use client';

import { useMemo } from 'react';
import { FileDown, History, RefreshCw } from 'lucide-react';

type Screenshot = { id: number; file_path: string };
type Version = {
  id: number;
  version_number: string;
  changelog?: string;
  file_path?: string;
  icon_path?: string;
  promo_path?: string;
  release_date: string;
  screenshots?: Screenshot[];
};

function fmtDate(d?: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fileNameFromPath(p?: string) {
  if (!p) return 'file';
  return p.split('/').pop() || 'file';
}

export default function VersionTimeline({
  versions,
  variant = 'owner',
}: {
  versions: Version[];
  variant?: 'owner' | 'share';
}) {
  // Build "what changed in v2" hints by comparing each version to the previous (older) one.
  // Versions arrive newest-first (release_date DESC).
  const changeHints = useMemo(() => {
    const map = new Map<number, string[]>();
    for (let i = 0; i < versions.length; i++) {
      const cur = versions[i];
      const prev = versions[i + 1];
      const hints: string[] = [];
      if (cur.icon_path)  hints.push('New icon');
      if (cur.promo_path) hints.push('New promo graphic');
      if (cur.screenshots && cur.screenshots.length) {
        const prevCount = prev?.screenshots?.length ?? 0;
        if (cur.screenshots.length !== prevCount) {
          hints.push(`${cur.screenshots.length} screenshot${cur.screenshots.length === 1 ? '' : 's'}`);
        } else {
          hints.push('Updated screenshots');
        }
      }
      if (cur.file_path) hints.push('New AAB / IPA');
      if (!hints.length) hints.push('Changelog only');
      map.set(cur.id, hints);
    }
    return map;
  }, [versions]);

  return (
    <section className="glass-card manage-versions-card">
      <div className="info-section-head">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <History size={20} /> {variant === 'share' ? 'Release history' : 'Version history'}
        </h2>
        <span className="text-muted">{versions.length} release{versions.length === 1 ? '' : 's'}</span>
      </div>

      <div className="version-timeline-modern">
        {versions.map((v, idx) => {
          const isLatest = idx === 0;
          const hints = changeHints.get(v.id) || [];
          return (
            <article key={v.id} className={`version-card ${isLatest ? 'is-latest' : ''}`}>
              <div className="version-card-head">
                <div className="version-tag-modern">
                  <span>v{v.version_number}</span>
                  {isLatest && <small>LATEST</small>}
                </div>
                <div className="version-meta-modern">
                  <span>{fmtDate(v.release_date)}</span>
                </div>
              </div>

              <div className="version-hints">
                {hints.map(h => (
                  <span key={h} className="version-hint-pill"><RefreshCw size={10} />{h}</span>
                ))}
              </div>

              {v.changelog && (
                <pre className="version-changelog-modern">{v.changelog}</pre>
              )}

              <div className="version-assets-preview">
                {v.icon_path && (
                  <a href={v.icon_path} download={fileNameFromPath(v.icon_path)} className="version-asset-thumb" title="Download icon used in this version">
                    <img src={v.icon_path} alt="icon" />
                    <span>Icon</span>
                  </a>
                )}
                {v.promo_path && (
                  <a href={v.promo_path} download={fileNameFromPath(v.promo_path)} className="version-asset-thumb wide" title="Download promo for this version">
                    <img src={v.promo_path} alt="promo" />
                    <span>Promo</span>
                  </a>
                )}
                {v.screenshots && v.screenshots.length > 0 && (
                  <div className="version-shots-strip">
                    {v.screenshots.map(s => (
                      <a key={s.id} href={s.file_path} download={fileNameFromPath(s.file_path)} className="version-shot-thumb" title="Download screenshot">
                        <img src={s.file_path} alt="screenshot" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="version-card-actions">
                {v.file_path ? (
                  <a href={v.file_path} download={fileNameFromPath(v.file_path)} className="btn btn-primary small">
                    <FileDown size={14} /> Download AAB / IPA
                  </a>
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>No binary attached</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
