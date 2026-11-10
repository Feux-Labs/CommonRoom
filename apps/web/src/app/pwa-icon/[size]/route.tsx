import { ImageResponse } from 'next/og';

const ALLOWED = new Set([192, 512]);

/** The app icon (three dots on the brand gradient), drawn on demand at 192 or 512 pixels. */
export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const size = Number((await context.params).size);
  if (!ALLOWED.has(size)) return new Response('Not found', { status: 404 });
  const dot = Math.round(size * 0.12);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Math.round(size * 0.05), background: 'linear-gradient(135deg, #1f4fb8, #6a3fcf)' }}>
        <div style={{ width: dot, height: dot, borderRadius: dot, background: '#ffffff' }} />
        <div style={{ width: dot, height: dot, borderRadius: dot, background: 'rgba(255,255,255,0.6)' }} />
        <div style={{ width: dot, height: dot, borderRadius: dot, background: 'rgba(255,255,255,0.32)' }} />
      </div>
    ),
    { width: size, height: size },
  );
}
