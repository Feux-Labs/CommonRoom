'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';

type Announcement = { message: string; createdAt: string } | null;

export function CommunityAnnouncement() {
  const [announcement, setAnnouncement] = useState<Announcement>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/api/v1/admin/broadcast', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Announcement request failed with status ${response.status}.`);
        return await response.json() as { data?: { broadcast?: Announcement } };
      })
      .then((result) => {
        if (active) setAnnouncement(result.data?.broadcast ?? null);
      })
      .catch((error: unknown) => {
        console.error('The community announcement could not be loaded.', error);
      });
    return () => { active = false; };
  }, []);

  if (!announcement || dismissed) return null;
  return (
    <aside aria-label="Community announcement" className="community-announcement" role="status">
      <Megaphone size={17} />
      <p>{announcement.message}</p>
      <button aria-label="Dismiss announcement" onClick={() => setDismissed(true)} type="button"><X size={16} /></button>
    </aside>
  );
}
