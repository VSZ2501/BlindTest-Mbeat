import { supabase } from './supabase';
import { acceptedDelta, rejectedWriteDelta, rejectedBuzzDelta } from './scoring';
import type { Room, Player, PlaylistSong, Answer, Buzz, GameMode } from './types';
import type { AvatarConfig } from '@/components/AvatarPicker';

export async function createRoom(
  nickname: string,
  avatar: AvatarConfig,
  mode: GameMode,
  hostPlays: boolean,
  streakEnabled: boolean,
  songsTotal: number,
  roundDuration: number
) {
  const { data, error } = await supabase.rpc('create_room', {
    p_nickname: nickname,
    p_mode: mode,
    p_host_plays: hostPlays,
    p_streak_enabled: streakEnabled,
    p_songs_total: songsTotal,
    p_round_duration: roundDuration,
    p_avatar_color: avatar.color,
    p_avatar_eyes: avatar.eyes,
    p_avatar_mouth: avatar.mouth,
  });
  if (error) throw error;
  return data as { room_code: string; room_id: string; player_id: string };
}

export async function joinRoom(code: string, nickname: string, avatar: AvatarConfig) {
  const { data: room, error: e1 } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single();
  if (e1 || !room) throw new Error('Room introuvable');
  if (room.status !== 'lobby') throw new Error('La partie a déjà commencé');

  const { data: player, error: e2 } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      avatar_color: avatar.color,
      avatar_eyes: avatar.eyes,
      avatar_mouth: avatar.mouth,
    })
    .select()
    .single();
  if (e2) throw new Error('Pseudo déjà pris');
  return { roomId: room.id, playerId: player.id };
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export async function loadPlaylist(room: Room, playlistId: string) {
  const res = await fetch(`/api/playlist?id=${encodeURIComponent(playlistId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erreur playlist');

  const picked = pickRandom(
    data.songs as { youtube_id: string; title: string; channel: string }[],
    Math.min(room.songs_total, data.songs.length)
  );

  const { error } = await supabase.from('playlist_songs').insert(
    picked.map((s, i) => ({ ...s, room_id: room.id, play_order: i }))
  );
  if (error) throw error;

  await supabase
    .from('rooms')
    .update({ playlist_id: playlistId, playlist_title: data.title })
    .eq('id', room.id);

  return picked.length;
}

export async function startGame(roomId: string) {
  const { data: first } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('room_id', roomId)
    .eq('play_order', 0)
    .single();
  if (!first) throw new Error('Playlist non chargée');
  await startRound(roomId, 0, first.id);
}

export async function startRound(roomId: string, round: number, songId: string) {
  await supabase
    .from('rooms')
    .update({
      status: 'playing',
      current_round: round,
      current_song_id: songId,
      round_started_at: new Date().toISOString(),
      buzz_deadline: null,
    })
    .eq('id', roomId);
}

// ---- MODE ÉCRIT ----

export async function submitAnswer(roomId: string, songId: string, playerId: string, text: string) {
  await supabase
    .from('answers')
    .upsert(
      { room_id: roomId, song_id: songId, player_id: playerId, text },
      { onConflict: 'song_id,player_id' }
    );
}

export async function openJudging(roomId: string) {
  await supabase.from('rooms').update({ status: 'judging' }).eq('id', roomId);
}

export async function setVerdict(answerId: string, verdict: 'accepted' | 'rejected') {
  await supabase.from('answers').update({ verdict }).eq('id', answerId);
}

export async function finishJudging(room: Room, players: Player[], answers: Answer[]) {
  const roundAnswers = answers.filter((a) => a.song_id === room.current_song_id);
  const eligible = players.filter((p) => room.host_plays || !p.is_host);

  await Promise.all(
    eligible.map((p) => {
      const a = roundAnswers.find((x) => x.player_id === p.id);
      const d =
        a?.verdict === 'accepted'
          ? acceptedDelta(p, room.streak_enabled)
          : rejectedWriteDelta();
      return supabase
        .from('players')
        .update({ score: p.score + d.points, streak: d.streak })
        .eq('id', p.id);
    })
  );

  await supabase.from('rooms').update({ status: 'reveal' }).eq('id', room.id);
}

// ---- MODE BUZZER ----

export async function tryBuzz(roomId: string, songId: string, playerId: string) {
  const { data, error } = await supabase.rpc('try_buzz', {
    p_room_id: roomId,
    p_song_id: songId,
    p_player_id: playerId,
  });
  if (error) return false;
  return data as boolean;
}

async function resetStreaks(players: Player[], exceptId?: string) {
  const toReset = players.filter((p) => p.id !== exceptId && p.streak > 0);
  await Promise.all(
    toReset.map((p) => supabase.from('players').update({ streak: 0 }).eq('id', p.id))
  );
}

export async function judgeBuzz(
  room: Room,
  buzz: Buzz,
  player: Player,
  players: Player[],
  verdict: 'accepted' | 'rejected'
) {
  await supabase.from('buzzes').update({ verdict }).eq('id', buzz.id);

  const d =
    verdict === 'accepted'
      ? acceptedDelta(player, room.streak_enabled)
      : rejectedBuzzDelta();

  await supabase
    .from('players')
    .update({ score: player.score + d.points, streak: d.streak })
    .eq('id', player.id);

  if (verdict === 'accepted') {
    // Streak = manches consécutives réussies : reset des autres joueurs
    const eligible = players.filter((p) => room.host_plays || !p.is_host);
    await resetStreaks(eligible, player.id);
    await supabase.from('rooms').update({ status: 'reveal', buzz_deadline: null }).eq('id', room.id);
  } else {
    // Temps d'écoute rendu : la manche est décalée de la durée du buzz
    const pausedMs = Date.now() - new Date(buzz.created_at).getTime();
    const newStart = new Date(
      new Date(room.round_started_at!).getTime() + pausedMs
    ).toISOString();
    await supabase
      .from('rooms')
      .update({ buzz_deadline: null, round_started_at: newStart })
      .eq('id', room.id);
  }
}

export async function revealUnanswered(room: Room, players: Player[]) {
  // Personne n'a trouvé : toutes les streaks tombent
  const eligible = players.filter((p) => room.host_plays || !p.is_host);
  await resetStreaks(eligible);
  await supabase.from('rooms').update({ status: 'reveal', buzz_deadline: null }).eq('id', room.id);
}

export async function pauseBuzzTimer(roomId: string) {
  await supabase.from('rooms').update({ buzz_deadline: null }).eq('id', roomId);
}

// ---- FIN DE MANCHE / PARTIE ----

export async function nextRound(roomId: string, currentRound: number) {
  const { data: next } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('room_id', roomId)
    .eq('play_order', currentRound + 1)
    .maybeSingle();

  if (next) {
    await startRound(roomId, currentRound + 1, next.id);
  } else {
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
  }
}
