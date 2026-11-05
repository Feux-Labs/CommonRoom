"use client";

import React, { useState } from "react";
import { Frame } from "@/components/cr";

export function ScreenSearchStart({
  onBack,
  onSearch,
}: {
  onBack?: () => void;
  onSearch?: (query: string, tab: "Room" | "Market") => void;
}) {
  const [tab, setTab] = useState<"Room" | "Market">("Room");
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(["study tips", "hostel party", "@danielk"]);
  const trending = ["#exams", "#freshers", "#campuslife", "#wordpuzzle"];

  const handleRemoveRecent = (item: string) => {
    setRecents((prev) => prev.filter((r) => r !== item));
  };

  const handleClearAll = () => {
    setRecents([]);
  };

  const handleSelectQuery = (text: string) => {
    setQuery(text);
    onSearch?.(text, tab);
  };

  return (
    <Frame>
      <div className="hd" style={{ gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="sch" style={{ flex: 1, color: query ? "#0b0b0b" : "#8a8a8a" }}>
          <svg className="i"><use href="#srch" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch?.(query, tab)}
            placeholder={`Search ${tab}`}
            style={{ border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit", flex: 1 }}
          />
          {query && (
            <svg
              className="i"
              onClick={() => setQuery("")}
              style={{ cursor: "pointer" }}
            >
              <use href="#x" />
            </svg>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        <span className={tab === "Room" ? "a" : ""} onClick={() => setTab("Room")} style={{ cursor: "pointer" }}>Room</span>
        <span className={tab === "Market" ? "a" : ""} onClick={() => setTab("Market")} style={{ cursor: "pointer" }}>Market</span>
      </div>

      <div className="sp" style={{ margin: "12px 0 2px" }}>
        <span className="sh">Recent ({recents.length})</span>
        {recents.length > 0 && (
          <span className="lnk" onClick={handleClearAll} style={{ cursor: "pointer" }}>Clear all</span>
        )}
      </div>

      {recents.length === 0 ? (
        <p className="cnt" style={{ padding: "10px 0" }}>No recent searches</p>
      ) : (
        recents.map((item) => (
          <div key={item} className="lr" style={{ padding: "10px 2px" }}>
            <span
              onClick={() => handleSelectQuery(item)}
              style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", flex: 1 }}
            >
              <svg className="i"><use href="#clk" /></svg>{item}
            </span>
            <svg
              className="i"
              onClick={() => handleRemoveRecent(item)}
              style={{ cursor: "pointer" }}
            >
              <use href="#x" />
            </svg>
          </div>
        ))
      )}

      <div className="sh" style={{ margin: "14px 0 8px" }}>Trending</div>
      <div className="chips">
        {trending.map((tag) => (
          <span
            key={tag}
            className="chip"
            onClick={() => handleSelectQuery(tag)}
            style={{ cursor: "pointer" }}
          >
            {tag}
          </span>
        ))}
      </div>
    </Frame>
  );
}

export function ScreenSearchResultsRoom({
  initialQuery = "study tips",
  onBack,
  onTabChange,
}: {
  initialQuery?: string;
  onBack?: () => void;
  onTabChange?: (tab: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeChip, setActiveChip] = useState("Top");
  const [isFollowing, setIsFollowing] = useState(true);
  const [posts, setPosts] = useState([
    {
      id: "1",
      author: "Amaka O.",
      avatar: "A",
      time: "2h",
      text: "Three ways I revise in the library without getting distracted.",
      likes: 48,
      comments: 9,
      isLiked: false,
    },
    {
      id: "2",
      author: "Daniel K.",
      avatar: "D",
      time: "2h",
      text: "Past questions are underrated. Start with the last 3 years.",
      likes: 31,
      comments: 6,
      isLiked: false,
    },
  ]);

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  return (
    <Frame>
      <div className="hd" style={{ gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="sch" style={{ flex: 1, color: "#0b0b0b" }}>
          <svg className="i"><use href="#srch" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit", flex: 1 }}
          />
          {query && (
            <svg className="i" onClick={() => setQuery("")} style={{ cursor: "pointer" }}><use href="#x" /></svg>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        <span className="a">Room</span>
        <span onClick={() => onTabChange?.("Market")} style={{ cursor: "pointer" }}>Market</span>
      </div>

      <div className="cat">
        {["Top", "People", "Posts", "Tags"].map((c) => (
          <span
            key={c}
            className={`chip ${activeChip === c ? "on" : ""}`}
            onClick={() => setActiveChip(c)}
            style={{ cursor: "pointer" }}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="ch">
        <div className="a36 s">T</div>
        <div style={{ flex: 1 }}>
          <div className="n">Tolu A.</div>
          <div className="s">@tolua · Study tips every week</div>
        </div>
        <span
          className="ghost"
          onClick={() => setIsFollowing(!isFollowing)}
          style={{ cursor: "pointer", background: isFollowing ? "#efefef" : "#fff" }}
        >
          {isFollowing ? "Following" : "Follow"}
        </span>
      </div>

      {posts.map((p) => (
        <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="a36 s">{p.avatar}</div>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{p.author}</span>
            <span className="cnt">· {p.time}</span>
          </div>
          <p className="ds" style={{ margin: "6px 0 4px" }}>{p.text}</p>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "#6b6b6b" }}>
            <span
              onClick={() => toggleLike(p.id)}
              style={{ cursor: "pointer", color: p.isLiked ? "#b3261e" : "inherit" }}
            >
              {p.likes} likes {p.isLiked && "♥"}
            </span>
            <span>{p.comments} comments</span>
          </div>
        </div>
      ))}
    </Frame>
  );
}

export function ScreenSearchResultsMarket({
  initialQuery = "calculator",
  onBack,
  onTabChange,
}: {
  initialQuery?: string;
  onBack?: () => void;
  onTabChange?: (tab: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [items] = useState([
    { id: "1", title: "Casio FX-991EX calculator", price: "₦18,000", loc: "Block C · 2h ago", icon: "calc" },
    { id: "2", title: "Scientific calculator", price: "₦9,500", loc: "Hostel A · Yesterday", icon: "calc" },
    { id: "3", title: "Calculus textbook", price: "₦6,000", loc: "Main library · 2 days ago", icon: "book" },
    { id: "4", title: "Casio FX-82 calculator", price: "₦7,000", loc: "Faculty gate · 3 days ago", icon: "calc" },
  ]);

  const filtered = items.filter((it) => it.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <Frame>
      <div className="hd" style={{ gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="sch" style={{ flex: 1, color: "#0b0b0b" }}>
          <svg className="i"><use href="#srch" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit", flex: 1 }}
          />
          {query && (
            <svg className="i" onClick={() => setQuery("")} style={{ cursor: "pointer" }}><use href="#x" /></svg>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        <span onClick={() => onTabChange?.("Room")} style={{ cursor: "pointer" }}>Room</span>
        <span className="a">Market</span>
      </div>

      <div className="sp" style={{ margin: "4px 0 10px" }}>
        <span className="cnt">{filtered.length} results</span>
        <span className="ghost" style={{ height: 30, cursor: "pointer" }}>
          <svg className="i"><use href="#chv" /></svg>Filters · Newest
        </span>
      </div>

      <div className="g2">
        {filtered.map((it) => (
          <div key={it.id} className="li">
            <div className="tile"><svg className="i"><use href={`#${it.icon}`} /></svg></div>
            <div className="n">{it.title}</div>
            <div className="p">{it.price}</div>
            <div className="mm">{it.loc}</div>
          </div>
        ))}
      </div>

      <div className="c cnt" style={{ marginTop: 12 }}>Loading more...</div>
    </Frame>
  );
}

export function ScreenSearchNoResultsRoom({
  initialQuery = "zzxq",
  onBack,
  onSearchMarket,
}: {
  initialQuery?: string;
  onBack?: () => void;
  onSearchMarket?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);

  return (
    <Frame>
      <div className="hd" style={{ gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="sch" style={{ flex: 1, color: "#0b0b0b" }}>
          <svg className="i"><use href="#srch" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit", flex: 1 }}
          />
          {query && (
            <svg className="i" onClick={() => setQuery("")} style={{ cursor: "pointer" }}><use href="#x" /></svg>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        <span className="a">Room</span>
        <span onClick={onSearchMarket} style={{ cursor: "pointer" }}>Market</span>
      </div>

      <div className="emp">
        <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <svg className="i"><use href="#srch" /></svg>
        </div>
        <p className="ttl">No results for “{query}”</p>
        <p className="sub" style={{ margin: "4px 0 14px" }}>Check the spelling or try a different word.</p>
        <div className="mid">
          <span className="ghost l" onClick={onSearchMarket} style={{ cursor: "pointer" }}>Search Market</span>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenNotificationsList() {
  const [category, setCategory] = useState("All");
  const [notifications, setNotifications] = useState([
    { id: "1", type: "Mentions", icon: "heart", text: "Amaka O. and 4 others liked your post", time: "2m", unread: true },
    { id: "2", type: "Mentions", icon: "user", text: "Tolu A. started following you", time: "1h", unread: true },
    { id: "3", type: "Inbox", icon: "anon", text: "You have a new anonymous message", sub: "Only you can see it · 3h", time: "3h", unread: true },
    { id: "4", type: "Mentions", icon: "send", text: "Daniel K. replied to your comment", time: "Yesterday", unread: false },
    { id: "5", type: "Market", icon: "pin", text: "Your listing “Mini fridge” expires in 3 days", time: "Yesterday", action: "Renew", unread: false },
  ]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const filtered = category === "All" ? notifications : notifications.filter((n) => n.type === category);

  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Notifications</span>
        <span className="lnk" onClick={markAllRead} style={{ cursor: "pointer" }}>Mark all read</span>
      </div>

      <div className="cat">
        {["All", "Mentions", "Market", "Inbox"].map((cat) => (
          <span
            key={cat}
            className={`chip ${category === cat ? "on" : ""}`}
            onClick={() => setCategory(cat)}
            style={{ cursor: "pointer" }}
          >
            {cat}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map((n) => (
          <div
            key={n.id}
            className="ch"
            style={{
              alignItems: "flex-start",
              background: n.unread ? "#f7f7f7" : "transparent",
              margin: "0 -8px",
              padding: "11px 8px",
              borderRadius: 8,
            }}
          >
            <div className="a36 g s"><svg className="i"><use href={`#${n.icon}`} /></svg></div>
            <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4 }}>
              <div>{n.text}</div>
              {n.sub && <div className="cnt">{n.sub}</div>}
              <div className="cnt">{n.time}</div>
              {n.action && (
                <span className="lnk" style={{ display: "inline-block", marginTop: 4, cursor: "pointer" }}>
                  {n.action}
                </span>
              )}
            </div>
            {n.unread && (
              <i style={{ width: 7, height: 7, borderRadius: "50%", background: "#0b0b0b", marginTop: 6 }}></i>
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ScreenNotificationsEmpty() {
  return (
    <Frame>
      <div className="hd">
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Notifications</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="cat">
        <span className="chip on">All</span>
        <span className="chip">Mentions</span>
        <span className="chip">Market</span>
        <span className="chip">Inbox</span>
      </div>
      <div className="emp">
        <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <svg className="i"><use href="#bell" /></svg>
        </div>
        <p className="ttl">Nothing yet</p>
        <p className="sub" style={{ margin: "4px 0 14px" }}>Likes, replies and messages will show up here.</p>
        <span className="lnk" style={{ cursor: "pointer" }}>Notification settings</span>
      </div>
    </Frame>
  );
}

export function ScreenAllowNotificationsSheet({ onNotNow, onTurnOn }: { onNotNow?: () => void; onTurnOn?: () => void }) {
  const [granted, setGranted] = useState(false);

  const handleTurnOn = () => {
    setGranted(true);
    setTimeout(() => {
      onTurnOn?.();
    }, 600);
  };

  return (
    <Frame noPadding>
      <div className="dim k" style={{ margin: "-18px -20px 0", padding: "14px 20px" }}>Notifications</div>
      <div className="sheet" style={{ margin: "0 -20px -18px", padding: "14px 20px 18px" }}>
        <div className="grab"></div>
        <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "6px auto 10px" }}>
          <svg className="i"><use href="#bell" /></svg>
        </div>
        <p className="ttl c">{granted ? "Notifications enabled! ✓" : "Turn on notifications?"}</p>
        <p className="sub c" style={{ margin: "6px 0 14px" }}>
          Get told about replies, messages and anonymous messages. You can choose what you get in Settings.
        </p>
        <div className="acts" style={{ justifyContent: "center" }}>
          <span className="ghost l" onClick={onNotNow} style={{ cursor: "pointer" }}>Not now</span>
          <span className="pbtn l" onClick={handleTurnOn} style={{ cursor: "pointer" }}>
            {granted ? "Enabled ✓" : "Turn on"}
          </span>
        </div>
        <p className="note c">If you say no, you can still turn them on later in your phone settings.</p>
      </div>
    </Frame>
  );
}

export function ScreenSearchOrNotificationsFailed({ onBack, onRetry }: { onBack?: () => void; onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      onRetry?.();
    }, 800);
  };

  return (
    <Frame>
      <div className="hd" style={{ gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="sch" style={{ flex: 1, color: "#0b0b0b" }}>
          <svg className="i"><use href="#srch" /></svg>
          <span style={{ flex: 1 }}>study tips</span>
          <svg className="i" style={{ cursor: "pointer" }}><use href="#x" /></svg>
        </div>
      </div>
      <div className="tabs" style={{ marginTop: 0 }}>
        <span className="a">Room</span>
        <span>Market</span>
      </div>
      <div className="emp">
        <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <svg className="i"><use href="#warn" /></svg>
        </div>
        <p className="ttl">Couldn’t load results</p>
        <p className="sub" style={{ margin: "4px 0 14px" }}>Check your connection and try again.</p>
        <span
          className={`pbtn l ${retrying ? "off" : ""}`}
          onClick={handleRetry}
          style={{ cursor: retrying ? "default" : "pointer" }}
        >
          {retrying ? "Reconnecting..." : "Try again"}
        </span>
      </div>
    </Frame>
  );
}

export function DiscoveryScreensGallery() {
  const screens = [
    { title: "54. Search, start", component: <ScreenSearchStart /> },
    { title: "55. Search results, Room", component: <ScreenSearchResultsRoom /> },
    { title: "56. Search results, Market", component: <ScreenSearchResultsMarket /> },
    { title: "57. Search, no results (Room)", component: <ScreenSearchNoResultsRoom /> },
    { title: "58. Notifications", component: <ScreenNotificationsList /> },
    { title: "59. Notifications, empty", component: <ScreenNotificationsEmpty /> },
    { title: "60. Allow notifications", component: <ScreenAllowNotificationsSheet /> },
    { title: "61. Search or notifications failed", component: <ScreenSearchOrNotificationsFailed /> },
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
