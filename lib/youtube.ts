const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{13,42}$/;

/**
 * Extrait l'ID de playlist d'une URL YouTube / YouTube Music.
 * Rejette les mix auto-générés (RD…) et listes privées (WL, LL),
 * non récupérables via l'API.
 */
export function parsePlaylistUrl(url: string): { playlistId: string } | { error: string } {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return { error: 'URL invalide' };
  }

  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host !== 'youtube.com' && host !== 'music.youtube.com') {
    return { error: 'Ce n’est pas un lien YouTube' };
  }

  const id = u.searchParams.get('list');
  if (!id || !PLAYLIST_ID_RE.test(id)) {
    return { error: 'Aucune playlist trouvée dans ce lien (paramètre "list" manquant)' };
  }
  if (id.startsWith('RD')) {
    return { error: 'Les "Mix" auto-générés ne sont pas récupérables. Utilise une vraie playlist.' };
  }
  if (id === 'WL' || id === 'LL') {
    return { error: 'Cette liste est privée (À regarder plus tard / Likes)' };
  }

  return { playlistId: id };
}
