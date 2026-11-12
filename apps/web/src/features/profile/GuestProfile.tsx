'use client';

import { Icon } from '@/components/cr/Icon';
import { LevelCard } from '@/features/pro/LevelCard';

/** The profile of someone using Common Room as a guest: clearly marked Anonymous, with their rank and streak and no sign-in popup. */
export function GuestProfile({ requireAccount }: { requireAccount: () => void }) {
  return (
    <main className="cr-screen cr-screen--flush cr-profile">
      <header className="cr-hd cr-pad"><span className="cr-hd__t">Anonymous</span></header>
      <section className="cr-pad">
        <div className="cr-profile__guest">
          <span aria-hidden="true" className="cr-icon-btn"><Icon name="user" /></span>
          <div>
            <h1 className="cr-profile__name">Anonymous guest</h1>
            <p className="cr-profile__sub">Nobody can see who you are.</p>
          </div>
        </div>
        <LevelCard />
        <p className="cr-profile__sub">Sign in whenever you like to keep your rank, streak and messages on any phone.</p>
        <div className="cr-btnrow">
          <button className="cr-ghost cr-ghost--l" onClick={requireAccount} type="button">Sign in or create an account</button>
        </div>
      </section>
    </main>
  );
}
