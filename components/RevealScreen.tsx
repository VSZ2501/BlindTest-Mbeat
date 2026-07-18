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
