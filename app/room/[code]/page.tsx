'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { joinRoom } from '@/lib/game-actions';
import { Lobby } from '@/components/Lobby';
import { WriteScreen } from '@/components/WriteScreen';
import { BuzzerScreen } from '@/components/BuzzerScreen';
import { HostPanel } from '@/components/HostPanel';
import { RevealScreen } from '@/components/RevealScreen';
import { Leaderboard } from '@/components/Leaderboard';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { AvatarPicker, randomAvatar, type AvatarConfig } from '@/components/AvatarPicker';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { room, players, songs, answers, buzzes, loading, notFound } = useRoom(code);
  const [meId, setMeId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>({ color: 0, eyes: 0, mouth: 0 });
  const [joinError, setJoinError] = useState('');
  const prevScoresRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setMeId(localStorage.getItem(`btmbeat:${code.toUpperCase()}`));
    setAvatar(randomAvatar());
  }, [code]);

  useEffect(() => {
    if (room?.status === 'playing') {
      prevScoresRef.current = new Map(players.map((p) => [p.id, p.score]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.current_round]);

  if (loading) return <Center>Chargement…</Center>;
  if (notFound || !room) return <Center>Room introuvable 😕</Center>;

  const me = players.find((p) => p.id === meId);

  if (!me) {
    const canJoin = room.status === 'lobby';
    return (
      <Center>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-center text-2xl font-bold text-white">
            Rejoindre <span className="font-mono text-cyan-300">{room.code}</span>
          </h1>
          {canJoin ? (
            <>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="Ton pseudo"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white placeholder-zinc-600 outline-none focus:border-cyan-500"
              />
              <AvatarPicker value={avatar} onChange={setAvatar} />
              <button
                onClick={async () => {
                  try {
                    const r = await joinRoom(code, nickname.trim(), avatar);
                    localStorage.setItem(`btmbeat:${code.toUpperCase()}`, r.playerId);
                    setMeId(r.playerId);
                  } catch (e) {
                    setJoinError(e instanceof Error ? e.message : 'Erreur.');
                  }
                }}
                disabled={nickname.trim().length < 1}
                className="rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                Rejoindre
              </button>
              {joinError && <p className="text-center text-sm text-red-400">{joinError}</p>}
            </>
          ) : (
            <p className="text-center text-zinc-400">La partie a déjà commencé.</p>
          )}
        </div>
      </Center>
    );
  }

  const currentSong = songs.find((s) => s.id === room.current_song_id);
  const buzzActive = buzzes.some((b) => b.song_id === room.current_song_id && b.verdict === null);
  const musicOn = room.status === 'playing' && currentSong;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      {musicOn && (
        <div className="mb-6 flex justify-center">
          <YouTubePlayer videoId={currentSong.youtube_id} paused={buzzActive} />
        </div>
      )}

      {room.status === 'lobby' && <Lobby room={room} players={players} songs={songs} meId={me.id} />}
      {room.status === 'playing' && room.mode === 'write' && (
        <WriteScreen room={room} players={players} answers={answers} meId={me.id} />
      )}
      {room.status === 'playing' && room.mode === 'buzzer' && (
        <BuzzerScreen room={room} players={players} songs={songs} buzzes={buzzes} meId={me.id} />
      )}
      {room.status === 'judging' && (
        <HostPanel room={room} players={players} songs={songs} answers={answers} meId={me.id} />
      )}
      {room.status === 'reveal' && (
        <RevealScreen room={room} players={players} songs={songs} meId={me.id} prevScores={prevScoresRef.current} />
      )}
      {room.status === 'finished' && (
        <div className="mx-auto flex max-w-md flex-col gap-6">
          <h2 className="text-center text-3xl font-black text-white">🏆 Fin de partie !</h2>
          <Leaderboard
            players={players.filter((p) => room.host_plays || !p.is_host)}
            meId={me.id}
            streakEnabled={room.streak_enabled}
            final
          />
          <a
            href="/"
            className="rounded-xl bg-cyan-600 py-3 text-center font-semibold text-white hover:bg-cyan-500"
          >
            Nouvelle partie
          </a>
        </div>
      )}
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-zinc-300">
      {children}
    </div>
  );
}
