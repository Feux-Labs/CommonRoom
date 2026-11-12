'use client';

import { ProfileHero } from '@/features/pro/ProfileHero';
import { ThemeToggle } from './ThemeToggle';

/** The profile of someone using Common Room as a guest: clearly marked Anonymous, with their rank and character and no sign-in popup. */
export function GuestProfile({ requireAccount }: { requireAccount: () => void }) {
  return (
    <main className="cr-screen cr-screen--flush cr-profile">
      <header className="cr-hd cr-pad"><span className="cr-hd__t">Anonymous</span><span className="cr-hd__actions"><ThemeToggle /></span></header>
      <section className="cr-pad">
        <ProfileHero guest name="Anonymous guest" />
        <p className="cr-profile__sub">Nobody can see who you are. Sign in whenever you like to keep your rank, streak and messages on any phone.</p>
        <div className="cr-btnrow">
          <button className="cr-ghost cr-ghost--l" onClick={requireAccount} type="button">Sign in or create an account</button>
        </div>
      </section>
    </main>
  );
}
