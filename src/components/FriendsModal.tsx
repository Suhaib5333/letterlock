import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  blockUser,
  findUser,
  listFriends,
  notifyUser,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  subscribeOnline,
  type FoundUser,
  type FriendRow,
} from '../lib/friends';
import { useModalDismiss } from '../lib/useModalDismiss';
import { play } from '../services/audio';
import { RankBadge } from './RankBadge';

/**
 * Friends modal — tabs: Friends (online-first, invite/remove), Requests
 * (accept/decline), Add (search username → request). Online status overlays the
 * presence set. If the host has a live room (window.__lobby), each online friend
 * gets an "Invite" that pushes the room code to their notification inbox.
 */
export function FriendsModal({ myName, onClose }: { myName: string; onClose: () => void }) {
  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [rows, setRows] = useState<FriendRow[] | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FoundUser | null | 'none'>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDismiss(dialogRef, onClose);

  const refresh = useCallback(async () => {
    setRows(await listFriends());
  }, []);
  useEffect(() => {
    void refresh();
    return subscribeOnline(setOnline);
  }, [refresh]);

  const friends = (rows ?? []).filter((r) => r.status === 'accepted');
  const incoming = (rows ?? []).filter((r) => r.status === 'pending' && r.incoming);
  const outgoing = (rows ?? []).filter((r) => r.status === 'pending' && !r.incoming);
  // online friends first
  const sortedFriends = [...friends].sort(
    (a, b) => Number(online.has(b.other_id)) - Number(online.has(a.other_id)),
  );
  const roomCode = typeof window !== 'undefined' ? window.__lobby?.code : undefined;

  const doSearch = async () => {
    play('tap');
    setBusy(true);
    setNote(null);
    const u = await findUser(query);
    setBusy(false);
    setFound(u ?? 'none');
  };
  const add = async (id: string) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await sendFriendRequest(id);
      // tell them (best-effort) so an online friend gets a popup
      void notifyUser(id, { type: 'friend_request', fromName: myName });
      setNote(res === 'accepted' ? "You're now friends!" : 'Request sent.');
      setFound(null);
      setQuery('');
      await refresh();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not send request.');
    }
    setBusy(false);
  };
  const respond = async (id: string, accept: boolean) => {
    setBusy(true);
    await respondFriendRequest(id, accept).catch(() => {});
    if (accept) void notifyUser(id, { type: 'friend_accepted', fromName: myName });
    await refresh();
    setBusy(false);
  };
  const invite = async (id: string) => {
    if (!roomCode) return;
    play('pick');
    await notifyUser(id, { type: 'room_invite', fromName: myName, code: roomCode });
    setNote('Invite sent!');
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-scrim" data-testid="friends-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div
          ref={dialogRef}
          className="modal friends-modal"
          role="dialog"
          aria-label="Friends"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
        >
          <div className="friends-head">
            <h2>👥 Friends</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
          </div>

          <div className="friends-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'friends'} className={tab === 'friends' ? 'active' : ''} data-testid="friends-tab-friends" onClick={() => setTab('friends')}>
              Friends {friends.length > 0 && <span className="friends-count">{friends.length}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'active' : ''} data-testid="friends-tab-requests" onClick={() => setTab('requests')}>
              Requests {incoming.length > 0 && <span className="friends-count alert">{incoming.length}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'add'} className={tab === 'add' ? 'active' : ''} data-testid="friends-tab-add" onClick={() => setTab('add')}>
              ＋ Add
            </button>
          </div>

          <div className="friends-body" data-testid="friends-body">
            {note && <p className="friends-note" data-testid="friends-note">{note}</p>}

            {tab === 'friends' && (
              rows === null ? (
                <p className="go-sub">Loading…</p>
              ) : sortedFriends.length === 0 ? (
                <p className="go-sub">No friends yet — add someone from the ＋ Add tab!</p>
              ) : (
                <ul className="friends-list">
                  {sortedFriends.map((f) => (
                    <li key={f.other_id} data-testid={`friend-${f.other_id}`}>
                      <span className={`friend-dot ${online.has(f.other_id) ? 'on' : ''}`} aria-hidden="true" />
                      <span className="friend-name">@{f.username}</span>
                      <RankBadge level={f.level} prestige={f.prestige} />
                      <span className="friend-actions">
                        {roomCode && online.has(f.other_id) && (
                          <button className="btn btn-primary sm" data-testid={`invite-${f.other_id}`} onClick={() => invite(f.other_id)}>Invite</button>
                        )}
                        <button className="btn btn-ghost sm" title="Remove" onClick={async () => { await removeFriend(f.other_id); await refresh(); }}>Remove</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}

            {tab === 'requests' && (
              <>
                {incoming.length === 0 && outgoing.length === 0 && <p className="go-sub">No pending requests.</p>}
                {incoming.length > 0 && <h3 className="friends-sub">Incoming</h3>}
                <ul className="friends-list">
                  {incoming.map((f) => (
                    <li key={f.other_id} data-testid={`request-${f.other_id}`}>
                      <span className="friend-name">@{f.username}</span>
                      <RankBadge level={f.level} prestige={f.prestige} />
                      <span className="friend-actions">
                        <button className="btn btn-primary sm" disabled={busy} data-testid={`accept-${f.other_id}`} onClick={() => respond(f.other_id, true)}>Accept</button>
                        <button className="btn btn-ghost sm" disabled={busy} onClick={() => respond(f.other_id, false)}>Decline</button>
                      </span>
                    </li>
                  ))}
                </ul>
                {outgoing.length > 0 && <h3 className="friends-sub">Sent</h3>}
                <ul className="friends-list">
                  {outgoing.map((f) => (
                    <li key={f.other_id}>
                      <span className="friend-name">@{f.username}</span>
                      <span className="friend-pending">pending…</span>
                      <button className="btn btn-ghost sm" onClick={async () => { await removeFriend(f.other_id); await refresh(); }}>Cancel</button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === 'add' && (
              <div className="friends-add">
                <label className="auth-field">
                  <span>Find by username</span>
                  <input
                    type="text"
                    className="auth-input"
                    data-testid="friends-search"
                    value={query}
                    placeholder="their_username"
                    onChange={(e) => { setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setFound(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) doSearch(); }}
                  />
                </label>
                <button className="btn btn-secondary block" data-testid="friends-search-btn" disabled={!query.trim() || busy} onClick={doSearch}>
                  {busy ? 'Searching…' : 'Search'}
                </button>
                {found === 'none' && <p className="go-sub">No player with that username.</p>}
                {found && found !== 'none' && (
                  <div className="friends-found" data-testid="friends-found">
                    <span className="friend-name">@{found.username}</span>
                    <RankBadge level={found.level} prestige={found.prestige} />
                    <button className="btn btn-primary sm" disabled={busy} data-testid="friends-add-btn" onClick={() => add(found.id)}>＋ Add friend</button>
                    <button className="btn btn-ghost sm" disabled={busy} onClick={() => blockUser(found.id).then(() => { setNote('Blocked.'); setFound(null); })}>Block</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
