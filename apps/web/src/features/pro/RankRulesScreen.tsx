'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/cr/Icon';
import './pro.css';

/** The full rule book for ranks, stars, points, streaks and the Ghaul. Everywhere else shows one short line and a link here. */
export function RankRulesScreen() {
  const router = useRouter();
  return (
    <main className="cr-screen cr-levels cr-rules">
      <header className="cr-hd">
        <button aria-label="Back" className="cr-icon-btn" onClick={() => router.back()} type="button"><Icon name="back" /></button>
        <div className="cr-hd__grow"><h1 className="cr-hd__t">Rank rule book</h1><p className="cr-hd__sub">Everything about ranks, stars and streaks.</p></div>
      </header>

      <section>
        <h2>The ladder</h2>
        <p>There are five phases and twenty ranks: <b>Lapo Baby</b> (Novice, Amateur, Regular, Professional), <b>Nepo Baby</b> (Young Master, High Chief, Senator), <b>Legendary</b> (Sensei, Shifu, Doctore, Paragon), <b>Awakening</b> (Awakening, Sage, Great Sage, Deity) and <b>The Divine</b> (Immortal, God, True God, Ancient God, and one last rank that stays hidden until someone reaches it). Everyone can see the ladder. <Link href="/levels">Open it</Link></p>
      </section>

      <section>
        <h2>Stars</h2>
        <p>Every rank has one big star and five small stars. Each time you earn enough points a small star fills. When all five are full, the big star fills, you move up to the next rank and we celebrate with you. Your rank is private: only you can see it.</p>
      </section>

      <section>
        <h2>How you earn points</h2>
        <ul>
          <li><b>Posts:</b> 5 points each. Up to 5 posts a day count.</li>
          <li><b>Comments you write:</b> 2 points each. Up to 20 a day count.</li>
          <li><b>Likes and comments you get from other people:</b> the first 10 on a post count in full. After that they count a little less each time, so one viral post cannot carry you to the top.</li>
          <li><b>Daily streak:</b> 2 points for each day of your current streak, up to 30 days.</li>
          <li><b>Invites:</b> 20 points for each friend who joins from your invite link (up to 25 friends).</li>
          <li><b>Good reports:</b> 5 points each time a moderator confirms a report you made (up to 20).</li>
          <li><b>Strikes:</b> a confirmed rule violation takes 50 points away. This is the only way your rank goes down.</li>
        </ul>
        <p>Guests earn too, from Anonymous posts, comments and daily visits. Sign in to keep your rank on every phone.</p>
      </section>

      <section id="streak">
        <h2>Daily streak</h2>
        <p>Open Common Room on consecutive days to build a streak. It earns points (2 a day, up to 30 days). Miss a whole day and it starts again. Your rank never drops because of a broken streak. You just stop gaining streak points until you build it again.</p>
      </section>

      <section id="chat-streaks">
        <h2>Chat streaks</h2>
        <p>In a private conversation, a streak counts the days in a row that both of you send a message. It shows after 3 days, with a pet: a <b>Ghaul egg</b>, a <b>Baby Ghaul</b> at 7 days, a <b>Young Ghaul</b> at 14, a <b>Fighter Ghaul</b> at 30 and an <b>Unbeatable Ghaul</b> at 60. After 6 pm an hourglass warns you if today is not done yet. Miss a day and the streak and the pet start over.</p>
      </section>

      <section>
        <h2>Pro</h2>
        <p>Pro members earn double points until the end of Doctore. After that points count normally.</p>
      </section>

      <section id="climb">
        <h2>Climbing with money</h2>
        <p>You can pay to move up exactly one star. The price and the exact points are shown before you pay and nothing is random. You can climb up to 5 times a day, you must be 18 or older, and you need an account. Points you buy are never counted as earned, so they never count toward the Hall of Fame.</p>
      </section>

      <section>
        <h2>Fair play</h2>
        <p>Rule-breaking leads to strikes, and each confirmed strike takes 50 points away.</p>
      </section>
    </main>
  );
}
