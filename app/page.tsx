'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom } from '@/lib/game-actions';
import { AvatarPicker, randomAvatar, type AvatarConfig } from '@/components/AvatarPicker';
import type { GameMode } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>({ color: 0, eyes: 0, mouth: 0 });
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<GameMode>('write');
  const [hostPlays, setHostPlays] = useState(true);
  const [streakEnabled, setStreakEnabled] = useState(true);
  const [songsTotal, setSongsTotal] = useState(10);
  const [roundDuration, setRoundDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAvatar(randomAvatar());
  }, []);

  const savePlayer = (roomCode: string, playerId: string) => {
    localStorage.setItem(`btmbeat:${roomCode.toUpperCase()}`, playerId);
  };

  const handleCreate = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await createRoom(nickname.trim(), avatar, mode, hostPlays, streakEnabled, songsTotal, roundDuration);
      savePlayer(r.room_code, r.player_id);
      router.push(`/room/${r.room_code}`);
    } catch {
      setError('Impossible de créer la room.');
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await joinRoom(code.trim(), nickname.trim(), avatar);
      savePlayer(code, r.playerId);
      router.push(`/room/${code.toUpperCase()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
      setBusy(false);
    }
  };

  const nickOk = nickname.trim().length >= 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <a href="https://mbeat-hub.vercel.app" className="text-center text-sm text-zinc-500 hover:text-cyan-300">
        ← Mbeat-HUB
      </a>
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-white">
          BlindTest<span className="text-cyan-400">-M</span>beat
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Une playlist, un chrono. Qui reconnaît le plus vite ?</p>
      </div>

      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        placeholder="Ton pseudo"
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white placeholder-zinc-600 outline-none focus:border-cyan-500"
      />

      <AvatarPicker value={avatar} onChange={setAvatar} />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 font-semibold text-white">Créer une partie</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex gap-2">
            {(['write', 'buzzer'] as GameMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl border py-2.5 font-semibold transition ${
                  mode === m
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:border-cyan-500/40'
                }`}
              >
                {m === 'write' ? '✍️ Écrit' : '🔔 Buzzer'}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between text-zinc-300">
            Nombre de musiques
            <select
              value={songsTotal}
              onChange={(e) => setSongsTotal(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1"
            >
              {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between text-zinc-300">
            Temps par musique
            <select
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1"
            >
              {[20, 30, 45, 60].map((n) => (
                <option key={n} value={n}>{n}s</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between text-zinc-300">
            L'hôte joue aussi
            <input type="checkbox" checked={hostPlays} onChange={(e) => setHostPlays(e.target.checked)} className="h-4 w-4 accent-cyan-500" />
          </label>
          <label className="flex items-center justify-between text-zinc-300">
            Bonus streak 🔥
            <input type="checkbox" checked={streakEnabled} onChange={(e) => setStreakEnabled(e.target.checked)} className="h-4 w-4 accent-cyan-500" />
          </label>
        </div>
        <button
          onClick={handleCreate}
          disabled={!nickOk || busy}
          className="mt-4 w-full rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          Créer la room
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 font-semibold text-white">Rejoindre</h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="CODE"
            className="w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-zinc-600 outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleJoin}
            disabled={!nickOk || code.length !== 4 || busy}
            className="flex-1 rounded-xl border border-cyan-500/60 py-3 font-semibold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40"
          >
            Rejoindre
          </button>
        </div>
      </section>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </main>
  );
}
