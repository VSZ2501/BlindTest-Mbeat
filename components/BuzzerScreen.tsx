'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer } from './Timer';
import { Avatar } from './Avatar';
import { tryBuzz, judgeBuzz, revealUnanswered, pauseBuzzTimer, cancelBuzz } from '@/lib/game-actions';
import type { Room, Player, PlaylistSong, Buzz } from '@/lib/types';

const ARM_DELAY_MS = 1500;

export function BuzzerScreen({
  room,
  players,
  songs,
  buzzes,
  meId,
}: {
  room: Room;
  players: Player[];
  songs: PlaylistSong[];
  buzzes: Buzz[];
  meId: string;
}) {
  const [pending, setPending] = useState(false);
  const [answerLeft, setAnswerLeft] = useState(10);
  const [showAnswer, setShowAnswer] = useState(false);
  const [armed, setArmed] = useState(false);
  const judgedRef = useRef(false);

  const isHost = room.host_id === meId;
  const iPlay = room.host_plays || !isHost;
  const songId = room.current_song_id!;
  const song = songs.find((s) => s.id === songId);
  const roundBuzzes = buzzes.filter((b) => b.song_id === songId);
  const activeBuzz = roundBuzzes.find((b) => b.verdict === null) ?? null;
  const holder = activeBuzz ? players.find((p) => p.id === activeBuzz.player_id) : null;
  const iFailed = roundBuzzes.some((b) => b.player_id === meId && b.verdict === 'rejected');
  const hostIsHolder = !!holder && holder.id === room.host_id;

  const showTitleToHost =
    isHost &&
    (!room.host_plays || (!!activeBuzz && !hostIsHolder) || (hostIsHolder && showAnswer));

  useEffect(() => {
    judgedRef.current = false;
    setShowAnswer(false);
  }, [activeBuzz?.id, songId]);

  // Armement : le buzzer est verrouillé 1,5s après chaque (re)départ de
  // manche — absorbe les clics en attente, souris posée sur le bouton, etc.
  useEffect(() => {
    setArmed(false);
    if (!room.round_started_at) return;
    const elapsed = Date.now() - new Date(room.round_started_at).getTime();
    const t = setTimeout(() => setArmed(true), Math.max(0, ARM_DELAY_MS - elapsed));
    return () => clearTimeout(t);
  }, [room.round_started_at, songId]);

  // Chrono 10s de réponse orale (gelé si buzz_deadline est null)
  useEffect(() => {
    if (!activeBuzz || !room.buzz_deadline) return;
    const tick = () => {
      const left = Math.max(0, (new Date(room.buzz_deadline!).getTime() - Date.now()) / 1000);
      setAnswerLeft(left);
      if (left <= 0 && isHost && holder && !judgedRef.current) {
        judgedRef.current = true;
        judgeBuzz(room, activeBuzz, holder, players, 'rejected');
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuzz?.id, room.buzz_deadline, isHost]);

  const buzz = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) return; // clic clavier (Entrée/Espace) ignoré
    e.currentTarget.blur();
    if (pending || activeBuzz || iFailed || !iPlay || !armed) return;
    setPending(true);
    try {
      await tryBuzz(room.id, songId, meId);
    } finally {
      setPending(false);
    }
  };

  const judge = (verdict: 'accepted' | 'rejected') => {
    if (!activeBuzz || !holder || judgedRef.current) return;
    judgedRef.current = true;
    judgeBuzz(room, activeBuzz, holder, players, verdict);
  };

  const cancel = () => {
    if (!activeBuzz || judgedRef.current) return;
    judgedRef.current = true;
    cancelBuzz(room.id, activeBuzz.id);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Musique {room.current_round + 1}/{room.songs_total}
        </p>
        <h2 className="text-2xl font-bold text-white">Premier arrivé… 🔔</h2>
      </div>

      {!activeBuzz && (
        <Timer
          startedAt={room.round_started_at!}
          duration={room.round_duration}
          onExpire={isHost ? () => revealUnanswered(room, players) : undefined}
        />
      )}

      {showTitleToHost && song && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm">
          <span className="text-zinc-400">Réponse (visible par l'hôte) : </span>
          <span className="font-semibold text-amber-300">{song.title}</span>
          {song.channel && <span className="text-zinc-400"> — {song.channel}</span>}
        </div>
      )}

      {activeBuzz && holder ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-6">
          <div className="flex items-center gap-3">
            <Avatar color={holder.avatar_color} eyes={holder.avatar_eyes} mouth={holder.avatar_mouth} size={48} />
            <p className="text-xl font-bold text-cyan-300">
              {holder.id === meId ? 'À toi de répondre !' : `${holder.nickname} a buzzé !`}
            </p>
          </div>
          {room.buzz_deadline ? (
            <p className="font-mono text-5xl tabular-nums text-white">{Math.ceil(answerLeft)}s</p>
          ) : (
            <p className="text-2xl font-bold text-zinc-400">⏸ Chrono arrêté</p>
          )}
          <p className="text-center text-sm text-zinc-400">
            {holder.id === meId
              ? 'Donne ta réponse à l\u2019oral (Discord) 🎙️'
              : 'Réponse à l\u2019oral en cours…'}
          </p>
          {isHost && (
            <div className="flex w-full flex-col gap-2">
              {hostIsHolder && !showAnswer && (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="rounded-xl border border-amber-500/50 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/10"
                >
                  👁 Voir la réponse (après avoir répondu !)
                </button>
              )}
              {room.buzz_deadline && (
                <button
                  onClick={() => pauseBuzzTimer(room.id)}
                  className="rounded-xl border border-white/20 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/10"
                >
                  ⏸ Arrêter le chrono
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => judge('accepted')}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500"
                >
                  ✓ Bonne réponse
                </button>
                <button
                  onClick={() => judge('rejected')}
                  className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-500"
                >
                  ✗ Raté
                </button>
              </div>
              <button
                onClick={cancel}
                className="rounded-xl border border-zinc-500/40 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/5"
              >
                ↩ Buzz accidentel (annuler, sans malus)
              </button>
            </div>
          )}
        </div>
      ) : iPlay ? (
        <button
          onClick={buzz}
          disabled={iFailed || pending || !armed}
          className={`mx-auto flex h-52 w-52 items-center justify-center rounded-full border-8 text-2xl font-black transition active:scale-95 ${
            iFailed
              ? 'border-zinc-700 bg-zinc-800 text-zinc-600'
              : !armed
              ? 'border-zinc-600 bg-zinc-700 text-zinc-400'
              : 'border-red-700 bg-red-600 text-white shadow-2xl shadow-red-500/30 hover:bg-red-500'
          }`}
        >
          {iFailed ? 'Déjà tenté 😅' : !armed ? '🔒' : 'BUZZ !'}
        </button>
      ) : (
        <p className="text-center text-zinc-400">En attente d'un buzz… 🎧</p>
      )}

      {roundBuzzes.some((b) => b.verdict === 'rejected') && (
        <p className="text-center text-sm text-zinc-500">
          Déjà tenté (-1 pt) :{' '}
          {roundBuzzes
            .filter((b) => b.verdict === 'rejected')
            .map((b) => players.find((p) => p.id === b.player_id)?.nickname)
            .filter(Boolean)
            .join(', ')}
        </p>
      )}

      {isHost && !activeBuzz && (
        <button
          onClick={() => revealUnanswered(room, players)}
          className="rounded-xl border border-cyan-500/50 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10"
        >
          Personne ne trouvera → révéler
        </button>
      )}
    </div>
  );
}
