import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, type AdminUserRow, type CustomPack, type UserRole } from '../lib/supabase';
import { play } from '../services/audio';

/**
 * Admin dashboard — gated on `useAuth().isAdmin`. Two tabs:
 *
 *   👥 Users — list every signed-up account, promote/demote (player ↔ moderator
 *      ↔ admin), and ban/unban. All writes go through SECURITY DEFINER RPCs in
 *      0002_roles_admin.sql so the policies are enforced server-side regardless
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

  if (!isAdmin) return null;

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
    if (!supabase) return;
    setError(null);
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      setError(error.message);
      setRows([]);
      return;
    }
    setRows((data as AdminUserRow[]) ?? []);
  }, []);

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
    if (!supabase) return;
    if (row.id === profile?.id && role !== 'admin') {
      alert('You cannot demote yourself — ask another admin.');
      return;
    }
    setBusy(row.id);
    const { error } = await supabase.rpc('set_user_role', { target_id: row.id, new_role: role });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, role } : r)) ?? null);
  };

  const toggleBan = async (row: AdminUserRow) => {
    if (!supabase) return;
    if (row.id === profile?.id) {
      alert('You cannot ban yourself.');
      return;
    }
    const willBan = !row.banned_at;
    if (willBan && !confirm(`Ban @${row.username}? They lose access to all online features.`)) return;
    setBusy(row.id);
    const { error } = await supabase.rpc('set_user_banned', { target_id: row.id, banned: willBan });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((rs) =>
      rs?.map((r) =>
        r.id === row.id ? { ...r, banned_at: willBan ? new Date().toISOString() : null } : r,
      ) ?? null,
    );
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
              <th>Status</th>
              <th>Joined</th>
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
                  {r.banned_at ? (
                    <span className="admin-chip danger">banned</span>
                  ) : (
                    <span className="admin-chip ok">active</span>
                  )}
                </td>
                <td className="admin-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`btn btn-ghost ${r.banned_at ? '' : 'btn-danger'}`}
                    data-testid={`admin-ban-${r.username}`}
                    disabled={busy === r.id || r.id === profile?.id}
                    onClick={() => toggleBan(r)}
                  >
                    {r.banned_at ? 'Unban' : 'Ban'}
                  </button>
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
    if (!supabase) return;
    setError(null);
    const { data, error } = await supabase
      .from('custom_packs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      setRows([]);
      return;
    }
    setRows((data as CustomPack[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePublish = async (pack: CustomPack) => {
    if (!supabase) return;
    setBusy(pack.id);
    const next = !pack.published;
    const { error } = await supabase
      .from('custom_packs')
      .update({ published: next, published_at: next ? new Date().toISOString() : null })
      .eq('id', pack.id);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((rs) =>
      rs?.map((r) =>
        r.id === pack.id
          ? { ...r, published: next, published_at: next ? new Date().toISOString() : null }
          : r,
      ) ?? null,
    );
  };

  const remove = async (pack: CustomPack) => {
    if (!supabase) return;
    if (!confirm(`Delete pack "${pack.name}"? This cannot be undone.`)) return;
    setBusy(pack.id);
    const { error } = await supabase.from('custom_packs').delete().eq('id', pack.id);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((rs) => rs?.filter((r) => r.id !== pack.id) ?? null);
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
