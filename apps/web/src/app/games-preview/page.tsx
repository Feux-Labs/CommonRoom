import { notFound } from 'next/navigation';
import { GamesExperience } from '@/components/GamesExperience';

export default function GamesPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main className="app-shell games-app-shell">
      <section className="workspace">
        <div className="content-scroll">
          <GamesExperience preview />
        </div>
      </section>
    </main>
  );
}
