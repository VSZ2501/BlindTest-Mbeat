'use client';

export const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#facc15', '#22c55e',
  '#2dd4bf', '#3b82f6', '#a855f7', '#ec4899',
];
export const N_EYES = 6;
export const N_MOUTHS = 6;

interface Props {
  color: number;
  eyes: number;
  mouth: number;
  size?: number;
}

export function Avatar({ color, eyes, mouth, size = 48 }: Props) {
  const c = AVATAR_COLORS[((color % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="34" r="26" fill={c} />
      <circle cx="32" cy="34" r="26" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2.5" />
      <ellipse cx="24" cy="24" rx="7" ry="4" fill="rgba(255,255,255,0.25)" />
      <Eyes v={eyes} />
      <Mouth v={mouth} />
    </svg>
  );
}

function Eyes({ v }: { v: number }) {
  const s = { stroke: '#1c1917', strokeWidth: 2.5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (((v % N_EYES) + N_EYES) % N_EYES) {
    case 1:
      return (
        <g>
          <circle cx="24" cy="30" r="5.5" fill="white" />
          <circle cx="40" cy="30" r="5.5" fill="white" />
          <circle cx="25" cy="31" r="2.5" fill="#1c1917" />
          <circle cx="41" cy="31" r="2.5" fill="#1c1917" />
        </g>
      );
    case 2:
      return (
        <g {...s}>
          <path d="M19 30 h10" />
          <path d="M35 30 h10" />
        </g>
      );
    case 3:
      return (
        <g>
          <circle cx="24" cy="30" r="3" fill="#1c1917" />
          <path d="M35 30 h10" {...s} />
        </g>
      );
    case 4:
      return (
        <g {...s}>
          <path d="M19 32 q5 -7 10 0" />
          <path d="M35 32 q5 -7 10 0" />
        </g>
      );
    case 5:
      return (
        <g>
          <circle cx="24" cy="30" r="6" {...s} />
          <circle cx="40" cy="30" r="6" {...s} />
          <path d="M30 30 h4" {...s} />
          <circle cx="24" cy="30" r="2" fill="#1c1917" />
          <circle cx="40" cy="30" r="2" fill="#1c1917" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="24" cy="30" r="3" fill="#1c1917" />
          <circle cx="40" cy="30" r="3" fill="#1c1917" />
        </g>
      );
  }
}

function Mouth({ v }: { v: number }) {
  const s = { stroke: '#1c1917', strokeWidth: 2.5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (((v % N_MOUTHS) + N_MOUTHS) % N_MOUTHS) {
    case 1:
      return <ellipse cx="32" cy="46" rx="5" ry="6" fill="#1c1917" />;
    case 2:
      return <path d="M26 46 h12" {...s} />;
    case 3:
      return (
        <g>
          <path d="M22 43 q10 12 20 0 z" fill="#1c1917" />
          <path d="M26 46 q6 5 12 0 z" fill="#f43f5e" />
        </g>
      );
    case 4:
      return (
        <g>
          <path d="M24 44 q8 8 16 0" {...s} />
          <ellipse cx="36" cy="49" rx="4" ry="4.5" fill="#f43f5e" />
        </g>
      );
    case 5:
      return <circle cx="32" cy="46" r="4" {...s} />;
    default:
      return <path d="M24 44 q8 8 16 0" {...s} />;
  }
}
