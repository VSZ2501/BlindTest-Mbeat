'use client';

import { Avatar, AVATAR_COLORS, N_EYES, N_MOUTHS } from './Avatar';

export interface AvatarConfig {
  color: number;
  eyes: number;
  mouth: number;
}

interface Props {
  value: AvatarConfig;
  onChange: (v: AvatarConfig) => void;
}

export function AvatarPicker({ value, onChange }: Props) {
  const cycle = (key: keyof AvatarConfig, dir: number, max: number) =>
    onChange({ ...value, [key]: (value[key] + dir + max) % max });

  const Row = ({ label, k, max }: { label: string; k: keyof AvatarConfig; max: number }) => (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => cycle(k, -1, max)}
        className="rounded-lg bg-white/10 px-2.5 py-1 text-zinc-300 hover:bg-white/20"
        aria-label={`${label} précédent`}
      >
        ◀
      </button>
      <span className="text-xs text-zinc-400">{label}</span>
      <button
        type="button"
        onClick={() => cycle(k, 1, max)}
        className="rounded-lg bg-white/10 px-2.5 py-1 text-zinc-300 hover:bg-white/20"
        aria-label={`${label} suivant`}
      >
        ▶
      </button>
    </div>
  );

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <Avatar {...value} size={80} />
      <div className="flex flex-1 flex-col gap-2">
        <Row label="Couleur" k="color" max={AVATAR_COLORS.length} />
        <Row label="Yeux" k="eyes" max={N_EYES} />
        <Row label="Bouche" k="mouth" max={N_MOUTHS} />
      </div>
    </div>
  );
}

export function randomAvatar(): AvatarConfig {
  return {
    color: Math.floor(Math.random() * AVATAR_COLORS.length),
    eyes: Math.floor(Math.random() * N_EYES),
    mouth: Math.floor(Math.random() * N_MOUTHS),
  };
}
