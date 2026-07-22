import type { Player } from './types';

/**
 * MODE ÉCRIT — points de précision attribués par l'hôte :
 *   -1 : faux (dissuade d'écrire au hasard)
 *    0 : proche mais pas ça
 *    1 : reconnu (l'univers, la série…)
 *    2 : précis (l'album, le jeu, le film…)
 *    3 : exact (le titre lui-même)
 * Pas de réponse écrite → 0 point, streak cassée.
 * Streak : conservée dès 1 point, cassée à 0 ou -1.
 *
 * MODE BUZZER :
 *   Bonne réponse +1, tout buzz raté -1, ne pas buzzer = 0.
 *   Streak = manches consécutives gagnées.
 *
 * Bonus streak (option) : +1 à partir de 3 bonnes réponses d'affilée.
 */

export function writeDelta(player: Player, points: number | null, streakEnabled: boolean) {
  const p = points ?? 0;
  if (p < 1) return { points: p, streak: 0 };
  const newStreak = player.streak + 1;
  return {
    points: streakEnabled && newStreak >= 3 ? p + 1 : p,
    streak: newStreak,
  };
}

export function acceptedDelta(player: Player, streakEnabled: boolean) {
  const newStreak = player.streak + 1;
  let points = 1;
  if (streakEnabled && newStreak >= 3) points += 1;
  return { points, streak: newStreak };
}

export function rejectedBuzzDelta() {
  return { points: -1, streak: 0 };
}
