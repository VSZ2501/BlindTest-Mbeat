'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  startedAt: string;
  duration: number;
  onExpire?: () => void;
}

export function Timer({ startedAt, duration, onExpire }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const r = Math.max(0, duration - elapsed);
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startedAt, duration, onExpire]);

  const pct = (remaining / duration) * 100;
  const urgent = remaining <= 10;

  return (
    <div className="w-full">
      <div className={`mb-1 text-center font-mono text-3xl tabular-nums ${urgent ? 'text-red-400' : 'text-cyan-300'}`}>
        {Math.ceil(remaining)}s
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${urgent ? 'bg-red-500' : 'bg-cyan-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
