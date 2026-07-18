'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Room, Player, PlaylistSong, Answer, Buzz } from '@/lib/types';

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(
    async (roomId: string, table: 'players' | 'playlist_songs' | 'answers' | 'buzzes') => {
      const { data } = await supabase.from(table).select('*').eq('room_id', roomId);
      if (table === 'players') setPlayers((data ?? []) as Player[]);
      if (table === 'playlist_songs') setSongs((data ?? []) as PlaylistSong[]);
      if (table === 'answers') setAnswers((data ?? []) as Answer[]);
      if (table === 'buzzes') setBuzzes((data ?? []) as Buzz[]);
    },
    []
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: r } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (cancelled) return;

      if (!r) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRoom(r as Room);
      await Promise.all([
        refetch(r.id, 'players'),
        refetch(r.id, 'playlist_songs'),
        refetch(r.id, 'answers'),
        refetch(r.id, 'buzzes'),
      ]);
      if (cancelled) return;
      setLoading(false);

      const sub = (table: 'players' | 'playlist_songs' | 'answers' | 'buzzes') => ({
        event: '*' as const,
        schema: 'public',
        table,
        filter: `room_id=eq.${r.id}`,
      });

      channel = supabase
        .channel(`room:${r.id}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${r.id}` },
          (payload) => setRoom(payload.new as Room)
        )
        .on('postgres_changes', sub('players'), () => refetch(r.id, 'players'))
        .on('postgres_changes', sub('playlist_songs'), () => refetch(r.id, 'playlist_songs'))
        .on('postgres_changes', sub('answers'), () => refetch(r.id, 'answers'))
        .on('postgres_changes', sub('buzzes'), () => refetch(r.id, 'buzzes'))
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code, refetch]);

  return { room, players, songs, answers, buzzes, loading, notFound };
}
