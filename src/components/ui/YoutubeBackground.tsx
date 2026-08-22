import { cn } from "@/lib/utils";

const YOUTUBE_SHORT_ID = "faadsdhPfgc";

export function YoutubeBackground({
  className,
  title = "Transformation",
}: {
  className?: string;
  title?: string;
}) {
  const src = `https://www.youtube.com/embed/${YOUTUBE_SHORT_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_SHORT_ID}&controls=0&rel=0&playsinline=1&modestbranding=1&disablekb=1&fs=0&iv_load_policy=3`;

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)}>
      <iframe
        src={src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-[9/16] h-[185%] min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
      />
    </div>
  );
}

export function YoutubeEmbed({
  className,
  title = "Transformation",
}: {
  className?: string;
  title?: string;
}) {
  const src = `https://www.youtube.com/embed/${YOUTUBE_SHORT_ID}?rel=0&playsinline=1&modestbranding=1`;

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden bg-ink",
        className
      )}
    >
      <iframe
        src={src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
