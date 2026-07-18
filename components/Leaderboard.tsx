'use client';

import { Avatar } from './Avatar';
import type { Player } from '@/lib/types';

interface Props {
  players: Player[];
  meId: string;
  prevScores?: Map<string, number>;
  streakEnabled?: boolean;
  final?: boolean;
}

export function Leaderboard({ players, meId, prevScores, streakEnabled, final }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="mb-3 text-sm text-zinc-400">{final ? 'Classement final' : 'Scores'}</p>
      <ul className="flex flex-col gap-2">
        {sorted.map((p, i) => {
          const delta = prevScores ? p.score - (prevScores.get(p.id) ?? 0) : 0;
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                p.id === meId ? 'bg-cyan-500/15' : 'bg-white/5'
              } ${final && i === 0 ? 'border border-yellow-400/50' : ''}`}
            >
              <span className="flex items-center gap-2 text-zinc-100">
                <span className="w-7 text-center">{medals[i] ?? `${i + 1}.`}</span>
                <Avatar color={p.avatar_color} eyes={p.avatar_eyes} mouth={p.avatar_mouth} size={28} />
                <span className="font-medium">{p.nickname}</span>
                {streakEnabled && p.streak >= 3 && (
                  <span className="text-xs text-orange-400">🔥{p.streak}</span>
                )}
              </span>
              <span className="flex items-center gap-2 font-mono">
                {delta > 0 && <span className="text-sm text-emerald-400">+{delta}</span>}
                <span className="text-white">{p.score}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
