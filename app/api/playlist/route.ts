import { NextRequest, NextResponse } from 'next/server';

const API = 'https://www.googleapis.com/youtube/v3';
const MAX_ITEMS = 500;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: 'YOUTUBE_API_KEY non configurée' }, { status: 500 });

  try {
    const metaRes = await fetch(
      `${API}/playlists?part=snippet&id=${id}&key=${key}`,
      { cache: 'no-store' }
    );
    const meta = await metaRes.json();
    if (!metaRes.ok) {
      return NextResponse.json(
        { error: meta.error?.message ?? 'Erreur YouTube' },
        { status: metaRes.status }
      );
    }
    if (!meta.items?.length) {
      return NextResponse.json(
        { error: 'Playlist introuvable ou privée. Vérifie qu’elle est publique ou non répertoriée.' },
        { status: 404 }
      );
    }
    const title: string = meta.items[0].snippet.title;

    const songs: { youtube_id: string; title: string; channel: string }[] = [];
    let pageToken = '';
    while (songs.length < MAX_ITEMS) {
      const res = await fetch(
        `${API}/playlistItems?part=snippet,status&playlistId=${id}&maxResults=50&pageToken=${pageToken}&key=${key}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message ?? 'Erreur YouTube' },
          { status: res.status }
        );
      }
      for (const item of data.items ?? []) {
        const s = item.snippet;
        if (s.title === 'Deleted video' || s.title === 'Private video') continue;
        if (item.status?.privacyStatus === 'private') continue;
        const videoId = s.resourceId?.videoId;
        if (!videoId) continue;
        songs.push({
          youtube_id: videoId,
          title: s.title,
          channel: s.videoOwnerChannelTitle ?? '',
        });
      }
      pageToken = data.nextPageToken ?? '';
      if (!pageToken) break;
    }

    if (songs.length === 0) {
      return NextResponse.json({ error: 'Aucune vidéo lisible dans cette playlist' }, { status: 422 });
    }

    return NextResponse.json({ title, songs });
  } catch {
    return NextResponse.json({ error: 'Impossible de contacter YouTube' }, { status: 502 });
  }
}
