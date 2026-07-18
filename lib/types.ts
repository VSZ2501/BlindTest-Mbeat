export type RoomStatus = 'lobby' | 'playing' | 'judging' | 'reveal' | 'finished';
export type GameMode = 'write' | 'buzzer';
export type Verdict = 'accepted' | 'rejected' | null;

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  mode: GameMode;
  host_plays: boolean;
  streak_enabled: boolean;
  songs_total: number;
  round_duration: number;
  playlist_id: string | null;
  playlist_title: string | null;
  current_round: number;
  current_song_id: string | null;
  round_started_at: string | null;
  buzz_deadline: string | null;
  host_id: string | null;
}

export interface Player {
  id: string;
  room_id: string;
  nickname: string;
  score: number;
  streak: number;
  is_host: boolean;
  avatar_color: number;
  avatar_eyes: number;
  avatar_mouth: number;
}

export interface PlaylistSong {
  id: string;
  room_id: string;
  youtube_id: string;
  title: string;
  channel: string;
  play_order: number;
}

export interface Answer {
  id: string;
  room_id: string;
  song_id: string;
  player_id: string;
  text: string;
  verdict: Verdict;
}

export interface Buzz {
  id: string;
  room_id: string;
  song_id: string;
  player_id: string;
  buzz_order: number;
  verdict: Verdict;
}
