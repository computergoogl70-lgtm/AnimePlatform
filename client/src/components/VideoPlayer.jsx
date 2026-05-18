import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export function VideoPlayer({
  src,
  type = 'hls', // 'hls', 'mp4', 'embed', 'iframe', 'external'
  subtitles = [],
  poster,
  onTime,
  initialTime = 0,
  onEnded,
  onError,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryUI, setShowRetryUI] = useState(false);

  // Auto-detect if raw URL is an iframe/embed even if type isn't set explicitly
  const isEmbed =
    type === 'embed' ||
    type === 'iframe' ||
    type === 'external' ||
    (src &&
      (!src.includes('.m3u8') && !src.includes('.mp4') && !src.includes('/api/proxy/')));

  const handleRetry = () => {
    console.log('[UniversalPlayer] User clicked retry playback...');
    setError('');
    setShowRetryUI(false);
    setReady(false);
    setRetryCount((c) => c + 1);
  };

  useEffect(() => {
    if (isEmbed || !src) {
      setReady(true);
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    console.log(`[UniversalPlayer] Initializing native player for: ${src} (type: ${type})`);
    setError('');
    setReady(false);
    setShowRetryUI(false);

    let destroyed = false;
    let stallTimer;

    const fail = (msg) => {
      console.error('[UniversalPlayer] Playback failure:', msg);
      if (!destroyed) {
        setError(msg);
        setShowRetryUI(true);
        onError?.(msg);
      }
    };

    const markReady = () => {
      if (!destroyed) {
        console.log('[UniversalPlayer] Video metadata parsed / playback ready');
        setReady(true);
      }
    };

    const attachHls = () => {
      if (destroyed) return;

      // Handle raw MP4 stream
      if (type === 'mp4' || /\.mp4/i.test(src)) {
        video.src = src;
        video.addEventListener('loadeddata', markReady, { once: true });
        return;
      }

      // Handle HLS stream using Hls.js
      if (Hls.isSupported()) {
        console.log('[UniversalPlayer] Hls.js is supported, mounting handler');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferSize: 30 * 1024 * 1024, // 30MB buffer for premium speed
          maxBufferLength: 20, // 20s forward buffering
        });
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, markReady);
        hls.on(Hls.Events.FRAG_LOADED, markReady);

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.warn('[UniversalPlayer] Fatal HLS error encountered:', data.type);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('[UniversalPlayer] Retrying network recovery...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log('[UniversalPlayer] Retrying media error recovery...');
              hls.recoverMediaError();
            } else {
              fail('Stream loading failed. The host server might be down or temporary URL expired.');
            }
          }
        });
      }
      // Fallback for native HLS (Safari / iOS)
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[UniversalPlayer] Falling back to Safari Native HLS player');
        video.src = src;
        video.addEventListener('loadeddata', markReady, { once: true });
      } else {
        // Absolute final fallback
        video.src = src;
        video.addEventListener('loadeddata', markReady, { once: true });
      }

      // Set timeout fallback in case stream takes too long
      stallTimer = window.setTimeout(() => {
        if (!destroyed && video.readyState < 2) {
          fail('Connection timed out. Click retry or try another stream provider.');
        }
      }, 15000);
    };

    attachHls();

    // Restore watch progress
    if (initialTime > 0) {
      const restoreTime = () => {
        video.currentTime = initialTime;
        video.removeEventListener('loadedmetadata', restoreTime);
      };
      video.addEventListener('loadedmetadata', restoreTime);
    }

    // Time update listener (saves progress)
    const handleTimeUpdate = () => {
      if (onTime) {
        onTime(video.currentTime, video.duration || 0);
      }
    };

    const handleVideoError = (e) => {
      fail('Playback failed. This stream source cannot be played directly.');
    };

    const handleVideoEnded = () => {
      if (onEnded) onEnded();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      destroyed = true;
      clearTimeout(stallTimer);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('ended', handleVideoEnded);

      if (hlsRef.current) {
        console.log('[UniversalPlayer] Unmounting Hls.js instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setReady(false);
    };
  }, [src, type, isEmbed, initialTime, retryCount]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl ring-1 ring-white/10">
      {/* 1. Iframe Embed Player Mode */}
      {isEmbed && src && (
        <iframe
          src={src}
          className="absolute inset-0 h-full w-full rounded-2xl border-0 bg-black shadow-inner"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
          title="Episode Stream Player"
        />
      )}

      {/* 2. Direct Video Streaming Mode */}
      {!isEmbed && !error && src && (
        <video
          ref={videoRef}
          className="h-full w-full rounded-2xl object-contain"
          poster={poster}
          controls
          playsInline
        />
      )}

      {/* 3. Spinner Loading Overlay */}
      {!ready && !error && src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent shadow-lg" />
          <p className="text-xs font-semibold tracking-wider text-zinc-400 animate-pulse uppercase">
            Resolving stream segment...
          </p>
        </div>
      )}

      {/* 4. Styled Modern Dark Playback Error Screen */}
      {(error || !src) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-950/50 ring-2 ring-red-500/30">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {!src ? 'No video URL configured' : 'Playback error occurred'}
          </h3>
          <p className="max-w-md text-xs text-zinc-400 mb-6 leading-relaxed">
            {error || 'This episode does not have a stream source configured. Please configure a stream link.'}
          </p>
          {showRetryUI && src && (
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 hover:bg-red-500"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18"
                />
              </svg>
              Retry Playback
            </button>
          )}
        </div>
      )}
    </div>
  );
}
