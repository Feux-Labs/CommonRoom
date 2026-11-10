'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Feed video that costs nothing until it matters:
 * - nothing is downloaded until the video is about a screen away;
 * - the first frame shows as the poster (`#t=0.1`), so no separate thumbnail file is needed;
 * - it pauses when scrolled away, and starting one video pauses any other.
 */
export function FeedVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === 'undefined') {
      // No observer support: load normally instead of leaving a blank box.
      const fallback = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(fallback);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        else video.pause();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const onPlay = () => {
    document.querySelectorAll<HTMLVideoElement>('video[data-feed-video]').forEach((other) => {
      if (other !== ref.current) other.pause();
    });
  };

  return (
    <video
      className={className}
      controls
      data-feed-video=""
      onPlay={onPlay}
      playsInline
      preload={near ? 'metadata' : 'none'}
      ref={ref}
      src={near ? `${src}#t=0.1` : undefined}
    />
  );
}
