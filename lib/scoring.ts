import type { Player } from './types';

/**
 * Règles :
 * - Bonne réponse (validée) : +1, streak +1, +1 bonus si streak >= 3 (option).
 * - Mode écrit : réponse refusée OU absente → streak 0, 0 point.
 * - Mode buzzer : TOUT buzz refusé → -1 point, streak 0 (fair-play : même
 *   règle pour tous les buzzers, pas seulement le premier).
 * - Mode buzzer : la streak = manches consécutives réussies. Ne pas donner
 *   la bonne réponse sur une manche (quelqu'un d'autre gagne, ou personne)
 *   remet la streak à 0 (géré dans game-actions à la fin de chaque manche).
 */

export function acceptedDelta(player: Player, streakEnabled: boolean) {
  const newStreak = player.streak + 1;
  let points = 1;
  if (streakEnabled && newStreak >= 3) points += 1;
  return { points, streak: newStreak };
}

export function rejectedWriteDelta() {
  return { points: 0, streak: 0 };
}

export function rejectedBuzzDelta() {
  return { points: -1, streak: 0 };
}
