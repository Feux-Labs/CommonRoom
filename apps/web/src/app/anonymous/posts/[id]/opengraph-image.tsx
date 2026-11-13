import { ImageResponse } from 'next/og';
import { excerpt, loadPostPreview } from '@/lib/post-preview';

export const alt = 'An Anonymous post on Common Room';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GRADIENTS = {
  'blue-hour': ['#1f4fb8', '#6a3fcf'],
  'soft-sky': ['#0e7f93', '#3a5fcf'],
  'warm-glow': ['#b8530f', '#b32d5b'],
  'rose-note': ['#c2306c', '#7340c4'],
} as const;

/**
 * The picture shown when an Anonymous post link is pasted into WhatsApp, X, Facebook or Telegram: the person's own words in the card,
 * with their photo behind them when the post has one. It never shows who wrote it.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await loadPostPreview(id);
  const text = post ? excerpt(post.body, post.photo ? 160 : 260) : 'Say it anonymously.';
  const [from, to] = GRADIENTS[post?.theme ?? 'blue-hour'];
  const fontSize = text.length > 180 ? 44 : text.length > 110 ? 54 : text.length > 60 ? 64 : 76;

  const W = 1200;
  const H = 630;
  const PAD = 64;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: `linear-gradient(135deg, ${from}, ${to})`, color: '#fff' }}>
        {post?.photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered into an image, not a page */}
            <img alt="" height={H} src={post.photo} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }} width={W} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.82) 100%)' }} />
          </>
        ) : null}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: PAD }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, height: 40 }}>
            <div style={{ display: 'flex', gap: 9 }}>
              <div style={{ width: 18, height: 18, borderRadius: 18, background: '#fff' }} />
              <div style={{ width: 18, height: 18, borderRadius: 18, background: 'rgba(255,255,255,0.55)' }} />
              <div style={{ width: 18, height: 18, borderRadius: 18, background: 'rgba(255,255,255,0.3)' }} />
            </div>
            common room
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: W - PAD * 2, justifyContent: post?.photo ? 'flex-end' : 'center', height: 340 }}>
            <div style={{ display: 'flex', width: W - PAD * 2, fontSize, lineHeight: 1.2, fontWeight: 600 }}>{text}</div>
            {post?.hasVideo && !post.photo ? <div style={{ display: 'flex', fontSize: 28, opacity: 0.85, marginTop: 18 }}>▶ Video</div> : null}
          </div>
          <div style={{ display: 'flex', fontSize: 28, opacity: 0.85, height: 36 }}>Anonymous · Read and reply on Common Room</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
