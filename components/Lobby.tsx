'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { parsePlaylistUrl } from '@/lib/youtube';
import { loadPlaylist, startGame } from '@/lib/game-actions';
import type { Room, Player, PlaylistSong } from '@/lib/types';

interface Props {
  room: Room;
  players: Player[];
  songs: PlaylistSong[];
  meId: string;
}

export function Lobby({ room, players, songs, meId }: Props) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isHost = room.host_id === meId;
  const playlistLoaded = songs.length > 0;
  const minPlayers = room.host_plays ? 1 : 2;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoad = async () => {
    setError('');
    const parsed = parsePlaylistUrl(url);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    try {
      await loadPlaylist(room, parsed.playlistId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-zinc-400">Code de la room</p>
        <p className="my-2 font-mono text-5xl font-bold tracking-[0.3em] text-cyan-300">
          {room.code}
        </p>
        <button
          onClick={copyLink}
          className="rounded-lg border border-cyan-500/50 px-4 py-1.5 text-sm text-cyan-300 hover:bg-cyan-500/10"
        >
          {copied ? 'Lien copié ✓' : 'Copier le lien'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm text-zinc-400">Joueurs ({players.length})</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 ${
                p.id === meId ? 'bg-cyan-500/15' : 'bg-white/5'
              }`}
            >
              <div className="relative">
                <Avatar color={p.avatar_color} eyes={p.avatar_eyes} mouth={p.avatar_mouth} size={48} />
                {p.is_host && <span className="absolute -right-1 -top-1 text-sm">👑</span>}
              </div>
              <span className="w-full truncate text-center text-xs text-zinc-200">
                {p.nickname}
                {p.is_host && !room.host_plays && <span className="text-zinc-500"> (arbitre)</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        Mode {room.mode === 'write' ? 'Écrit ✍️' : 'Buzzer 🔔'} · {room.songs_total} musiques ·{' '}
        {room.round_duration}s/musique · Hôte {room.host_plays ? 'joueur' : 'arbitre'} · Streak{' '}
        {room.streak_enabled ? 'ON' : 'OFF'}
      </div>

      {isHost && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <p className="mb-2 text-sm font-semibold text-cyan-300">Playlist YouTube</p>
          {playlistLoaded ? (
            <p className="text-sm text-emerald-300">
              ✓ « {room.playlist_title} » — {songs.length} musique{songs.length > 1 && 's'} tirée
              {songs.length > 1 && 's'} au sort
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/playlist?list=…"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleLoad}
                disabled={!url || busy}
                className="rounded-lg bg-cyan-600 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                {busy ? 'Chargement…' : 'Charger la playlist'}
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )}

      {isHost ? (
        <button
          onClick={() => startGame(room.id)}
          disabled={!playlistLoaded || players.length < minPlayers + (room.host_plays ? 0 : 1)}
          className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          {!playlistLoaded ? 'Charge d\u2019abord une playlist' : 'Lancer la partie 🎵'}
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-500">En attente du lancement par l'hôte…</p>
      )}
    </div>
  );
}
