import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useModalDismiss } from '../lib/useModalDismiss';
import { supabase, type CustomPack } from '../lib/supabase';
import { play } from '../services/audio';

/**
 * Pack Editor — lets a signed-in user author a custom question pack and save
 * it to Supabase (`custom_packs` table). Owner sees their own drafts; once a
 * moderator/admin flips `published`, the pack becomes selectable by everyone.
 *
 * The editor is letter-bucketed: 26 collapsible sections (A..Z), each with a
 * list of {question, answer} rows. The first letter of the typed answer must
 * match the bucket — same invariant as the bundled packs.
 *
 * Storage shape (`body` jsonb):
 *   { letters: { A: [{ q, a, id }, …], B: [...], … } }
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DIFFICULTIES = ['kids', 'easy', 'medium', 'hard', 'expert', 'extreme'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

interface DraftQ {
  id: string;
  q: string;
  a: string;
}
interface Draft {
  id: string | null; // null = unsaved
  name: string;
  description: string;
  emoji: string;
  difficulty: Difficulty;
  letters: Record<string, DraftQ[]>;
  published: boolean;
}

function emptyDraft(): Draft {
  const letters: Record<string, DraftQ[]> = {};
  for (const L of ALPHABET) letters[L] = [];
  return {
    id: null,
    name: '',
    description: '',
    emoji: '✨',
    difficulty: 'medium',
    letters,
    published: false,
  };
}

function newId(): string {
  return 'q_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function totalQs(d: Draft): number {
  return Object.values(d.letters).reduce((n, qs) => n + qs.length, 0);
}

function packToDraft(p: CustomPack): Draft {
  const letters: Record<string, DraftQ[]> = {};
  for (const L of ALPHABET) letters[L] = [];
  for (const [L, qs] of Object.entries(p.body?.letters ?? {})) {
    const key = L.toUpperCase();
    if (!letters[key]) letters[key] = [];
    for (const q of qs) letters[key].push({ id: q.id ?? newId(), q: q.q, a: q.a });
  }
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    emoji: p.emoji,
    difficulty: p.difficulty,
    letters,
    published: p.published,
  };
}

function draftToBody(d: Draft): CustomPack['body'] {
  const letters: Record<string, { q: string; a: string; id?: string }[]> = {};
  for (const L of ALPHABET) {
    if (d.letters[L].length > 0) {
      letters[L] = d.letters[L]
        .filter((row) => row.q.trim() && row.a.trim())
        .map((row) => ({ q: row.q.trim(), a: row.a.trim(), id: row.id }));
    }
  }
  return { letters };
}

export function PackEditor({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [mine, setMine] = useState<CustomPack[] | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [active, setActive] = useState<string | null>('A');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDismiss(dialogRef, onClose);

  // Load my drafts on mount (and after saves) so the user sees their pack list.
  const loadMine = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from('custom_packs')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setMine((data as CustomPack[]) ?? []);
  }, [user]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const total = useMemo(() => totalQs(draft), [draft]);
  const valid = draft.name.trim().length >= 2 && total > 0;

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const addQ = (letter: string) => {
    setDraft((d) => ({
      ...d,
      letters: { ...d.letters, [letter]: [...d.letters[letter], { id: newId(), q: '', a: '' }] },
    }));
  };
  const editQ = (letter: string, idx: number, patch: Partial<DraftQ>) => {
    setDraft((d) => ({
      ...d,
      letters: {
        ...d.letters,
        [letter]: d.letters[letter].map((row, i) => (i === idx ? { ...row, ...patch } : row)),
      },
    }));
  };
  const removeQ = (letter: string, idx: number) => {
    setDraft((d) => ({
      ...d,
      letters: { ...d.letters, [letter]: d.letters[letter].filter((_, i) => i !== idx) },
    }));
  };

  const save = async () => {
    if (!supabase || !user || !valid) return;
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const body = draftToBody(draft);
      if (draft.id) {
        const { error } = await supabase
          .from('custom_packs')
          .update({
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            emoji: draft.emoji,
            difficulty: draft.difficulty,
            body,
          })
          .eq('id', draft.id);
        if (error) throw error;
        setSavedNote('✓ Updated');
      } else {
        const { data, error } = await supabase
          .from('custom_packs')
          .insert({
            owner_id: user.id,
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            emoji: draft.emoji,
            difficulty: draft.difficulty,
            body,
          })
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (data?.id) setDraft((d) => ({ ...d, id: data.id }));
        setSavedNote('✓ Saved as draft');
      }
      await loadMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
      setTimeout(() => setSavedNote(null), 2400);
    }
  };

  const loadExisting = (p: CustomPack) => {
    play('tap');
    setDraft(packToDraft(p));
    setActive('A');
    setSavedNote(null);
    setError(null);
  };

  const newDraft = () => {
    play('tap');
    setDraft(emptyDraft());
    setActive('A');
    setSavedNote(null);
    setError(null);
  };

  if (!user || !profile) {
    return (
      <AnimatePresence>
        <motion.div className="modal-scrim" onClick={onClose}>
          <motion.div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>Sign in first to author a custom pack.</p>
            <button className="btn btn-primary" onClick={onClose}>Got it</button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="modal-scrim"
        data-testid="pack-editor-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          className="modal pack-editor"
          role="dialog"
          aria-label="Custom pack editor"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.96, y: 14, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
        >
          <header className="pack-editor-head">
            <h2>📦 Custom pack editor</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
          </header>

          <div className="pack-editor-grid">
            {/* Left rail: my packs */}
            <aside className="pack-editor-rail">
              <div className="pack-rail-head">
                <span>My packs</span>
                <button className="btn btn-ghost" data-testid="pack-new" onClick={newDraft}>+ New</button>
              </div>
              {mine === null && <p className="go-sub">Loading…</p>}
              {mine?.length === 0 && <p className="go-sub">No packs yet. Click + New to start.</p>}
              {mine && mine.length > 0 && (
                <ul className="pack-rail-list">
                  {mine.map((p) => (
                    <li
                      key={p.id}
                      className={draft.id === p.id ? 'active' : ''}
                      data-testid={`pack-row-${p.id}`}
                      onClick={() => loadExisting(p)}
                    >
                      <span>{p.emoji}</span>
                      <span className="pack-rail-name">{p.name}</span>
                      <span className="pack-rail-meta">
                        {p.published ? '✓ live' : 'draft'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Right pane: editor */}
            <section className="pack-editor-pane">
              <div className="pack-meta-row">
                <input
                  type="text"
                  className="pack-emoji-input"
                  data-testid="pack-emoji"
                  value={draft.emoji}
                  onChange={(e) => update('emoji', e.target.value.slice(0, 8) || '✨')}
                  aria-label="Emoji"
                  maxLength={8}
                />
                <input
                  type="text"
                  className="pack-name-input"
                  data-testid="pack-name"
                  placeholder="Pack name (e.g. Office Trivia)"
                  value={draft.name}
                  onChange={(e) => update('name', e.target.value)}
                  maxLength={80}
                />
                <select
                  data-testid="pack-difficulty"
                  value={draft.difficulty}
                  onChange={(e) => update('difficulty', e.target.value as Difficulty)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="pack-desc-input"
                data-testid="pack-description"
                placeholder="One-line description (optional)"
                value={draft.description}
                onChange={(e) => update('description', e.target.value.slice(0, 200))}
                rows={2}
              />
              <div className="pack-stats">
                <strong>{total}</strong> question{total === 1 ? '' : 's'} across the alphabet
              </div>

              <div className="pack-letter-bar" role="tablist" aria-label="Choose a letter">
                {ALPHABET.map((L) => {
                  const n = draft.letters[L].length;
                  return (
                    <button
                      key={L}
                      role="tab"
                      aria-selected={active === L}
                      data-testid={`pack-letter-${L}`}
                      className={`pack-letter-chip ${active === L ? 'active' : ''} ${n > 0 ? 'has' : ''}`}
                      onClick={() => setActive(L)}
                    >
                      {L}
                      {n > 0 && <small> {n}</small>}
                    </button>
                  );
                })}
              </div>

              {active && (
                <div className="pack-letter-body" data-testid="pack-letter-body">
                  <header>
                    <h3>Letter {active}</h3>
                    <button
                      className="btn btn-primary"
                      data-testid={`pack-add-${active}`}
                      onClick={() => addQ(active)}
                    >
                      + Add question
                    </button>
                  </header>
                  {draft.letters[active].length === 0 ? (
                    <p className="go-sub">
                      No questions yet for <strong>{active}</strong>. Each question's answer
                      should start with this letter.
                    </p>
                  ) : (
                    <ul className="pack-q-list">
                      {draft.letters[active].map((row, idx) => {
                        const aFirst = row.a.trim()[0]?.toUpperCase();
                        const letterOK = !aFirst || aFirst === active;
                        return (
                          <li key={row.id}>
                            <textarea
                              placeholder="Question…"
                              data-testid={`pack-q-${active}-${idx}`}
                              value={row.q}
                              onChange={(e) => editQ(active, idx, { q: e.target.value })}
                              rows={2}
                            />
                            <input
                              type="text"
                              placeholder={`Answer (starts with ${active})`}
                              data-testid={`pack-a-${active}-${idx}`}
                              value={row.a}
                              onChange={(e) => editQ(active, idx, { a: e.target.value })}
                              aria-invalid={!letterOK}
                              style={!letterOK ? { borderColor: '#ef4444' } : undefined}
                            />
                            <button
                              className="btn btn-ghost btn-danger"
                              aria-label="Remove question"
                              data-testid={`pack-remove-${active}-${idx}`}
                              onClick={() => removeQ(active, idx)}
                            >
                              ×
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              <footer className="pack-editor-foot">
                {error && <span className="admin-error" data-testid="pack-error">⚠ {error}</span>}
                {savedNote && <span className="pack-saved" data-testid="pack-saved">{savedNote}</span>}
                <button
                  className="btn btn-primary btn-lg"
                  data-testid="pack-save"
                  disabled={!valid || saving}
                  onClick={save}
                >
                  {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Save draft'}
                </button>
              </footer>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
