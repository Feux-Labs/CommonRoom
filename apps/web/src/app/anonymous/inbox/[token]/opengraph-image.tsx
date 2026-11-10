import { ImageResponse } from 'next/og';

export const alt = 'Send an anonymous message';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Preview shown when someone's message link is pasted into WhatsApp, X, Facebook or Telegram.
 * It never shows the link owner's name, so invalid, paused and valid links look identical.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b0b0b', color: '#fff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 38 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 20, background: '#fff' }} />
            <div style={{ width: 20, height: 20, borderRadius: 20, background: '#8a8a8a' }} />
            <div style={{ width: 20, height: 20, borderRadius: 20, background: '#4a4a4a' }} />
          </div>
          common room
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', fontSize: 84, lineHeight: 1.1 }}>Send me an anonymous message</div>
          <div style={{ display: 'flex', fontSize: 40, color: '#cfcfcf' }}>No account needed. I won’t see who you are.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
