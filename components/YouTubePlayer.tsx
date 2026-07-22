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

// WAV silencieux généré à la volée (masque les métadonnées YouTube
// dans les contrôles média du système — best effort selon navigateur)
function silentWavUrl(seconds = 2): string {
  const rate = 8000;
  const n = rate * seconds;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function maskMediaSession(audio: HTMLAudioElement | null) {
  if (!audio || !('mediaSession' in navigator)) return;
  audio.play().catch(() => {});
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Musique mystère 🎵',
      artist: 'BlindTest-Mbeat',
    });
    for (const a of ['play', 'pause', 'nexttrack', 'previoustrack'] as const) {
      navigator.mediaSession.setActionHandler(a, () => {});
    }
  } catch {}
}

interface Props {
  videoId: string;
  paused?: boolean;
}

export function YouTubePlayer({ videoId, paused = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(paused);
  const [volume, setVolume] = useState(70);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  pausedRef.current = paused;

  useEffect(() => {
    const audio = new Audio(silentWavUrl());
    audio.loop = true;
    audio.volume = 0.01;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

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
            timers.push(setTimeout(checkBlocked, 800));
            timers.push(setTimeout(checkBlocked, 2000));
            timers.push(setTimeout(checkBlocked, 4000));
          },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setBlocked(false);
              // Reprend le focus média après le démarrage de YouTube
              timers.push(setTimeout(() => maskMediaSession(audioRef.current), 400));
            }
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
    playerRef.current?.setVolume?.(volume);
    playerRef.current?.playVideo?.();
    maskMediaSession(audioRef.current);
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
