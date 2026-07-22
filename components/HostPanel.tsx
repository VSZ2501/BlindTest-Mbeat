'use client';

import { Avatar } from './Avatar';
import { setPoints, finishJudging } from '@/lib/game-actions';
import type { Room, Player, PlaylistSong, Answer } from '@/lib/types';

const SCALE = [
  { v: -1, label: '-1', title: 'Faux', cls: 'bg-red-600' },
  { v: 0, label: '0', title: 'Proche', cls: 'bg-zinc-600' },
  { v: 1, label: '1', title: 'Reconnu', cls: 'bg-emerald-700' },
  { v: 2, label: '2', title: 'Précis', cls: 'bg-emerald-600' },
  { v: 3, label: '3', title: 'Exact', cls: 'bg-emerald-500' },
];

interface Props {
  room: Room;
  players: Player[];
  songs: PlaylistSong[];
  answers: Answer[];
  meId: string;
}

export function HostPanel({ room, players, songs, answers, meId }: Props) {
  const isHost = room.host_id === meId;
  const song = songs.find((s) => s.id === room.current_song_id);
  const roundAnswers = answers.filter((a) => a.song_id === room.current_song_id);
  const eligible = players.filter((p) => room.host_plays || !p.is_host);
  const pending = roundAnswers.some((a) => a.text.trim() && a.points === null);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Musique {room.current_round + 1}/{room.songs_total}
        </p>
        <h2 className="text-2xl font-bold text-white">Vérification des réponses 🧐</h2>
      </div>

      {song && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm">
          <span className="text-zinc-400">Réponse : </span>
          <span className="font-semibold text-amber-300">{song.title}</span>
          {song.channel && <span className="text-zinc-400"> — {song.channel}</span>}
        </div>
      )}

      {isHost && (
        <p className="text-center text-xs text-zinc-500">
          −1 faux · 0 proche · 1 reconnu · 2 précis · 3 exact
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {eligible.map((p) => {
          const a = roundAnswers.find((x) => x.player_id === p.id);
          const hasText = !!a?.text.trim();
          const pts = a?.points ?? null;
          return (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-xl border p-3 ${
                pts === null
                  ? 'border-white/10 bg-white/5'
                  : pts >= 1
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : pts === 0
                  ? 'border-zinc-500/40 bg-white/5'
                  : 'border-red-500/40 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar color={p.avatar_color} eyes={p.avatar_eyes} mouth={p.avatar_mouth} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-200">{p.nickname}</p>
                  <p className={`truncate ${hasText ? 'text-white' : 'italic text-zinc-600'}`}>
                    {hasText ? a!.text : 'Pas de réponse'}
                  </p>
                </div>
                {pts !== null && hasText && (
                  <span
                    className={`rounded-lg px-2.5 py-1 font-mono text-sm font-bold text-white ${
                      pts >= 1 ? 'bg-emerald-600' : pts === 0 ? 'bg-zinc-600' : 'bg-red-600'
                    }`}
                  >
                    {pts > 0 ? `+${pts}` : pts}
                  </span>
                )}
              </div>
              {isHost && hasText && (
                <div className="flex gap-1.5">
                  {SCALE.map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setPoints(a!.id, s.v)}
                      title={s.title}
                      className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                        pts === s.v
                          ? `${s.cls} text-white`
                          : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isHost ? (
        <button
          onClick={() => finishJudging(room, players, answers)}
          disabled={pending}
          className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          {pending ? 'Note toutes les réponses…' : 'Terminer la manche →'}
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-500">L'hôte vérifie les réponses…</p>
      )}
    </div>
  );
}
