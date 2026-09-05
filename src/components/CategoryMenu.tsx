import { motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { useModalDismiss } from '../lib/useModalDismiss';
import { AR_GROUPS, EN_GROUPS, PACKS } from '../content';
import { packAllowedOn, packNeedsRemoteMedia, type QuestionPack, totalQuestions } from '../core/packs';
import { type Difficulty, difficultyUnlocked, difficultyUnlockLevel } from '../core/progression';
import { useAuth } from '../lib/auth';
import { useOnline } from '../lib/online';
import { isNative } from '../lib/platform';
import { accessFromProfile } from '../lib/progressionClient';
import { play } from '../services/audio';
import { remaining } from '../state/progress';

// Difficulty-tier siblings of a topic share a stem id (e.g. `sitcoms-easy`,
// `sitcoms-medium`, `sitcoms-hard` all collapse to `sitcoms`). The browser
// renders one card per stem and exposes a tier picker when 2+ tiers exist.
const TIER_SUFFIX = /-(kids|easy|medium|hard|extreme)$/;
// `expert` is a legitimate difficulty (some flag packs use it) — without it
// here, `TIER_ORDER.indexOf('expert')` returns -1 which sorts the expert pack
// *first*, so the stem card surfaces hard/expert instead of easy. Keep it in
// the order between hard and extreme so easiest-first stays easiest-first.
const TIER_ORDER = ['kids', 'easy', 'medium', 'hard', 'expert', 'extreme'] as const;

interface PackGroup {
  stem: string;
  primary: QuestionPack; // the card's headline pack (chosen tier, or only)
  tiers: QuestionPack[]; // tier siblings in difficulty order; length 1 = no picker
}

function bucketByStem(packs: QuestionPack[]): PackGroup[] {
  const stems = new Map<string, QuestionPack[]>();
  for (const p of packs) {
    const stem = p.id.replace(TIER_SUFFIX, '');
    if (!stems.has(stem)) stems.set(stem, []);
    stems.get(stem)!.push(p);
  }
  return Array.from(stems.entries()).map(([stem, tiers]) => {
    const sorted = tiers.slice().sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.difficulty as (typeof TIER_ORDER)[number]) -
        TIER_ORDER.indexOf(b.difficulty as (typeof TIER_ORDER)[number]),
    );
    return { stem, primary: sorted[0], tiers: sorted };
  });
}

// Strip " · Easy" / " · Medium" / "·" tier markers from the displayed name when
// the card represents multiple tiers. e.g. "World Flags · Easy" → "World Flags".
function stemName(name: string): string {
  return name.replace(/\s*·\s*(Kids|Easy|Medium|Hard|Expert|Extreme).*$/i, '').trim();
}

// Regional packs show a real (bundled) flag image — emoji flags render as letter
// placeholders on Windows. Mirrors the map in Home.tsx.
const PACK_FLAG: Record<string, string> = { bahrain: 'bh', 'saudi-arabia': 'sa', uae: 'ae' };

// Small legal captions per browse group (LAUNCH_PLAN D10 / D11).
const GROUP_NOTE: Record<string, string> = {
  Fandoms: 'Unofficial fan trivia, not affiliated',
  'Logos & Brands': 'All logos are trademarks of their owners',
};

