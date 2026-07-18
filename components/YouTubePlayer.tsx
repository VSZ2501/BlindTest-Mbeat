'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}

interface Props {
  videoId: string;
  paused?: boolean;
}

export function YouTubePlayer({ videoId, paused = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const pausedRef = useRef(paused);
  const [volume, setVolume] = useState(70);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  pausedRef.current = paused;

  useEffect(() => {
    let destroyed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setReady(false);
    setBlocked(false);

    loadYouTubeAPI().then(() => {
      if (destroyed || !containerRef.current) return;

      const checkBlocked = () => {
        if (destroyed || pausedRef.current) return;
        const s = playerRef.current?.getPlayerState?.();
        const YT = window.YT;
        if (s !== YT.PlayerState.PLAYING && s !== YT.PlayerState.BUFFERING) {
          setBlocked(true);
        }
      };

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1 },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(volume);
            e.target.playVideo();
            setReady(true);
            // Détection multi-passes : mobile bloque souvent au-delà de 1,5s
            timers.push(setTimeout(checkBlocked, 800));
            timers.push(setTimeout(checkBlocked, 2000));
            timers.push(setTimeout(checkBlocked, 4000));
          },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) setBlocked(false);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      timers.forEach(clearTimeout);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    if (paused) playerRef.current?.pauseVideo?.();
    else playerRef.current?.playVideo?.();
  }, [paused, ready]);

  useEffect(() => {
    playerRef.current?.setVolume?.(volume);
  }, [volume]);

  const unlock = () => {
    // Geste utilisateur : débloque l'audio pour toute la suite de la partie
    playerRef.current?.setVolume?.(volume);
    playerRef.current?.playVideo?.();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0">
        <div ref={containerRef} />
      </div>
      {blocked ? (
        <button
          onClick={unlock}
          className="animate-pulse rounded-xl bg-cyan-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-500"
        >
          🔊 Appuie pour activer le son
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span aria-hidden className={paused ? 'text-zinc-500' : 'animate-pulse text-cyan-400'}>
            {paused ? '⏸' : '♪'}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-32 accent-cyan-500"
            aria-label="Volume"
          />
        </div>
      )}
    </div>
  );
}
