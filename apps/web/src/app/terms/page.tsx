import type { Metadata } from 'next';
import { LegalPage } from '@/features/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms · Common Room' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="10 November 2026">
      <p>By using Common Room you agree to these terms. If you don’t agree, please don’t use the app.</p>
      <h2>Who can use it</h2>
      <p>You must be 18 or older. We may remove accounts that we believe belong to someone under 18.</p>
      <h2>Your account</h2>
      <p>Keep your password private. You are responsible for what happens on your account. You can delete your account at any time in Settings.</p>
      <h2>Your content</h2>
      <p>You own what you post. You give Common Room permission to store, display and distribute it inside the app so the service works. You promise that you have the right to post it and that it follows the <a href="/guidelines">Community Guidelines</a>.</p>
      <h2>Anonymous posts</h2>
      <p>Other users can’t see who wrote an anonymous post. We keep an internal record of the author so we can handle abuse, and we may share it with the authorities when the law requires it. Anonymity is not permission to break the rules.</p>
      <h2>Marketplace</h2>
      <p>Common Room only connects buyers and sellers. We don’t sell the items, hold money, or guarantee any deal. Meet in public places and check items before you pay.</p>
      <h2>Rules and enforcement</h2>
      <p>We can remove content, pause, or ban accounts that break these terms or the guidelines, using the strike system described in the guidelines.</p>
      <h2>No promises</h2>
      <p>The service is provided as it is. We work to keep it running but can’t promise it will always be available or error-free. To the extent the law allows, Common Room is not liable for losses that come from using the app or from what other users post.</p>
      <h2>Changes</h2>
      <p>We may update these terms. When we make an important change we will tell you in the app.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
    </LegalPage>
  );
}
