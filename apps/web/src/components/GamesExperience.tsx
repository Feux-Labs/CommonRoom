'use client';

import { useEffect, useState } from 'react';
import { PuzzleRetentionExperience } from '@/components/PuzzleRetentionExperience';

type Game = {
  title: string;
  description: string;
  players: string;
  tone: 'purple' | 'blue' | 'rose';
  image: string;
  badge: string;
};

type RecentGame = Pick<Game, 'title' | 'tone' | 'image'> & { played: string };
const games: Game[] = [
  {
    title: 'Trivia',
    description: 'Win bragging rights with campus facts, random knowledge and quickfire rounds.',
    players: '12.4K playing',
    tone: 'purple',
    image: '/games/campus-trivia.jpg',
    badge: 'Live now',
  },
  {
    title: 'School Life',
    description: 'Build friendships, find your campus rhythm, and make your own school-life choices.',
    players: '9.1K playing',
    tone: 'rose',
    image: '/games/life-after-school.jpg',
    badge: 'Coming soon',
  },
  {
    title: 'Puzzle',
    description: 'Find the hidden words, stretch your vocabulary and chase today’s streak.',
    players: '8.7K playing',
    tone: 'blue',
    image: '/games/daily-word-puzzle.jpg',
    badge: 'Streak',
  },
  {
    title: 'Truth or Dare',
    description: 'Pick a side, answer honestly, and make game night unforgettable.',
    players: '6.3K playing',
    tone: 'rose',
    image: '/games/truth-or-dare.jpg',
    badge: 'PLAY NOW',
  },
];

const initialRecentGames: RecentGame[] = [
  { title: 'Trivia', played: '2h ago', tone: 'purple', image: '/games/campus-trivia.jpg' },
  { title: 'School Life', played: '4h ago', tone: 'rose', image: '/games/life-after-school.jpg' },
  { title: 'Puzzle', played: '6h ago', tone: 'blue', image: '/games/daily-word-puzzle.jpg' },
  { title: 'Truth or Dare', played: '8h ago', tone: 'rose', image: '/games/truth-or-dare.jpg' },
];

export function GamesExperience({
  accessToken,
  playerId,
  playerName,
  preview = false,
}: {
  accessToken?: string;
  playerId?: string;
  playerName?: string;
  preview?: boolean;
}) {
  const [recentGames, setRecentGames] = useState(initialRecentGames);
  const [dialog, setDialog] = useState<{ title: string; body: string } | null>(null);
  const [puzzleLaunch, setPuzzleLaunch] = useState(0);

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [dialog]);

  const recordGamePlayed = (title: string) => {
    const game = games.find((item) => item.title === title);
    if (!game || game.title === 'School Life') return;
    setRecentGames((current) => [
      { title: game.title, played: 'Just now', tone: game.tone, image: game.image },
      ...current.filter((item) => item.title !== title),
    ].slice(0, 4));
  };

  const openGame = (title: string) => {
    if (title === 'School Life') return;
    recordGamePlayed(title);
    if (title === 'Puzzle') {
      setPuzzleLaunch((current) => current + 1);
      return;
    }
    setDialog({ title, body: 'This game’s playable rounds are coming soon.' });
  };

  return (
    <section className="games-page" aria-label="Games hub">
      <div className="games-hero">
        <div className="games-hero-copy">
          <span className="games-kicker">THE CAMPUS ARCADE</span>
          <h1>Games <span>Hub</span></h1>
          <p>Quick rounds, big decisions, and bragging rights. Pick your next campus escape.</p>
          <button
            className="games-explore"
            onClick={() => setDialog({
              title: 'School Life — Coming Soon',
              body: 'The School Life game is still in development. Its existing implementation and saved character choice remain untouched while this web entry is marked Coming Soon.',
            })}
          >
            Explore School Life
          </button>
        </div>
        <div className="games-hero-badge" aria-hidden="true">
          <span>MAKE</span>
          <strong>YOUR MOVE</strong>
        </div>
      </div>

      <div className="games-section-heading">
        <h2>Featured Games</h2>
        <span>4 PICKS</span>
      </div>
      <div className="games-grid">
        {games.map((game) => {
          const isSchoolLife = game.title === 'School Life';
          return (
            <button
              aria-label={`${game.title}. ${game.description}${isSchoolLife ? ' Coming soon.' : ''}`}
              className={`game-card game-card-${game.tone}${isSchoolLife ? ' game-card-coming' : ''}`}
              disabled={isSchoolLife}
              key={game.title}
              onClick={() => openGame(game.title)}
              style={{ backgroundImage: `linear-gradient(180deg, rgba(8,7,14,.1), rgba(8,7,14,.82)), url("${game.image}")` }}
              type="button"
            >
              <span className="game-card-badge">{game.badge}</span>
              {game.title === 'Trivia' ? (
                <span className="game-card-title game-card-trivia">Trivia</span>
              ) : game.title !== 'Truth or Dare' ? (
                <span className="game-card-title">{game.title}</span>
              ) : null}
              {game.title !== 'Trivia' && game.title !== 'Truth or Dare' ? (
                <span className="game-card-description">{game.description}</span>
              ) : null}
              {game.title === 'Truth or Dare' ? <span className="game-card-title">Truth or Dare</span> : null}
              <span className="game-card-players">{game.players} <small>· sample</small></span>
              {isSchoolLife ? <span className="game-coming-label">COMING SOON</span> : null}
            </button>
          );
        })}
      </div>

      <div className="games-section-heading games-recent-heading">
        <h2>Recently Played</h2>
        <span>YOUR RECENT GAMES</span>
      </div>
      <div className="games-recent-list">
        {recentGames.map((game) => {
          const isSchoolLife = game.title === 'School Life';
          return (
            <button
              aria-label={`${game.title}. Last played ${game.played}.${isSchoolLife ? ' Coming soon.' : ''}`}
              className={`game-recent-card game-card-${game.tone}${isSchoolLife ? ' game-card-coming' : ''}`}
              disabled={isSchoolLife}
              key={game.title}
              onClick={() => openGame(game.title)}
              style={{ backgroundImage: `linear-gradient(180deg, rgba(8,7,14,.08), rgba(8,7,14,.78)), url("${game.image}")` }}
              type="button"
            >
              <strong>{game.title}</strong>
              <span>Last played {game.played}</span>
              {isSchoolLife ? <small>COMING SOON</small> : null}
            </button>
          );
        })}
      </div>

      <PuzzleRetentionExperience
        accessToken={accessToken}
        playerId={playerId}
        playerName={playerName}
        preview={preview}
        launchRequest={puzzleLaunch}
      />

      {dialog ? (
        <div className="games-overlay" onClick={() => setDialog(null)}>
          <section
            aria-labelledby="games-dialog-title"
            aria-modal="true"
            className="games-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2 id="games-dialog-title">{dialog.title}</h2>
            <p>{dialog.body}</p>
            <button className="games-dialog-close" onClick={() => setDialog(null)} type="button">Got it</button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
