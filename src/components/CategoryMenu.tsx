import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PACK_GROUPS, PACKS } from '../content';
import { totalQuestions } from '../core/packs';
import { play } from '../services/audio';
import { remaining } from '../state/progress';

// Regional packs show a real (bundled) flag image — emoji flags render as letter
// placeholders on Windows. Mirrors the map in Home.tsx.
const PACK_FLAG: Record<string, string> = { bahrain: 'bh', 'saudi-arabia': 'sa', uae: 'ae' };

const DIFF_LABEL: Record<string, string> = {
  kids: 'Kids', easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', extreme: 'Extreme',
};

/**
 * Full-screen, searchable category browser. Packs are organised into groups
 * (Trivia, Movies & TV, Music, Flags, …) and filterable by a search box + group
 * chips. Selecting a pack sets it and closes the menu.
 */
export function CategoryMenu({
  selectedPack,
  onSelect,
  onClose,
}: {
  selectedPack: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('All');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      PACKS.filter((p) => {
        if (group !== 'All' && p.group !== group) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.group ?? '').toLowerCase().includes(q) ||
          p.difficulty.toLowerCase().includes(q)
        );
      }),
    [q, group],
  );

  // Group order, only groups that have matches.
  const sections = useMemo(
    () =>
      PACK_GROUPS.map((g) => ({ group: g, packs: filtered.filter((p) => p.group === g) })).filter(
        (s) => s.packs.length > 0,
      ),
    [filtered],
  );

  return (
    <motion.div
      className="cat-scrim"
      data-testid="category-menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cat-panel"
        role="dialog"
        aria-label="Choose a category"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.97, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <header className="cat-head">
          <div className="cat-head-top">
            <h2>Choose a category</h2>
            <button className="icon-btn" aria-label="Close" data-testid="category-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="cat-search">
            <span className="cat-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Search categories…"
              aria-label="Search categories"
              data-testid="category-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="cat-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
                ✕
              </button>
            )}
          </div>
          <div className="cat-chips" role="tablist" aria-label="Filter by type">
            {['All', ...PACK_GROUPS].map((g) => (
              <button
                key={g}
                role="tab"
                aria-selected={group === g}
                className={`cat-chip ${group === g ? 'active' : ''}`}
                data-testid={`cat-chip-${g.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => {
                  play('tap');
                  setGroup(g);
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </header>

        <div className="cat-body" data-testid="category-body">
          {sections.length === 0 && (
            <div className="cat-empty">No categories match “{query}”.</div>
          )}
          {sections.map(({ group: g, packs }) => (
            <section key={g} className="cat-section">
              <h3 className="cat-section-head">
                {g} <span className="cat-section-count">{packs.length}</span>
              </h3>
              <div className="cat-grid">
                {packs.map((pack) => {
                  const total = totalQuestions(pack);
                  const left = remaining(pack.id, total);
                  const seenSome = left < total;
                  const active = pack.id === selectedPack;
                  return (
                    <button
                      key={pack.id}
                      className={`cat-card ${active ? 'active' : ''}`}
                      data-testid={`pack-${pack.id}`}
                      style={{ '--accent': pack.accent } as React.CSSProperties}
                      onClick={() => {
                        play('pick');
                        onSelect(pack.id);
                        onClose();
                      }}
                    >
                      {PACK_FLAG[pack.id] ? (
                        <img className="cat-card-flag" src={`/flags/${PACK_FLAG[pack.id]}.svg`} alt="" aria-hidden="true" draggable={false} />
                      ) : (
                        <div className="cat-card-emoji">{pack.emoji}</div>
                      )}
                      <div className="cat-card-body">
                        <div className="cat-card-name">{pack.name}</div>
                        {pack.description && <div className="cat-card-desc">{pack.description}</div>}
                        <div className="cat-card-meta">
                          <span className={`chip diff-${pack.difficulty}`}>{DIFF_LABEL[pack.difficulty] ?? pack.difficulty}</span>
                          <span className="chip ghost">{total} Qs</span>
                          {seenSome && <span className="chip ghost">↻ {left} left</span>}
                        </div>
                      </div>
                      {active && <div className="cat-card-check" aria-label="Selected">✓</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
