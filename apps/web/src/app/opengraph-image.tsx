import { ImageResponse } from 'next/og';

export const alt = 'Common Room: say what you can’t say anywhere else, to your own campus.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default link preview for every page that doesn't have its own. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #1f4fb8, #6a3fcf)', color: '#fff', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 38 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 20, background: '#fff' }} />
            <div style={{ width: 20, height: 20, borderRadius: 20, background: 'rgba(255,255,255,0.55)' }} />
            <div style={{ width: 20, height: 20, borderRadius: 20, background: 'rgba(255,255,255,0.3)' }} />
          </div>
          common room
        </div>
        <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.15, maxWidth: 980 }}>
          Say what you can’t say anywhere else, to your own campus.
        </div>
      </div>
    ),
    { ...size },
  );
}
