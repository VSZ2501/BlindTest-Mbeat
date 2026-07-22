'use client';

import { useState } from 'react';
import { Timer } from './Timer';
import { submitAnswer, openJudging } from '@/lib/game-actions';
import type { Room, Player, Answer } from '@/lib/types';

interface Props {
  room: Room;
  players: Player[];
  answers: Answer[];
  meId: string;
}

export function WriteScreen({ room, players, answers, meId }: Props) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const isHost = room.host_id === meId;
  const iPlay = room.host_plays || !isHost;
  const songId = room.current_song_id!;
  const roundAnswers = answers.filter((a) => a.song_id === songId);
  const eligible = players.filter((p) => room.host_plays || !p.is_host);
  const answered = roundAnswers.filter((a) => a.text.trim()).length;

  const save = async () => {
    await submitAnswer(room.id, songId, meId, text.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Musique {room.current_round + 1}/{room.songs_total}
        </p>
        <h2 className="text-2xl font-bold text-white">Titre et artiste ? ✍️</h2>
      </div>

      <Timer
        startedAt={room.round_started_at!}
        duration={room.round_duration}
        onExpire={isHost ? () => openJudging(room.id) : undefined}
      />

      {iPlay ? (
        <div className="flex flex-col gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && text.trim() && save()}
            placeholder="Titre — Artiste"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-cyan-500"
          />
          <button
            onClick={save}
            disabled={!text.trim()}
            className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
          >
            {saved ? 'Enregistré ✓' : 'Valider ma réponse'}
          </button>
          <p className="text-center text-xs text-zinc-500">
            Tu peux corriger et revalider jusqu'à la fin du chrono.
          </p>
          <p className="text-center text-xs text-zinc-500">
            Plus tu es précise, plus tu marques : 1 pt si tu reconnais l'univers, 2 si tu
            précises l'œuvre, 3 pour le titre exact. Mais −1 si c'est faux !
          </p>
        </div>
      ) : (
        <p className="text-center text-zinc-400">Les joueurs écrivent leur réponse… 🎧</p>
      )}

      <p className="text-center text-sm text-zinc-500">
        {answered}/{eligible.length} réponse{answered > 1 && 's'} envoyée{answered > 1 && 's'}
      </p>

      {isHost && (
        <button
          onClick={() => openJudging(room.id)}
          className="rounded-xl border border-cyan-500/50 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10"
        >
          Terminer maintenant →
        </button>
      )}
    </div>
  );
}
