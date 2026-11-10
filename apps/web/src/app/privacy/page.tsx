import type { Metadata } from 'next';
import { LegalPage } from '@/features/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy · Common Room' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="10 November 2026">
      <p>This explains what Common Room collects and why. We handle personal data in line with the Nigeria Data Protection Act 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Account:</b> email, password (stored hashed), name, username, school, course and year, interests, and the profile photo you choose.</li>
        <li><b>Content:</b> posts, comments, messages, listings and the photos and videos you upload. Photos are re-encoded in your browser, which removes location and camera data before upload.</li>
        <li><b>Activity:</b> likes, follows, reports, blocks and basic usage so the app can work and be kept safe.</li>
        <li><b>Technical:</b> device and browser type and IP address, used for security and abuse prevention.</li>
      </ul>
      <h2>Why we use it</h2>
      <p>To run your account, show you content, keep the community safe, enforce the rules, and improve the app. We don’t sell your personal data.</p>
      <h2>Anonymous posts</h2>
      <p>Other users never see who wrote an anonymous post. Our systems keep a protected link between the post and the account so we can act on abuse. It is not shown in the app and is not readable by other users.</p>
      <h2>Who we share it with</h2>
      <p>Service providers that run the app for us (database and sign-in hosting, file storage and email delivery), and the authorities when the law requires it. Your public profile and posts are visible to other users as you choose.</p>
      <h2>Automatic safety checks</h2>
      <p>The words, photos and videos you post (including comments and marketplace messages) are automatically checked for explicit, graphic or abusive content by an AI service (Google Gemini). Only what you post is sent, and only for this check. While we use its free plan, Google may use what it receives to improve its products. The check never removes or hides anything: if something looks like it breaks our rules, it is flagged for a person to review and you may get a warning. Only a person can remove content or give a strike.</p>
      <h2>How long we keep it</h2>
      <p>Until you delete your account. Deleting your account removes your profile, posts, comments, messages, listings and uploaded files. Copies kept for a short time on content delivery networks expire on their own, within hours.</p>
      <h2>Your rights</h2>
      <p>You can see and edit your profile in the app, delete your account in Settings, and ask us to access or correct your data using the contact below.</p>
      <h2>Children</h2>
      <p>Common Room is for adults (18+). If you believe a child is using it, tell us and we will remove the account.</p>
    </LegalPage>
  );
}
