import type { Player } from './types';

/**
 * Règles :
 * - Bonne réponse (validée) : +1, streak +1, +1 bonus si streak >= 3 (option).
 * - Mode écrit : réponse refusée OU absente → streak remise à 0, 0 point.
 * - Mode buzzer : buzz refusé → streak 0 ; malus -1 UNIQUEMENT pour le
 *   premier buzzer de la musique (buzz_order = 0). Ne pas buzzer ne casse
 *   pas la streak (on ne peut pas tout connaître).
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

export function rejectedBuzzDelta(buzzOrder: number) {
  return { points: buzzOrder === 0 ? -1 : 0, streak: 0 };
}
