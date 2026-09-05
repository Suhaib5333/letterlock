import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { hasDevSeam } from '../lib/devSeams';
import { useModalDismiss } from '../lib/useModalDismiss';
import { api, isApiConfigured, type AdminUserRow, type CustomPack, type UserRole } from '../lib/api';
import { play } from '../services/audio';
import { RankBadge } from './RankBadge';

/**
 * Admin dashboard — gated on `useAuth().isAdmin`. Two tabs:
 *
 *   👥 Users — list every signed-up account, promote/demote (player ↔ moderator
 *      ↔ admin), and ban/unban. All writes go through the API's /admin/* routes
 *      (RolesGuard 'admin') so the policies are enforced server-side regardless
 *      of what this UI sends.
 *
 *   📦 Packs — review user-authored custom packs (drafts + published) and flip
 *      `published`. Owners can edit their own packs in the Pack editor.
 *
 * Renders nothing for non-admins (the route check in Home already hides the
 * button, but this is defence-in-depth in case it's ever called directly).
 */
export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { isAdmin, profile } = useAuth();
  const [tab, setTab] = useState<'users' | 'packs'>('users');
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDismiss(dialogRef, onClose);

  // Dev/QA seam (see Home): allow rendering the dashboard chrome without an admin
  // session so its responsive layout can be inspected. Gated to local dev/test
  // hosts (devSeams.ts). Data calls no-op/error regardless (the API enforces the
  // admin role server-side), so this is purely a layout-inspection affordance.
  const devScreens = hasDevSeam('__devscreens');
  if (!isAdmin && !devScreens) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-scrim"
        data-testid="admin-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          className="modal admin-modal"
          role="dialog"
          aria-label="Admin dashboard"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, y: 14, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
        >
          <header className="admin-head">
            <div>
              <h2>🛠 Admin dashboard</h2>
              <span className="admin-me">@{profile?.username} — admin</span>
            </div>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
          </header>

          <div className="admin-tabs" role="tablist">
            <button
              role="tab"
              data-testid="admin-tab-users"
              aria-selected={tab === 'users'}
              className={tab === 'users' ? 'active' : ''}
              onClick={() => {
                play('tap');
                setTab('users');
              }}
            >
              👥 Users
            </button>
            <button
              role="tab"
              data-testid="admin-tab-packs"
              aria-selected={tab === 'packs'}
              className={tab === 'packs' ? 'active' : ''}
              onClick={() => {
                play('tap');
                setTab('packs');
              }}
            >
              📦 Custom packs
            </button>
          </div>

          <div className="admin-body">
            {tab === 'users' && <UsersTab />}
            {tab === 'packs' && <PacksTab />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function UsersTab() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // user id currently being mutated

  const load = useCallback(async () => {
    if (!isApiConfigured()) return;
    setError(null);
    try {
      setRows(await api<AdminUserRow[]>('/admin/users', { auth: 'user' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    }
  }, []);

  /** Run one admin write; surfaces the API error and reports success. */
  const mutate = async (id: string, fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(id);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.username.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.display_name ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const setRole = async (row: AdminUserRow, role: UserRole) => {
    if (row.id === profile?.id && role !== 'admin') {
      alert('You cannot demote yourself, ask another admin.');
      return;
    }
    if (!(await mutate(row.id, () => api(`/admin/users/${row.id}/role`, { method: 'PATCH', body: { role }, auth: 'user' })))) return;
    setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, role } : r)) ?? null);
  };

  const toggleBan = async (row: AdminUserRow) => {
    if (row.id === profile?.id) {
      alert('You cannot ban yourself.');
      return;
    }
    const willBan = !row.banned_at;
    if (willBan && !confirm(`Ban @${row.username}? They lose access to all online features.`)) return;
    if (!(await mutate(row.id, () => api(`/admin/users/${row.id}/banned`, { method: 'PATCH', body: { banned: willBan }, auth: 'user' })))) return;
    setRows((rs) =>
      rs?.map((r) =>
        r.id === row.id ? { ...r, banned_at: willBan ? new Date().toISOString() : null } : r,
      ) ?? null,
    );
  };

  const toggleFullAccess = async (row: AdminUserRow) => {
    const value = !row.full_access;
    if (!(await mutate(row.id, () => api(`/admin/users/${row.id}/full-access`, { method: 'PATCH', body: { value }, auth: 'user' })))) return;
    setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, full_access: value } : r)) ?? null);
  };

  const grantXp = async (row: AdminUserRow) => {
    const raw = prompt(`Grant XP to @${row.username} (negative to remove):`, '100');
    if (raw === null) return;
    const amount = parseInt(raw, 10);
    if (!Number.isFinite(amount)) return;
    if (!(await mutate(row.id, () => api(`/admin/users/${row.id}/grant-xp`, { method: 'POST', body: { amount }, auth: 'user' })))) return;
    await load();
  };

  const resetProgression = async (row: AdminUserRow) => {
    if (!confirm(`Reset @${row.username} to Level 1, Prestige 0, 0 XP?`)) return;
    if (!(await mutate(row.id, () => api(`/admin/users/${row.id}/reset-progression`, { method: 'POST', auth: 'user' })))) return;
    await load();
  };

  return (
    <div className="admin-users" data-testid="admin-users">
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search username / email / display name…"
          data-testid="admin-user-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={load}>↻ Refresh</button>
      </div>

      {error && <p className="admin-error" data-testid="admin-error">⚠ {error}</p>}
      {filtered === null && <p className="go-sub">Loading…</p>}
      {filtered?.length === 0 && <p className="go-sub">No users match that search.</p>}

      {filtered && filtered.length > 0 && (
        <table className="admin-table" data-testid="admin-user-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Rank</th>
              <th>Full access</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} data-testid={`admin-row-${r.username}`} className={r.banned_at ? 'is-banned' : ''}>
                <td>
                  <strong>@{r.username}</strong>
                  {r.display_name && <span className="admin-muted"> · {r.display_name}</span>}
                  {r.id === profile?.id && <span className="admin-self"> (you)</span>}
                </td>
                <td className="admin-muted">{r.email ?? '—'}</td>
                <td>
                  <select
                    value={r.role}
                    data-testid={`admin-role-${r.username}`}
                    disabled={busy === r.id || r.id === profile?.id}
                    onChange={(e) => setRole(r, e.target.value as UserRole)}
                  >
                    <option value="player">player</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <RankBadge level={r.level ?? 1} prestige={r.prestige ?? 0} />
                  <div className="admin-muted" style={{ fontSize: '0.7rem' }}>{(r.total_xp ?? 0).toLocaleString()} XP</div>
                </td>
                <td>
                  <button
                    className={`switch ${r.full_access ? 'on' : ''}`}
                    role="switch"
                    aria-checked={r.full_access}
                    data-testid={`admin-fullaccess-${r.username}`}
                    disabled={busy === r.id}
                    onClick={() => toggleFullAccess(r)}
                    title="Unlock all boards/categories/modes for this user"
                  >
                    <span className="knob" />
                  </button>
                </td>
                <td>
                  {r.banned_at ? (
                    <span className="admin-chip danger">banned</span>
                  ) : (
                    <span className="admin-chip ok">active</span>
                  )}
                </td>
                <td>
                  <div className="admin-actions">
                    <button
                      className={`btn btn-ghost ${r.banned_at ? '' : 'btn-danger'}`}
                      data-testid={`admin-ban-${r.username}`}
                      disabled={busy === r.id || r.id === profile?.id}
                      onClick={() => toggleBan(r)}
                    >
                      {r.banned_at ? 'Unban' : 'Ban'}
                    </button>
                    <button className="btn btn-ghost sm" data-testid={`admin-grantxp-${r.username}`} disabled={busy === r.id} onClick={() => grantXp(r)}>+XP</button>
                    <button className="btn btn-ghost sm" disabled={busy === r.id} onClick={() => resetProgression(r)}>Reset</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PacksTab() {
  const [rows, setRows] = useState<CustomPack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isApiConfigured()) return;
    setError(null);
    try {
      setRows(await api<CustomPack[]>('/packs/custom?scope=all', { auth: 'user' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePublish = async (pack: CustomPack) => {
    setBusy(pack.id);
    const next = !pack.published;
    try {
      const updated = await api<CustomPack>(`/packs/custom/${pack.id}`, { method: 'PATCH', body: { published: next }, auth: 'user' });
      setRows((rs) => rs?.map((r) => (r.id === pack.id ? updated : r)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (pack: CustomPack) => {
    if (!confirm(`Delete pack "${pack.name}"? This cannot be undone.`)) return;
    setBusy(pack.id);
    try {
      await api(`/packs/custom/${pack.id}`, { method: 'DELETE', auth: 'user' });
      setRows((rs) => rs?.filter((r) => r.id !== pack.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-packs" data-testid="admin-packs">
      <div className="admin-toolbar">
        <span className="admin-muted">
          {rows ? `${rows.length} pack${rows.length === 1 ? '' : 's'}` : 'Loading…'}
        </span>
        <button className="btn btn-ghost" onClick={load}>↻ Refresh</button>
      </div>

      {error && <p className="admin-error">⚠ {error}</p>}
      {rows?.length === 0 && (
        <p className="go-sub">No custom packs yet — anyone signed in can create one.</p>
      )}

      {rows && rows.length > 0 && (
        <ul className="admin-pack-list">
          {rows.map((p) => (
            <li key={p.id} className={p.published ? 'is-published' : ''} data-testid={`admin-pack-${p.id}`}>
              <span className="admin-pack-emoji">{p.emoji}</span>
              <div className="admin-pack-text">
                <strong>{p.name}</strong>
                {p.description && <p>{p.description}</p>}
                <small className="admin-muted">
                  {p.difficulty} · {countQuestions(p)} questions · created {new Date(p.created_at).toLocaleDateString()}
                </small>
              </div>
              <div className="admin-pack-actions">
                <button
                  className={p.published ? 'btn btn-ghost' : 'btn btn-primary'}
                  disabled={busy === p.id}
                  data-testid={`admin-publish-${p.id}`}
                  onClick={() => togglePublish(p)}
                >
                  {p.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  className="btn btn-ghost btn-danger"
                  disabled={busy === p.id}
                  data-testid={`admin-delete-${p.id}`}
                  onClick={() => remove(p)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function countQuestions(pack: CustomPack): number {
  return Object.values(pack.body?.letters ?? {}).reduce((n, qs) => n + (qs?.length ?? 0), 0);
}
