'use client';

/** Last-resort page if the whole app fails to render. It has to bring its own <html> and <body>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#161a3a', display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Common Room is having trouble</h1>
          <p style={{ margin: '0 0 20px', opacity: 0.75 }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ border: 0, borderRadius: 999, padding: '12px 22px', fontSize: 16, color: '#fff', background: '#3a47c4', cursor: 'pointer' }} type="button">Try again</button>
        </div>
      </body>
    </html>
  );
}
