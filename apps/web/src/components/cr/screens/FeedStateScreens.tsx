"use client";

import React, { useState } from "react";
import { Frame } from "@/components/cr";

export function ScreenRoomFeedLoading() {
  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Room</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="skc">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <i className="sk" style={{ width: 28, height: 28, borderRadius: "50%" }}></i>
          <i className="sk" style={{ width: 90, height: 10 }}></i>
        </div>
        <i className="sk" style={{ width: "100%", height: 10, marginTop: 10 }}></i>
        <i className="sk" style={{ width: "70%", height: 10, marginTop: 6 }}></i>
        <i className="sk" style={{ width: "100%", height: 110, borderRadius: 14, marginTop: 10 }}></i>
      </div>
      <div className="skc">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <i className="sk" style={{ width: 28, height: 28, borderRadius: "50%" }}></i>
          <i className="sk" style={{ width: 90, height: 10 }}></i>
        </div>
        <i className="sk" style={{ width: "100%", height: 10, marginTop: 10 }}></i>
        <i className="sk" style={{ width: "70%", height: 10, marginTop: 6 }}></i>
        <i className="sk" style={{ width: "100%", height: 110, borderRadius: 14, marginTop: 10 }}></i>
      </div>
    </Frame>
  );
}

export function ScreenRoomFeedEmpty({ onPickInterests, onFindPeople }: { onPickInterests?: () => void; onFindPeople?: () => void }) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Room</span>
        <span style={{ width: 20 }}></span>
      </div>

      {activeAction && (
        <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          {activeAction}
        </div>
      )}

      <div className="emp">
        <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <svg className="i"><use href="#user" /></svg>
        </div>
        <p className="ttl">Nothing here yet</p>
        <p className="sub" style={{ margin: "4px 0 14px" }}>Follow people or pick interests to fill your feed.</p>
        <div className="mid">
          <span
            className="ghost l"
            onClick={() => {
              setActiveAction("Opening interest picker...");
              setTimeout(() => setActiveAction(null), 1500);
              onPickInterests?.();
            }}
            style={{ cursor: "pointer" }}
          >
            Pick interests
          </span>
          <span
            className="pbtn l"
            onClick={() => {
              setActiveAction("Opening suggested people...");
              setTimeout(() => setActiveAction(null), 1500);
              onFindPeople?.();
            }}
            style={{ cursor: "pointer" }}
          >
            Find people
          </span>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenFeedCouldntLoad({ onRetry }: { onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setLoaded(true);
      onRetry?.();
    }, 900);
  };

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Room</span>
        <span style={{ width: 20 }}></span>
      </div>

      {loaded ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ background: "#1a7f37", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, marginBottom: 12, textAlign: "center" }}>
            ✓ Connection restored!
          </div>
          <div className="cm">
            <div className="a36 s">D</div>
            <div>
              <span className="n">Daniel K.</span>
              <div>Library desk space available on 2nd floor east wing.</div>
              <div className="m">14 likes · 2 comments</div>
            </div>
          </div>
          <div className="cm" style={{ marginTop: 10 }}>
            <div className="a36 s">M</div>
            <div>
              <span className="n">Mary Okoye</span>
              <div>Anyone selling administrative law textbook?</div>
              <div className="m">9 likes · 5 comments</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="emp">
          <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <svg className="i"><use href="#warn" /></svg>
          </div>
          <p className="ttl">Couldn’t load your feed</p>
          <p className="sub" style={{ margin: "4px 0 14px" }}>Check your connection and try again.</p>
          <span
            className={`pbtn l ${retrying ? "off" : ""}`}
            onClick={handleRetry}
            style={{ cursor: retrying ? "default" : "pointer" }}
          >
            {retrying ? "Retrying..." : "Try again"}
          </span>
        </div>
      )}
    </Frame>
  );
}

