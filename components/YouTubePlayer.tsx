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
  const [volume, setVolume] = useState(70);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;
    setReady(false);
    loadYouTubeAPI().then(() => {
      if (destroyed || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1 },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(volume);
            e.target.playVideo();
            setReady(true);
            setTimeout(() => {
              if (e.target.getPlayerState?.() !== window.YT.PlayerState.PLAYING) setBlocked(true);
            }, 1500);
          },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) setBlocked(false);
          },
        },
      });
    });
    return () => {
      destroyed = true;
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

  return (
    <div className="flex items-center gap-3">
      <div className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0">
        <div ref={containerRef} />
      </div>
      {blocked ? (
        <button
          onClick={() => playerRef.current?.playVideo?.()}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          ▶ Activer le son
        </button>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
