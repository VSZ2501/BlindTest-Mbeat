-- BlindTest-Mbeat — Schéma Supabase
-- À exécuter dans le SQL Editor (nouveau projet Supabase dédié)

create extension if not exists "pgcrypto";

create type room_status as enum ('lobby', 'playing', 'judging', 'reveal', 'finished');
create type game_mode as enum ('write', 'buzzer');
create type verdict as enum ('accepted', 'rejected');

-- ROOMS
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code char(4) not null unique,
  status room_status not null default 'lobby',
  mode game_mode not null default 'write',
  host_plays boolean not null default true,
  streak_enabled boolean not null default false,
  songs_total int not null default 10 check (songs_total between 1 and 50),
  round_duration int not null default 30 check (round_duration between 10 and 90),
  playlist_id text,
  playlist_title text,
  current_round int not null default 0,
  current_song_id uuid,
  round_started_at timestamptz,
  buzz_deadline timestamptz,
  host_id uuid,
  created_at timestamptz not null default now()
);

-- PLAYERS (avatars compatibles Musique-Mbeat)
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  score int not null default 0,
  streak int not null default 0,
  is_host boolean not null default false,
  avatar_color int not null default 0,
  avatar_eyes int not null default 0,
  avatar_mouth int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, nickname)
);

alter table rooms
  add constraint rooms_host_fk foreign key (host_id) references players(id) on delete set null;

-- PLAYLIST_SONGS (sélection aléatoire déjà ordonnée)
create table playlist_songs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  youtube_id text not null check (char_length(youtube_id) = 11),
  title text not null,
  channel text not null default '',
  play_order int not null,
  created_at timestamptz not null default now()
);

alter table rooms
  add constraint rooms_current_song_fk foreign key (current_song_id) references playlist_songs(id) on delete set null;

-- ANSWERS (mode écrit)
create table answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  song_id uuid not null references playlist_songs(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  text text not null default '',
  verdict verdict,
  created_at timestamptz not null default now(),
  unique (song_id, player_id)
);

-- BUZZES (mode buzzer)
create table buzzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  song_id uuid not null references playlist_songs(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  buzz_order int not null default 0,
  verdict verdict,
  created_at timestamptz not null default now(),
  unique (song_id, player_id)
);

-- ATOMICITÉ DU BUZZER : un seul buzz "en attente de jugement" par musique.
-- Deux INSERT simultanés → un seul passe, l'autre reçoit une violation d'unicité.
create unique index one_active_buzz_per_song on buzzes(song_id) where verdict is null;

-- INDEX
create index idx_players_room on players(room_id);
create index idx_songs_room_order on playlist_songs(room_id, play_order);
create index idx_answers_song on answers(song_id);
create index idx_buzzes_song on buzzes(song_id);

-- CODE 4 LETTRES (sans I/O/L)
create or replace function generate_room_code()
returns char(4) language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ';
  result char(4);
begin
  loop
    result := (
      select string_agg(substr(chars, floor(random() * length(chars))::int + 1, 1), '')
      from generate_series(1, 4)
    );
    exit when not exists (select 1 from rooms where code = result);
  end loop;
  return result;
end $$;

-- RPC : création atomique room + hôte
create or replace function create_room(
  p_nickname text,
  p_mode game_mode,
  p_host_plays boolean,
  p_streak_enabled boolean,
  p_songs_total int,
  p_round_duration int,
  p_avatar_color int default 0,
  p_avatar_eyes int default 0,
  p_avatar_mouth int default 0
) returns json language plpgsql security definer as $$
declare
  v_room rooms;
  v_player players;
begin
  insert into rooms (code, mode, host_plays, streak_enabled, songs_total, round_duration)
  values (generate_room_code(), p_mode, p_host_plays, p_streak_enabled, p_songs_total, p_round_duration)
  returning * into v_room;

  insert into players (room_id, nickname, is_host, avatar_color, avatar_eyes, avatar_mouth)
  values (v_room.id, p_nickname, true, p_avatar_color, p_avatar_eyes, p_avatar_mouth)
  returning * into v_player;

  update rooms set host_id = v_player.id where id = v_room.id;

  return json_build_object('room_code', v_room.code, 'room_id', v_room.id, 'player_id', v_player.id);
end $$;

-- RPC : tentative de buzz atomique.
-- Retourne true si le joueur décroche le buzzer, false sinon (déjà pris,
-- déjà buzzé sur cette musique, ou hors phase de jeu).
create or replace function try_buzz(p_room_id uuid, p_song_id uuid, p_player_id uuid)
returns boolean language plpgsql security definer as $$
declare
  v_order int;
begin
  select count(*) into v_order from buzzes where song_id = p_song_id;

  begin
    insert into buzzes (room_id, song_id, player_id, buzz_order)
    values (p_room_id, p_song_id, p_player_id, v_order);
  exception when unique_violation then
    return false;
  end;

  update rooms
  set buzz_deadline = now() + interval '10 seconds'
  where id = p_room_id;

  return true;
end $$;

-- RLS anon permissif (jeu éphémère par code de room)
alter table rooms enable row level security;
alter table players enable row level security;
alter table playlist_songs enable row level security;
alter table answers enable row level security;
alter table buzzes enable row level security;

create policy "anon_all_rooms" on rooms for all to anon using (true) with check (true);
create policy "anon_all_players" on players for all to anon using (true) with check (true);
create policy "anon_all_songs" on playlist_songs for all to anon using (true) with check (true);
create policy "anon_all_answers" on answers for all to anon using (true) with check (true);
create policy "anon_all_buzzes" on buzzes for all to anon using (true) with check (true);

-- REALTIME
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table playlist_songs;
alter publication supabase_realtime add table answers;
alter publication supabase_realtime add table buzzes;