export function ScreenAnonymousFeedLoadMoreFailed({ onRetry }: { onRetry?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([
    { id: 1, text: "Anyone else nervous about the exam?", likes: 12, comments: 4 },
    { id: 2, text: "Best quiet spot on campus?", likes: 8, comments: 9 },
  ]);

  const handleRetry = () => {
    setLoading(true);
    setTimeout(() => {
      setPosts([
        ...posts,
        { id: 3, text: "The new cafeteria pasta is actually decent today.", likes: 15, comments: 3 },
        { id: 4, text: "Free design workshop in room B2 at 4 PM!", likes: 21, comments: 7 },
      ]);
      setLoading(false);
      onRetry?.();
    }, 700);
  };

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Anonymous</span>
        <span style={{ width: 20 }}></span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 420 }}>
        {posts.map((p) => (
          <div key={p.id} className="cm">
            <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
            <div>
              {p.text}
              <div className="m">{p.likes} likes · {p.comments} comments</div>
            </div>
          </div>
        ))}
      </div>

      <div className="c" style={{ marginTop: "auto" }}>
        {posts.length > 2 ? (
          <p className="cnt" style={{ margin: "8px 0" }}>✓ Loaded 2 more posts</p>
        ) : (
          <>
            <p className="cnt" style={{ margin: "0 0 8px" }}>Couldn’t load more posts.</p>
            <span
              className="ghost l"
              onClick={handleRetry}
              style={{ cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Loading..." : "Try again"}
            </span>
          </>
        )}
      </div>
    </Frame>
  );
}

export function ScreenAnonymousFeedEndOfFeed() {
  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Anonymous</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="cm">
        <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
        <div>
          Best quiet spot on campus?
          <div className="m">8 likes · 9 comments</div>
        </div>
      </div>
      <div className="cm" style={{ marginTop: 8 }}>
        <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
        <div>
          First post from the group
          <div className="m">3 likes · 0 comments</div>
        </div>
      </div>
      <p className="cnt c" style={{ marginTop: "auto", paddingBottom: 10 }}>You’re all caught up</p>
    </Frame>
  );
}

export function ScreenAnonymousFeedEmpty({ onPost }: { onPost?: () => void }) {
  const [showComposer, setShowComposer] = useState(false);
  const [anonText, setAnonText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!anonText.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setShowComposer(false);
      onPost?.();
    }, 1000);
  };

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Anonymous</span>
        <span style={{ width: 20 }}></span>
      </div>

      {showComposer ? (
        <div style={{ marginTop: 10 }}>
          <p className="ttl" style={{ fontSize: 14 }}>Post anonymously</p>
          <textarea
            placeholder="What's on your mind? Nobody will know it's you..."
            value={anonText}
            onChange={(e) => setAnonText(e.target.value)}
            className="in"
            style={{ width: "100%", height: 100, border: "1px solid #d4d4d4", borderRadius: 12, padding: "8px 10px", marginTop: 8, resize: "none", fontFamily: "inherit" }}
          />
          {submitted ? (
            <div style={{ background: "#1a7f37", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, marginTop: 8, textAlign: "center" }}>
              ✓ Posted to Anonymous room!
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <span className="ghost l" onClick={() => setShowComposer(false)} style={{ cursor: "pointer" }}>Cancel</span>
              <span className="pbtn l" onClick={handleSubmit} style={{ cursor: "pointer" }}>Post</span>
            </div>
          )}
        </div>
      ) : (
        <div className="emp">
          <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <svg className="i"><use href="#anon" /></svg>
          </div>
          <p className="ttl">No posts yet</p>
          <p className="sub" style={{ margin: "4px 0 14px" }}>Be the first to post. Nobody will know it’s you.</p>
          <span className="pbtn l" onClick={() => setShowComposer(true)} style={{ cursor: "pointer" }}>Post anonymously</span>
        </div>
      )}
    </Frame>
  );
}

