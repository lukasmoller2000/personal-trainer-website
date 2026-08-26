"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteVideo({
  src,
  poster,
  className,
  videoClassName,
  controls = false,
  startAt = 0,
  playOnClick = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  videoClassName?: string;
  controls?: boolean;
  startAt?: number;
  playOnClick?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const mediaSrc = startAt > 0 ? `${src}#t=${startAt}` : src;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.playsInline = true;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMediaError = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setPlaying(false);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onMediaError);

    if (playOnClick) {
      video.pause();
      setPlaying(false);
    } else {
      video.muted = true;
      video.defaultMuted = true;
      const tryPlay = () => {
        video.muted = true;
        void video.play().catch(() => setPlaying(false));
      };
      tryPlay();
      video.addEventListener("canplay", tryPlay);
      video.addEventListener("loadeddata", tryPlay);
      return () => {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("error", onMediaError);
        video.removeEventListener("canplay", tryPlay);
        video.removeEventListener("loadeddata", tryPlay);
      };
    }

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onMediaError);
    };
  }, [mediaSrc, playOnClick]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;

    if (video.paused) {
      if (playOnClick) video.muted = false;
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  };

  return (
    <div className={cn("relative overflow-hidden bg-ink", className)}>
      <video
        ref={ref}
        src={mediaSrc}
        className={cn("h-full w-full object-cover", videoClassName)}
        autoPlay={!playOnClick}
        muted={!playOnClick}
        loop
        playsInline
        preload="metadata"
        controls={controls && playing}
        poster={poster}
        onError={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPlaying(false);
        }}
      />
      {playOnClick && (
        <button
          type="button"
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center",
            playing ? "bg-transparent" : "bg-ink/25",
            playing && controls && "pointer-events-none"
          )}
          onClick={toggle}
          onMouseEnter={() => setShowPause(true)}
          onMouseLeave={() => setShowPause(false)}
          aria-label={playing ? "Pause video" : "Afspil video"}
        >
          {(!playing || showPause) && (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-sm transition-transform duration-200 hover:scale-[1.04] hover:border-sage hover:bg-sage hover:text-ink">
              {playing ? (
                <Pause className="h-8 w-8 fill-current" />
              ) : (
                <Play className="ml-1 h-8 w-8 fill-current" />
              )}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
