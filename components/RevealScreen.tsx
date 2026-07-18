'use client';

import { Leaderboard } from './Leaderboard';
import { nextRound } from '@/lib/game-actions';
import type { Room, Player, PlaylistSong } from '@/lib/types';

interface Props {
  room: Room;
  players: Player[];
  songs: PlaylistSong[];
  meId: string;
  prevScores: Map<string, number>;
}

export function RevealScreen({ room, players, songs, meId, prevScores }: Props) {
  const song = songs.find((s) => s.id === room.current_song_id);
  if (!song) return null;

  const isHost = room.host_id === meId;
  const isLast = room.current_round + 1 >= songs.length;
  const board = players.filter((p) => room.host_plays || !p.is_host);
  const next = songs.find((s) => s.play_order === room.current_round + 1);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 text-center">
        <p className="text-sm text-zinc-400">C'était…</p>
        <p className="my-1 text-2xl font-bold text-cyan-300">{song.title}</p>
        {song.channel && <p className="text-zinc-400">{song.channel}</p>}
        <a
          href={`https://youtu.be/${song.youtube_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-zinc-400 underline hover:text-white"
        >
          Voir la vidéo ↗
        </a>
      </div>

      <Leaderboard players={board} meId={meId} prevScores={prevScores} streakEnabled={room.streak_enabled} />

      {isHost && next && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm">
          <span className="text-zinc-400">Prochaine musique (visible par toi seul) : </span>
          <span className="font-semibold text-amber-300">{next.title}</span>
          {next.channel && <span className="text-zinc-400"> — {next.channel}</span>}
        </div>
      )}

      {isHost && (
        <button
          onClick={() => nextRound(room.id, room.current_round)}
          className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500"
        >
          {isLast ? 'Voir le classement final 🏆' : 'Musique suivante →'}
        </button>
      )}
    </div>
  );
}
