'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Home,
  PlusSquare,
  MessageCircle,
  ShoppingCart,
  Users,
  Gamepad2,
  User,
  ShieldCheck,
  ExternalLink,
  Wifi,
  WifiOff,
  ArrowRight,
  Layers,
  Sparkles,
  Share2,
  Mail,
  Search,
} from 'lucide-react';
import { isBackendDisconnected, setBackendDisconnected } from '@/lib/supabase-browser';

type PageRoute = {
  title: string;
  href: string;
  description: string;
  category: 'Social' | 'Commerce' | 'Anonymous' | 'Admin & Links';
  icon: any;
  badge?: string;
  pillColor: string;
};

const PAGES: PageRoute[] = [
  // Social & Community
  {
    title: 'Room Feed (Campus Home)',
    href: '/?tab=home',
    description: 'The main campus feed with student stories, photos, videos, campus polls, and community discussions.',
    category: 'Social',
    icon: Home,
    badge: 'Main Feed',
    pillColor: '#3b82f6',
  },
  {
    title: 'Create Post Composer',
    href: '/?tab=create',
    description: 'Create multi-photo reels, video clips, campus polls, and anonymous text cards with audio tracks.',
    category: 'Social',
    icon: PlusSquare,
    badge: 'Composer',
    pillColor: '#8b5cf6',
  },
  {
    title: 'Connect / Student Meet',
    href: '/?tab=meet',
    description: 'Campus dating and friend discovery deck with vibes, student cards, mutual matches, and 1-on-1 direct chat.',
    category: 'Social',
    icon: Users,
    badge: 'Dating & Friends',
    pillColor: '#ec4899',
  },
  {
    title: 'Campus Games & Daily Puzzle',
    href: '/?tab=games',
    description: 'Daily campus word puzzle, streak tracking, trivia rounds, and Truth or Dare challenges.',
    category: 'Social',
    icon: Gamepad2,
    badge: 'Interactive',
    pillColor: '#10b981',
  },
  {
    title: 'My Profile & Account',
    href: '/?tab=profile',
    description: 'Student profile details: university selector, faculty, course of study, level, bio, and campus interests.',
    category: 'Social',
    icon: User,
    badge: 'Profile',
    pillColor: '#6366f1',
  },

  // Anonymous Space
  {
    title: 'Anonymous Campus Space',
    href: '/anonymous',
    description: 'Confessions, secret crushes, and campus talk with styled gradient text cards and anonymous replies.',
    category: 'Anonymous',
    icon: MessageCircle,
    badge: 'Private & Anon',
    pillColor: '#06b6d4',
  },
  {
    title: 'Anonymous Post Thread',
    href: '/anonymous/posts/demo-anon-deadline',
    description: 'Dedicated view for an anonymous post thread with comments, reply threads, and reactions.',
    category: 'Anonymous',
    icon: Sparkles,
    badge: 'Single Thread',
    pillColor: '#0284c7',
  },
  {
    title: 'Anonymous Inbox Link (AMA)',
    href: '/anonymous/inbox/demo-confession-link',
    description: 'Custom link page for receiving anonymous confessions, questions, and feedback from classmates.',
    category: 'Anonymous',
    icon: Mail,
    badge: 'Inbox Prompt',
    pillColor: '#a855f7',
  },

  // Commerce
  {
    title: 'Campus Marketplace',
    href: '/marketplace',
    description: 'Buy and sell textbooks, laptops, phones, hostel gear, and student essentials safely within your campus.',
    category: 'Commerce',
    icon: ShoppingCart,
    badge: 'Trade & Sell',
    pillColor: '#f59e0b',
  },
  {
    title: 'Marketplace Listing Detail',
    href: '/marketplace/market-listing-1',
    description: 'Product detail view with photo gallery, seller details, condition rating, campus location, and safety guide.',
    category: 'Commerce',
    icon: Search,
    badge: 'Listing View',
    pillColor: '#d97706',
  },

  // Admin & Utility Links
  {
    title: '77-Screen Monochrome Showcase',
    href: '/screens',
    description: 'Complete 77-screen monochrome suite ported directly from common-room-auth (4).html with dynamic state, live percentages, search, chats, and toggles.',
    category: 'Admin & Links',
    icon: Layers,
    badge: '77 Screens · Interactive',
    pillColor: '#ffffff',
  },
  {
    title: 'Admin Operations Console',
    href: '/admin',
    description: 'Campus management console: platform metrics, user directory, content moderation queue, and system broadcasts.',
    category: 'Admin & Links',
    icon: ShieldCheck,
    badge: 'Admin Only',
    pillColor: '#ef4444',
  },
  {
    title: 'Shared Room Post',
    href: '/posts/demo-room-joyce',
    description: 'Deep link to a specific shared Room post with focused comments and author preview.',
    category: 'Admin & Links',
    icon: Share2,
    badge: 'Deep Link',
    pillColor: '#8b5cf6',
  },
  {
    title: 'Games Standalone Preview',
    href: '/games-preview',
    description: 'Standalone preview page for campus retention games and daily puzzles.',
    category: 'Admin & Links',
    icon: Gamepad2,
    badge: 'Preview Mode',
    pillColor: '#14b8a6',
  },
  {
    title: 'Campus Invite Referral',
    href: '/invite/WELCOME2026',
    description: 'Friend referral and invitation landing page for welcoming new campus members.',
    category: 'Admin & Links',
    icon: Users,
    badge: 'Invite Landing',
    pillColor: '#3b82f6',
  },
];