export function ScreenInboxEmpty({ onShareLink }: { onShareLink?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText("commonroom.app/m/k7x2q9");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShareLink?.();
  };

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Inbox</span>
        <span style={{ width: 20 }}></span>
      </div>

      {copied && (
        <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          ✓ Anonymous link copied to clipboard!
        </div>
      )}

      <div className="emp">
        <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <svg className="i"><use href="#send" /></svg>
        </div>
        <p className="ttl">No messages yet</p>
        <p className="sub" style={{ margin: "4px 0 14px" }}>Share your link to start getting anonymous messages.</p>
        <span className="pbtn l" onClick={handleShare} style={{ cursor: "pointer" }}>
          {copied ? "Link Copied!" : "Share my link"}
        </span>
      </div>
    </Frame>
  );
}

export function ScreenMarketLoading() {
  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Market</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="sch" style={{ marginBottom: 10 }}>
        <svg className="i"><use href="#srch" /></svg>Search Market
      </div>
      <div className="g2">
        <div>
          <i className="sk" style={{ display: "block", height: 112, borderRadius: 16 }}></i>
          <i className="sk" style={{ display: "block", width: "80%", height: 10, marginTop: 8 }}></i>
          <i className="sk" style={{ display: "block", width: "40%", height: 10, marginTop: 6 }}></i>
        </div>
        <div>
          <i className="sk" style={{ display: "block", height: 112, borderRadius: 16 }}></i>
          <i className="sk" style={{ display: "block", width: "80%", height: 10, marginTop: 8 }}></i>
          <i className="sk" style={{ display: "block", width: "40%", height: 10, marginTop: 6 }}></i>
        </div>
        <div>
          <i className="sk" style={{ display: "block", height: 112, borderRadius: 16 }}></i>
          <i className="sk" style={{ display: "block", width: "80%", height: 10, marginTop: 8 }}></i>
          <i className="sk" style={{ display: "block", width: "40%", height: 10, marginTop: 6 }}></i>
        </div>
        <div>
          <i className="sk" style={{ display: "block", height: 112, borderRadius: 16 }}></i>
          <i className="sk" style={{ display: "block", width: "80%", height: 10, marginTop: 8 }}></i>
          <i className="sk" style={{ display: "block", width: "40%", height: 10, marginTop: 6 }}></i>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenOffline({ onRetry }: { onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);
  const [restored, setRestored] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      setRestored(true);
      onRetry?.();
    }, 700);
  };

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Room</span>
        <span style={{ width: 20 }}></span>
      </div>

      <div
        className="banner"
        style={{
          background: restored ? "#1a7f37" : "#f3f3f3",
          color: restored ? "#fff" : "#0b0b0b",
          transition: "all 0.3s ease",
        }}
      >
        {restored ? "✓ Connection restored. Updating feed..." : "You’re offline. Showing what you saw last."}
      </div>

      <div className="skc">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <i className="sk" style={{ width: 28, height: 28, borderRadius: "50%" }}></i>
          <i className="sk" style={{ width: 90, height: 10 }}></i>
        </div>
        <i className="sk" style={{ width: "100%", height: 10, marginTop: 10 }}></i>
        <i className="sk" style={{ width: "70%", height: 10, marginTop: 6 }}></i>
        <i className="sk" style={{ width: "100%", height: 110, borderRadius: 14, marginTop: 10 }}></i>
      </div>

      <div className="c" style={{ marginTop: "auto" }}>
        <span
          className="ghost"
          onClick={handleRetry}
          style={{ cursor: "pointer", opacity: retrying ? 0.6 : 1 }}
        >
          {retrying ? "Checking connection..." : restored ? "Connected" : "Retry"}
        </span>
      </div>
    </Frame>
  );
}

