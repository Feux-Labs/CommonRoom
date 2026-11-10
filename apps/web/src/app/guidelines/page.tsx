import type { Metadata } from 'next';
import { LegalPage } from '@/features/legal/LegalPage';

export const metadata: Metadata = { title: 'Community Guidelines · Common Room' };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community Guidelines" updated="10 November 2026">
      <p>Common Room is for students to talk, ask, sell and share. Being anonymous is a way to be honest, not a way to hurt people.</p>
      <h2>Not allowed</h2>
      <ul>
        <li><b>Harassment and bullying.</b> No targeting, threats, or ganging up on a person.</li>
        <li><b>Hate.</b> No attacks on people for their tribe, religion, gender, sexuality, disability or school.</li>
        <li><b>Sexual content involving anyone under 18</b>, and sexual content shared without consent. These are reported to the authorities.</li>
        <li><b>Sharing private information.</b> No phone numbers, home addresses, email addresses, or photos of people without their consent. Anonymous posts can’t include phone numbers, emails or links.</li>
        <li><b>Scams, fake listings and impersonation.</b> Don’t pretend to be someone else or sell things you don’t have.</li>
        <li><b>Violence, self-harm encouragement and illegal goods.</b></li>
        <li><b>Spam</b> and anything that tricks people into leaving the app.</li>
      </ul>
      <h2>What happens when rules are broken</h2>
      <p>Content may be removed. Accounts get strikes: the first strike pauses posting for 3 days, the second for 7 days, and the third is a ban. Every pause or ban ends on its own after at most 7 days, and repeat breaks continue up the ladder. Serious cases (child safety, credible threats) can lead to a permanent block and a report to the authorities.</p>
      <h2>Reporting and blocking</h2>
      <p>Every post, comment, message and listing has a report option. Reports are reviewed by people. You can also block anyone who bothers you.</p>
      <h2>If you are in danger</h2>
      <p>Common Room can’t send help. If you or someone you know is in immediate danger, call the Nigeria emergency number 112 or go to the nearest hospital or police station.</p>
    </LegalPage>
  );
}
