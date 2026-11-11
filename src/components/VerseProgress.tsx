import type { Verse } from '../types';
import { summarizeProgress } from '../learningStatus';

export function VerseProgress({ verses }: { verses: Verse[] }) {
  const { groups, total, percentage } = summarizeProgress(verses);
  let offset = 0;
  return (
    <section className="verse-progress" aria-label="Verse progress summary">
      <div className="verse-progress-counters">
        {groups.map(group => (
          <div key={group.label} className="verse-progress-counter" style={{ background: group.background }} title={group.detail}>
            <span className="verse-progress-label"><i style={{ background: group.color }} aria-hidden="true" />{group.label}</span>
            <strong>{group.count}</strong>
          </div>
        ))}
      </div>
      <div className="verse-progress-chart">
        <svg viewBox="0 0 100 100" className="verse-progress-ring" role="img" aria-label={`Verse distribution: ${groups.map(g => `${g.count} ${g.label.toLowerCase()}`).join(', ')}. ${total} total.`}>
          <circle cx="50" cy="50" r="39" fill="none" stroke="#EDE8F3" strokeWidth="9" />
          {groups.map(group => {
            const share = total ? group.count / total * 100 : 0;
            const start = offset;
            offset += share;
            return <circle key={group.label} cx="50" cy="50" r="39" fill="none" stroke={group.color} strokeWidth="9" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 50 50)" />;
          })}
          <text x="50" y="53" textAnchor="middle" fill="#2E2A4A" fontSize="23" fontWeight="800">{total}</text>
          <text x="50" y="67" textAnchor="middle" fill="#716B83" fontSize="10">verses</text>
        </svg>
        <div className="verse-progress-copy">
          <span className="verse-progress-eyebrow">A little practice, lasting growth</span>
          <p><strong>{percentage}%</strong> memorized</p>
          <span>{total ? `${groups[2].count} of ${total} verses memorized.` : 'Add a verse to start your journey.'}</span>
          {total > 0 && <span className="verse-progress-encouragement">{percentage === 100 ? 'Wonderful work! Keep reviewing together.' : 'Every verse is a step forward.'}</span>}
        </div>
      </div>
    </section>
  );
}