export default function NavigationPage() {
  const [disconnected, setDisconnected] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    setDisconnected(isBackendDisconnected());
  }, []);

  const toggleBackend = () => {
    const next = !disconnected;
    setDisconnected(next);
    setBackendDisconnected(next);
  };

  const categories = ['All', 'Social', 'Anonymous', 'Commerce', 'Admin & Links'];

  const filteredPages = PAGES.filter((page) => {
    const matchesCat = selectedCategory === 'All' || page.category === selectedCategory;
    const matchesSearch =
      search.trim() === '' ||
      page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.description.toLowerCase().includes(search.toLowerCase()) ||
      page.href.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '32px 20px 80px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Top Header */}
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            paddingBottom: 24,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              }}
            >
              <Compass size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Commonroom Page Directory
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                Navigate and view all pages without signing in
              </p>
            </div>
          </div>

          {/* Backend Status & Disconnect Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleBackend}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: disconnected
                  ? '1px solid rgba(245, 158, 11, 0.5)'
                  : '1px solid rgba(16, 185, 129, 0.5)',
                background: disconnected
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(16, 185, 129, 0.12)',
                color: disconnected ? '#fbbf24' : '#34d399',
              }}
              title="Click to toggle between live backend and disconnected offline mode"
            >
              {disconnected ? <WifiOff size={16} /> : <Wifi size={16} />}
              <span>
                {disconnected ? 'Backend: Disconnected (Offline Demo)' : 'Backend: Connected'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: disconnected ? '#b45309' : '#059669',
                  color: '#fff',
                }}
              >
                Switch
              </span>
            </button>

            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#1e293b',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Home size={15} />
              <span>Enter App</span>
            </Link>
          </div>
        </header>

        {/* 77 Screens Monochrome Showcase Feature Banner */}
        <Link
          href="/screens"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #111827, #1f2937)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            textDecoration: 'none',
            color: '#fff',
            transition: 'transform 0.15s ease, border-color 0.15s ease',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: '#fff',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              77
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  77-Screen Monochrome Design Suite
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    background: '#10b981',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontWeight: 600,
                  }}
                >
                  NEW · Dynamic State
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                Ported directly from common-room-auth (4).html. All 8 phases: Auth, Core Actions, Web Links, Market, Profile, Discovery, Web Admin, and Feed States.
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <span>Open Showcase</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* Notice Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(88, 28, 135, 0.35))',
            border: '1px solid rgba(96, 165, 250, 0.2)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              marginTop: 2,
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: '#e0f2fe' }}>
              Instant Guest & Disconnected Browsing
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              All views have been configured to open smoothly without authentication gates. You can explore the feed, create preview posts, view marketplace listings, inspect student dating cards, and test the admin dashboard using rich offline demo data.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                type="button"
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border:
                    selectedCategory === cat
                      ? '1px solid #3b82f6'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                  background: selectedCategory === cat ? '#3b82f6' : '#131b2e',
                  color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              placeholder="Filter pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px 8px 36px',
                background: '#131b2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Page Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {filteredPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  borderRadius: 14,
                  background: '#131b2e',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${page.pillColor}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: page.pillColor,
                      }}
                    >
                      <Icon size={19} />
                    </div>

                    {page.badge ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 9999,
                          background: `${page.pillColor}1f`,
                          color: page.pillColor,
                          border: `1px solid ${page.pillColor}33`,
                        }}
                      >
                        {page.badge}
                      </span>
                    ) : null}
                  </div>

                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      margin: '0 0 6px',
                      color: '#f8fafc',
                    }}
                  >
                    {page.title}
                  </h3>

                  <p
                    style={{
                      fontSize: 13,
                      color: '#94a3b8',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {page.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 18,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <code
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {page.href}
                  </code>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#38bdf8',
                    }}
                  >
                    Open <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

