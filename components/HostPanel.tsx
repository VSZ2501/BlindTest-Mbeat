'use client';

import { Avatar } from './Avatar';
import { setVerdict, finishJudging } from '@/lib/game-actions';
import type { Room, Player, PlaylistSong, Answer } from '@/lib/types';

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

      <ul className="flex flex-col gap-2">
        {eligible.map((p) => {
          const a = roundAnswers.find((x) => x.player_id === p.id);
          const hasText = !!a?.text.trim();
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                a?.verdict === 'accepted'
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : a?.verdict === 'rejected'
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <Avatar color={p.avatar_color} eyes={p.avatar_eyes} mouth={p.avatar_mouth} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-200">{p.nickname}</p>
                <p className={`truncate text-sm ${hasText ? 'text-white' : 'italic text-zinc-600'}`}>
                  {hasText ? a!.text : 'Pas de réponse'}
                </p>
              </div>
              {isHost && hasText && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setVerdict(a!.id, 'accepted')}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${
                      a!.verdict === 'accepted'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 text-zinc-300 hover:bg-emerald-600/50'
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setVerdict(a!.id, 'rejected')}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${
                      a!.verdict === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-white/10 text-zinc-300 hover:bg-red-600/50'
                    }`}
                  >
                    ✗
                  </button>
                </div>
              )}
              {!isHost && a?.verdict && (
                <span className="text-lg">{a.verdict === 'accepted' ? '✅' : '❌'}</span>
              )}
            </li>
          );
        })}
      </ul>

      {isHost ? (
        <button
          onClick={() => finishJudging(room, players, answers)}
          disabled={roundAnswers.some((a) => a.text.trim() && !a.verdict)}
          className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          {roundAnswers.some((a) => a.text.trim() && !a.verdict)
            ? 'Juge toutes les réponses…'
            : 'Terminer la manche →'}
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-500">L'hôte vérifie les réponses…</p>
      )}
    </div>
  );
}