// Scanning every question of every pack for remote media is ~40k string tests;
// memoised per pack so the offline filter costs nothing after the first pass.
const remoteMediaCache = new Map<string, boolean>();
function needsRemoteMedia(p: QuestionPack): boolean {
  let v = remoteMediaCache.get(p.id);
  if (v === undefined) {
    v = packNeedsRemoteMedia(p);
    remoteMediaCache.set(p.id, v);
  }
  return v;
}

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
  // The browser shows ONE language at a time. It opens on the language of the
  // currently-selected pack, so re-opening the menu mid-setup never yanks an
  // Arabic player back to the English list.
  const [lang, setLang] = useState<'en' | 'ar'>(() =>
    PACKS.find((p) => p.id === selectedPack)?.locale.startsWith('ar') ? 'ar' : 'en',
  );
  const groups = lang === 'ar' ? AR_GROUPS : EN_GROUPS;
  // Only autofocus the search on devices with a fine pointer (desktop/laptop). On
  // touch phones autofocus pops the on-screen keyboard the moment the menu opens,
  // covering the categories — so there we focus only when the user taps the field.
  const autoFocusSearch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;

  const q = query.trim().toLowerCase();
  // Store builds hide web-only packs (D3); offline hides packs whose clips/images
  // live on another origin (they could not play anyway).
  const online = useOnline();
  const native = isNative;
  const filtered = useMemo(
    () =>
      PACKS.filter((p) => {
        if (native && !packAllowedOn(p, 'native')) return false;
        if (!online && needsRemoteMedia(p)) return false;
        if (p.locale.startsWith('ar') !== (lang === 'ar')) return false;
        if (group !== 'All' && p.group !== group) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.group ?? '').toLowerCase().includes(q) ||
          p.difficulty.toLowerCase().includes(q)
        );
      }),
    [q, group, lang, online, native],
  );

  // Each user has a tier preference per stem — clicking a tier button on a
  // multi-tier card sticks for that browser session so the player can shuffle
  // through them without the choice resetting.
  const [tierPick, setTierPick] = useState<Record<string, string>>({});
  const { profile } = useAuth();
  const access = accessFromProfile(profile);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDismiss(dialogRef, onClose);

  // Group order: only groups that have matches. Within each group, packs are
  // collapsed by stem so e.g. Sitcoms Easy/Medium/Hard render as ONE card
  // with a tier picker, instead of three near-identical cards.
  const sections = useMemo(
    () =>
      groups.map((g) => ({
        group: g,
        packs: bucketByStem(filtered.filter((p) => p.group === g)),
      })).filter((s) => s.packs.length > 0),
    [filtered, groups],
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
        ref={dialogRef}
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
            <h2>{lang === 'ar' ? 'اختر فئة' : 'Choose a category'}</h2>
            <button className="icon-btn" aria-label="Close" data-testid="category-close" onClick={onClose}>
              ✕
            </button>
          </div>
          {/* Language switch: English categories ⇄ Arabic categories. Switching
              resets the group filter, since the two languages have no groups in
              common and a stale filter would show an empty list. */}
          <div className="cat-lang" role="tablist" aria-label="Category language">
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={lang === l}
                className={`cat-lang-btn ${lang === l ? 'active' : ''}`}
                data-testid={`cat-lang-${l}`}
                onClick={() => {
                  play('tap');
                  setLang(l);
                  setGroup('All');
                }}
              >
                {l === 'en' ? '🇬🇧 English' : '🇸🇦 عربي'}
              </button>
            ))}
          </div>
          <div className="cat-search">
            <span className="cat-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder={lang === 'ar' ? 'ابحث في الفئات…' : 'Search categories…'}
              aria-label="Search categories"
              dir="auto"
              data-testid="category-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus={autoFocusSearch}
            />
            {query && (
              <button className="cat-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
                ✕
              </button>
            )}
          </div>
          <div className="cat-chips" role="tablist" aria-label="Filter by type">
            {['All', ...groups].map((g) => (
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
                {g === 'All' && lang === 'ar' ? 'الكل' : g}
              </button>
            ))}
          </div>
        </header>

        <div className="cat-body" data-testid="category-body">
          {sections.length === 0 && (
            <div className="cat-empty" dir="auto">
              {lang === 'ar' ? `لا توجد فئات تطابق «${query}».` : `No categories match “${query}”.`}
            </div>
          )}
          {sections.map(({ group: g, packs }) => (
            <section key={g} className="cat-section">
              <h3 className="cat-section-head">
                {g} <span className="cat-section-count">{packs.length}</span>
              </h3>
              <div className="cat-grid">
                {packs.map(({ stem, primary, tiers }) => {
                  // Which tier shows on this multi-tier card. The user's EXPLICIT
                  // tier-button choice wins first (so switching e.g. Hard→Medium in
                  // an already-selected category actually takes effect); then the
                  // currently-selected pack if it's in this group; else the easiest.
                  const selectedInGroup = tiers.find((t) => t.id === selectedPack);
                  const pickId =
                    tierPick[stem] ?? selectedInGroup?.id ?? primary.id;
                  const pack = tiers.find((t) => t.id === pickId) ?? primary;
                  const total = totalQuestions(pack);
                  const left = remaining(pack.id, total);
                  const seenSome = left < total;
                  const active = pack.id === selectedPack;
                  const hasTiers = tiers.length > 1;
                  const locked = !difficultyUnlocked(pack.difficulty as Difficulty, access);
                  const unlockLvl = difficultyUnlockLevel(pack.difficulty as Difficulty);
                  return (
                    <div
                      key={stem}
                      className={`cat-card ${active ? 'active' : ''} ${hasTiers ? 'has-tiers' : ''} ${locked ? 'locked' : ''}`}
                      style={{ '--accent': pack.accent } as React.CSSProperties}
                      data-testid={`pack-${pack.id}`}
                    >
                      <button
                        className="cat-card-main"
                        disabled={locked}
                        aria-disabled={locked}
                        title={locked ? `Unlocks at Level ${unlockLvl}` : undefined}
                        onClick={() => {
                          if (locked) return;
                          play('pick');
                          onSelect(pack.id);
                          onClose();
                        }}
                        aria-label={locked ? `${pack.name} — locked until level ${unlockLvl}` : `Play ${pack.name}`}
                      >
                        {PACK_FLAG[pack.id] ? (
                          <img className="cat-card-flag" src={`/flags/${PACK_FLAG[pack.id]}.svg`} alt="" aria-hidden="true" draggable={false} />
                        ) : (
                          <div className="cat-card-emoji">{pack.emoji}</div>
                        )}
                        <div className="cat-card-body">
                          <div className="cat-card-name">
                            {hasTiers ? stemName(pack.name) : pack.name}
                          </div>
                          {pack.description && <div className="cat-card-desc">{pack.description}</div>}
                          {GROUP_NOTE[pack.group ?? ''] && (
                            <div className="cat-card-note" data-testid="cat-card-note">{GROUP_NOTE[pack.group ?? '']}</div>
                          )}
                          <div className="cat-card-meta">
                            <span className={`chip diff-${pack.difficulty}`}>{DIFF_LABEL[pack.difficulty] ?? pack.difficulty}</span>
                            <span className="chip ghost">{total} Qs</span>
                            {!locked && seenSome && <span className="chip ghost">↻ {left} left</span>}
                            {locked && <span className="chip locked-chip">🔒 Unlocks at Lv {unlockLvl}</span>}
                          </div>
                        </div>
                        {active && !locked && <div className="cat-card-check" aria-label="Selected">✓</div>}
                        {locked && <div className="cat-card-lock" aria-hidden="true">🔒</div>}
                      </button>
                      {hasTiers && (
                        <div className="cat-card-tiers" role="tablist" aria-label="Choose difficulty">
                          {tiers.map((t) => {
                            const tLocked = !difficultyUnlocked(t.difficulty as Difficulty, access);
                            return (
                              <button
                                key={t.id}
                                role="tab"
                                aria-selected={t.id === pack.id}
                                data-testid={`pack-tier-${t.id}`}
                                className={`cat-tier ${t.id === pack.id ? 'active' : ''} ${tLocked ? 'locked' : ''} diff-${t.difficulty}`}
                                title={tLocked ? `Unlocks at Level ${difficultyUnlockLevel(t.difficulty as Difficulty)}` : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  play('tap');
                                  // Still switch so the player sees the lock + requirement.
                                  setTierPick((s) => ({ ...s, [stem]: t.id }));
                                }}
                              >
                                {tLocked && '🔒 '}
                                {DIFF_LABEL[t.difficulty] ?? t.difficulty}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