export function ScreenWordPuzzleEntry({ onPlay, onBack }: { onPlay?: () => void; onBack?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [guess, setGuess] = useState("");
  const targetWord = "CAMPUS";
  const [message, setMessage] = useState<string | null>(null);

  const handleGuessSubmit = () => {
    if (guess.toUpperCase() === targetWord) {
      setMessage("🎉 Correct! You solved today's puzzle.");
    } else {
      setMessage(`Not quite! Today's hint: A place of higher learning.`);
    }
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Games</span>
        <span style={{ width: 20 }}></span>
      </div>

      {playing ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Daily Word Puzzle</span>
            <span className="ghost" onClick={() => setPlaying(false)} style={{ height: 24, padding: "0 8px", fontSize: 11, cursor: "pointer" }}>Exit</span>
          </div>
          <p className="note" style={{ margin: "6px 0 12px" }}>Guess the 6-letter campus word</p>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: 38,
                  height: 44,
                  border: "1.5px solid #0b0b0b",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 600,
                  background: guess[i] ? "#0b0b0b" : "#fff",
                  color: guess[i] ? "#fff" : "#0b0b0b",
                }}
              >
                {guess[i]?.toUpperCase() || ""}
              </div>
            ))}
          </div>

          <input
            type="text"
            maxLength={6}
            placeholder="Type your guess"
            value={guess}
            onChange={(e) => setGuess(e.target.value.toUpperCase())}
            style={{ width: "100%", height: 38, textAlign: "center", letterSpacing: 3, fontWeight: 600, border: "1px solid #d4d4d4", borderRadius: 8 }}
          />

          {message && (
            <div style={{ fontSize: 12, marginTop: 8, textAlign: "center", fontWeight: 500, color: message.startsWith("🎉") ? "#1a7f37" : "#b3261e" }}>
              {message}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span className="pbtn l" onClick={handleGuessSubmit} style={{ cursor: "pointer" }}>Check word</span>
          </div>
        </div>
      ) : (
        <>
          <div className="pv" style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
            <div className="sq" style={{ margin: 0, background: "#0b0b0b", color: "#fff" }}>W</div>
            <div style={{ flex: 1 }}>
              <div className="ttl">Word Puzzle</div>
              <div className="cnt">Solve today’s puzzle</div>
            </div>
            <span
              className="pbtn"
              onClick={() => {
                setPlaying(true);
                onPlay?.();
              }}
              style={{ cursor: "pointer" }}
            >
              Play
            </span>
          </div>
          <label>Coming soon</label>
          <div className="lr" style={{ color: "#8a8a8a" }}>
            <span>Trivia</span>
            <span className="chip" style={{ padding: "2px 9px", fontSize: 11 }}>Soon</span>
          </div>
          <div className="lr" style={{ color: "#8a8a8a" }}>
            <span>Truth or Dare</span>
            <span className="chip" style={{ padding: "2px 9px", fontSize: 11 }}>Soon</span>
          </div>
          <div className="lr" style={{ color: "#8a8a8a" }}>
            <span>School Life</span>
            <span className="chip" style={{ padding: "2px 9px", fontSize: 11 }}>Soon</span>
          </div>
        </>
      )}
    </Frame>
  );
}

export function FeedStateScreensGallery() {
  const screens = [
    { title: "68. Room feed, loading", component: <ScreenRoomFeedLoading /> },
    { title: "69. Room feed, empty", component: <ScreenRoomFeedEmpty /> },
    { title: "70. Feed, couldn't load", component: <ScreenFeedCouldntLoad /> },
    { title: "71. Anonymous feed, load more failed", component: <ScreenAnonymousFeedLoadMoreFailed /> },
    { title: "72. Anonymous feed, end of feed", component: <ScreenAnonymousFeedEndOfFeed /> },
    { title: "73. Anonymous feed, empty", component: <ScreenAnonymousFeedEmpty /> },
    { title: "74. Inbox, empty", component: <ScreenInboxEmpty /> },
    { title: "75. Market, loading", component: <ScreenMarketLoading /> },
    { title: "76. Offline", component: <ScreenOffline /> },
    { title: "77. Word Puzzle entry", component: <ScreenWordPuzzleEntry /> },
  ];

  return (
    <div className="grid">
      {screens.map((s, idx) => (
        <div key={idx} className="cell">
          <p className="cap">{s.title}</p>
          {s.component}
        </div>
      ))}
    </div>
  );
}
