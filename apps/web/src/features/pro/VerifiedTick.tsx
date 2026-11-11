'use client';

import './pro.css';

/** The blue tick Pro members get next to their name: a verified, paying member. */
export function VerifiedTick({ size = 18 }: { size?: number }) {
  return (
    <svg aria-label="Verified Pro member" className="cr-tick" height={size} role="img" viewBox="0 0 24 24" width={size}>
      <title>Verified Pro member</title>
      <path d="M12 1.5l2.7 1.9 3.3-.1 1 3.2 2.7 1.9-1 3.1 1 3.1-2.7 1.9-1 3.2-3.3-.1L12 22.5l-2.7-1.9-3.3.1-1-3.2-2.7-1.9 1-3.1-1-3.1 2.7-1.9 1-3.2 3.3.1z" fill="#1d9bf0" />
      <path d="M7.8 12.4l3 3 5.4-6" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}
