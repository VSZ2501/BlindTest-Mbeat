import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  let body: { password?: string; action?: string; id?: string; hours?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const admin = process.env.ADMIN_PASSWORD;
  if (!admin || body.password !== admin) {
    return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 401 });
  }

  switch (body.action) {
    case 'login':
      return NextResponse.json({ ok: true });

    case 'list': {
      const [{ data: rooms }, { data: players }] = await Promise.all([
        supabase.from('rooms').select('*').order('created_at', { ascending: false }),
        supabase.from('players').select('*'),
      ]);
      return NextResponse.json({ rooms: rooms ?? [], players: players ?? [] });
    }

    case 'delete_room': {
      if (!body.id) return NextResponse.json({ error: 'id manquant' }, { status: 400 });
      await supabase.from('rooms').delete().eq('id', body.id);
      return NextResponse.json({ ok: true });
    }

    case 'kick_player': {
      if (!body.id) return NextResponse.json({ error: 'id manquant' }, { status: 400 });
      await supabase.from('players').delete().eq('id', body.id);
      return NextResponse.json({ ok: true });
    }

    case 'purge': {
      const cutoff = new Date(Date.now() - (body.hours ?? 24) * 3600 * 1000).toISOString();
      const { data } = await supabase.from('rooms').delete().lt('created_at', cutoff).select('id');
      return NextResponse.json({ ok: true, deleted: data?.length ?? 0 });
    }

    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  }
}
