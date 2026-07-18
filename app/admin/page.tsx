'use client';

import { useEffect, useState } from 'react';

interface AdminRoom {
  id: string;
  code: string;
  status: string;
  created_at: string;
  host_id: string | null;
  [k: string]: unknown;
}
interface AdminPlayer {
  id: string;
  room_id: string;
  nickname: string;
  score: number;
  is_host: boolean;
  [k: string]: unknown;
}

function age(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Erreur');
    return data;
  };

  const refresh = async () => {
    const data = await call('list');
    setRooms(data.rooms);
    setPlayers(data.players);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('mbeat_admin');
    if (saved) {
      setPassword(saved);
    }
  }, []);

  const login = async () => {
    setMsg('');
    setBusy(true);
    try {
      await call('login');
      sessionStorage.setItem('mbeat_admin', password);
      setAuthed(true);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="text-center text-2xl font-bold text-white">🔐 Administration</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && password && login()}
          placeholder="Mot de passe"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white placeholder-zinc-600 outline-none focus:border-cyan-500"
        />
        <button
          onClick={login}
          disabled={!password || busy}
          className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          Entrer
        </button>
        {msg && <p className="text-center text-sm text-red-400">{msg}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🔐 Rooms ({rooms.length})</h1>
        <div className="flex gap-2">
          <button
            onClick={() => act(async () => {
              const r = await call('purge', { hours: 24 });
              setMsg(`${r.deleted} room(s) supprimée(s)`);
            })}
            disabled={busy}
            className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
          >
            🧹 Purger &gt; 24h
          </button>
          <button
            onClick={() => act(refresh)}
            disabled={busy}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-40"
          >
            ↻
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-cyan-300">{msg}</p>}

      <ul className="flex flex-col gap-2">
        {rooms.map((r) => {
          const rp = players.filter((p) => p.room_id === r.id);
          const expanded = open === r.id;
          return (
            <li key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpen(expanded ? null : r.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className="font-mono text-lg font-bold tracking-widest text-cyan-300">
                    {r.code}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                    {r.status}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {rp.length} joueur{rp.length > 1 && 's'} · il y a {age(r.created_at)}
                  </span>
                </button>
                <button
                  onClick={() => confirm(`Supprimer la room ${r.code} ?`) && act(() => call('delete_room', { id: r.id }))}
                  disabled={busy}
                  className="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
              {expanded && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
                  {rp.length === 0 && <li className="text-sm text-zinc-600">Aucun joueur</li>}
                  {rp.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-200">
                        {p.nickname} {p.is_host && '👑'}{' '}
                        <span className="text-zinc-500">· {p.score} pts</span>
                      </span>
                      <button
                        onClick={() => act(() => call('kick_player', { id: p.id }))}
                        disabled={busy}
                        className="rounded px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Kick ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {rooms.length === 0 && <p className="text-center text-zinc-500">Aucune room 🎉</p>}
      </ul>
    </main>
  );
}
