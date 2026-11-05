"use client";

import React, { useState } from "react";
import { Frame } from "@/components/cr";

export function ScreenEditProfile({ onClose, onSave }: { onClose?: () => void; onSave?: () => void }) {
  const [displayName, setDisplayName] = useState("Mary Okoye");
  const [username, setUsername] = useState("maryo");
  const [bio, setBio] = useState("Law, 300L. Coffee and notes.");
  const [school, setSchool] = useState("University of Lagos (UNILAG)");
  const [hasPhoto, setHasPhoto] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onSave?.();
    }, 1200);
  };

  const isUsernameAvailable = username.length >= 3 && username.toLowerCase() !== "admin";

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        <span className="t">Edit profile</span>
        <span className="pbtn" onClick={handleSave} style={{ cursor: "pointer" }}>Save</span>
      </div>

      {savedToast && (
        <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 10, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          ✓ Profile updated successfully
        </div>
      )}

      <div className="c">
        <div
          className="av"
          style={{
            margin: "6px auto 8px",
            width: 84,
            height: 84,
            borderStyle: hasPhoto ? "solid" : "dashed",
            background: hasPhoto ? "#0b0b0b" : "#f0f0f0",
            color: hasPhoto ? "#fff" : "#8a8a8a",
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {hasPhoto ? (displayName.charAt(0) || "M") : <svg className="i" style={{ width: 28, height: 28 }}><use href="#camera" /></svg>}
        </div>
        <span
          className="lnk"
          onClick={() => setHasPhoto(true)}
          style={{ cursor: "pointer", fontWeight: 500 }}
        >
          Change photo
        </span>{" "}
        {hasPhoto && (
          <span
            className="lnk"
            onClick={() => setHasPhoto(false)}
            style={{ color: "#b3261e", marginLeft: 12, cursor: "pointer" }}
          >
            Remove
          </span>
        )}
      </div>

      <label>Display name</label>
      <input
        type="text"
        className="in v"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 12, padding: "0 12px", height: 40 }}
      />

      <label>Username</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="in v"
          value={username.startsWith("@") ? username : `@${username}`}
          onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
          style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 12, padding: "0 12px", height: 40 }}
        />
      </div>
      <p className={`msg ${isUsernameAvailable ? "ok" : "err"}`} style={{ margin: "2px 0 0" }}>
        {isUsernameAvailable ? "Available" : "Must be at least 3 characters"}
      </p>

      <label>Bio</label>
      <textarea
        className="in v"
        maxLength={150}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        style={{
          width: "100%",
          minHeight: 58,
          background: "#fff",
          border: "1px solid #d4d4d4",
          borderRadius: 12,
          padding: "10px 12px",
          resize: "none",
          fontFamily: "inherit",
          fontSize: 13,
        }}
      />
      <p className="msg" style={{ textAlign: "right", margin: "2px 0 0", color: bio.length > 140 ? "#b3261e" : "#6b6b6b" }}>
        {bio.length}/150
      </p>

      <label>School (optional)</label>
      <select
        value={school}
        onChange={(e) => setSchool(e.target.value)}
        className="in"
        style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 12, padding: "0 12px", height: 40, cursor: "pointer" }}
      >
        <option value="University of Lagos (UNILAG)">University of Lagos (UNILAG)</option>
        <option value="University of Ibadan (UI)">University of Ibadan (UI)</option>
        <option value="Obafemi Awolowo University (OAU)">Obafemi Awolowo University (OAU)</option>
        <option value="Covenant University">Covenant University</option>
        <option value="">None / Not in school</option>
      </select>
      <p className="note" style={{ margin: "4px 0 0" }}>Leave blank if you are not in school.</p>
    </Frame>
  );
}

export function ScreenOtherUserProfile({ onBack }: { onBack?: () => void }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"Posts" | "Listings" | "Badges">("Posts");
  const [msgSent, setMsgSent] = useState(false);

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t"></span>
        <svg className="i" style={{ cursor: "pointer" }}><use href="#more" /></svg>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <div className="a36" style={{ width: 60, height: 60, fontSize: 22, background: "#0b0b0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
          D
        </div>
        <div>
          <p className="ttl" style={{ fontSize: 16 }}>Daniel K.</p>
          <div className="cnt" style={{ fontSize: 12.5 }}>@danielk</div>
        </div>
      </div>

      <div style={{ margin: "8px 0" }}>
        <span className="chip on" style={{ padding: "3px 10px", fontSize: 11.5 }}>Common Chancellor</span>
      </div>

      <p className="ds" style={{ margin: 0 }}>Economics, 200L. I sell what I no longer need.</p>

      <div className="stats" style={{ margin: "12px 0 8px" }}>
        <div><b>{128 + (isFollowing ? 1 : 0)}</b>Followers</div>
        <div><b>96</b>Following</div>
        <div><b>34</b>Posts</div>
      </div>

      {msgSent && (
        <div style={{ background: "#f0f0f0", padding: "6px 10px", borderRadius: 10, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          Direct message sent to Daniel K.
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <span
          className={isFollowing ? "ghost l" : "pbtn l"}
          onClick={() => setIsFollowing(!isFollowing)}
          style={{ cursor: "pointer" }}
        >
          {isFollowing ? "Following" : "Follow"}
        </span>
        <span
          className="ghost l"
          onClick={() => {
            setMsgSent(true);
            setTimeout(() => setMsgSent(false), 2000);
          }}
          style={{ cursor: "pointer" }}
        >
          Message
        </span>
        <span className="ghost l" style={{ width: 40, padding: 0, justifyContent: "center", cursor: "pointer" }}>
          <svg className="i"><use href="#up" /></svg>
        </span>
      </div>

      <div className="tabs">
        {(["Posts", "Listings", "Badges"] as const).map((tab) => (
          <span
            key={tab}
            className={activeTab === tab ? "a" : ""}
            onClick={() => setActiveTab(tab)}
            style={{ cursor: "pointer" }}
          >
            {tab}
          </span>
        ))}
      </div>

      {activeTab === "Posts" && (
        <div className="g2" style={{ marginTop: 12 }}>
          <div className="tile" style={{ minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", borderRadius: 12, fontSize: 11, color: "#6b6b6b" }}>
            Past questions thread
          </div>
          <div className="tile d2" style={{ minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", borderRadius: 12, fontSize: 11, color: "#6b6b6b" }}>
            Campus cafe review
          </div>
        </div>
      )}

      {activeTab === "Listings" && (
        <div className="g2" style={{ marginTop: 12 }}>
          <div className="li">
            <div className="tile" style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", borderRadius: 12 }}>
              <svg className="i"><use href="#calc" /></svg>
            </div>
            <div className="n" style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>Casio Calculator</div>
            <div className="p" style={{ fontSize: 12, color: "#0b0b0b", fontWeight: 600 }}>₦18,000</div>
          </div>
        </div>
      )}

      {activeTab === "Badges" && (
        <div className="bd" style={{ marginTop: 10 }}>
          <div><b><svg className="i"><use href="#heart" /></svg></b>First like</div>
          <div><b><svg className="i"><use href="#book" /></svg></b>Helper</div>
          <div><b><svg className="i"><use href="#trophy" /></svg></b>Top creator</div>
        </div>
      )}
    </Frame>
  );
}

export function ScreenBlockUserSheet({ onCancel, onBlock }: { onCancel?: () => void; onBlock?: () => void }) {
  const [blocked, setBlocked] = useState(false);

  const handleBlock = () => {
    setBlocked(true);
    setTimeout(() => {
      onBlock?.();
    }, 1000);
  };

  return (
    <Frame noPadding>
      <div className="dim k" style={{ margin: "-18px -20px 0", padding: "14px 20px" }}>Profile</div>
      <div className="sheet" style={{ margin: "0 -20px -18px", padding: "14px 20px 18px" }}>
        <div className="grab"></div>
        <span className="sh">{blocked ? "Daniel K. blocked" : "Block Daniel K.?"}</span>
        <p className="sub" style={{ margin: "6px 0 0" }}>
          {blocked
            ? "You won't see their posts or messages. You can unblock in Settings."
            : "They won’t see your posts or be able to message you. You can unblock them in Settings."}
        </p>
        <div className="hr"></div>
        <div className="lr" style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#flag" /></svg></span>
          <div className="l1">Report user</div>
        </div>
        <div className="lr" style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#up" /></svg></span>
          <div className="l1">Share profile</div>
        </div>
        <div className="acts">
          <span className="ghost l" onClick={onCancel} style={{ cursor: "pointer" }}>
            {blocked ? "Close" : "Cancel"}
          </span>
          {!blocked && (
            <span className="pbtn l" onClick={handleBlock} style={{ background: "#b3261e", cursor: "pointer" }}>
              Block
            </span>
          )}
        </div>
      </div>
    </Frame>
  );
}

export function ScreenYourProfileListings({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<"Posts" | "Listings" | "Badges">("Listings");

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Profile</span>
        <svg className="i" style={{ cursor: "pointer" }}><use href="#cog" /></svg>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <div className="a36" style={{ width: 60, height: 60, fontSize: 22, background: "#0b0b0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
          M
        </div>
        <div>
          <p className="ttl" style={{ fontSize: 16 }}>Mary Okoye</p>
          <div className="cnt" style={{ fontSize: 12.5 }}>@maryo</div>
        </div>
      </div>

      <div style={{ margin: "8px 0" }}>
        <span className="chip on" style={{ padding: "3px 10px", fontSize: 11.5 }}>Common Man</span>
      </div>

      <p className="ds" style={{ margin: 0 }}>Law, 300L. Coffee and notes.</p>

      <div className="stats" style={{ margin: "12px 0 8px" }}>
        <div><b>128</b>Followers</div>
        <div><b>96</b>Following</div>
        <div><b>34</b>Posts</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <span className="ghost l" style={{ cursor: "pointer" }}>Edit profile</span>
        <span className="ghost l" style={{ width: 40, padding: 0, justifyContent: "center", cursor: "pointer" }}>
          <svg className="i"><use href="#up" /></svg>
        </span>
      </div>

      <div className="tabs">
        {(["Posts", "Listings", "Badges"] as const).map((t) => (
          <span key={t} className={tab === t ? "a" : ""} onClick={() => setTab(t)} style={{ cursor: "pointer" }}>
            {t}
          </span>
        ))}
      </div>

      {tab === "Listings" && (
        <div className="g2">
          <div className="li">
            <div className="tile"><svg className="i"><use href="#calc" /></svg></div>
            <div className="n">Casio FX-991EX calculator</div>
            <div className="p">₦18,000</div>
          </div>
          <div className="li">
            <div className="tile d3"><svg className="i"><use href="#lamp" /></svg><span className="tag">Sold</span></div>
            <div className="n">Hostel desk lamp</div>
            <div className="p">₦4,000</div>
          </div>
        </div>
      )}

      {tab === "Posts" && (
        <div style={{ marginTop: 10 }}>
          <div className="cm">
            <div className="a36 s">M</div>
            <div>
              <span className="n">Mary Okoye</span>
              <div>Best commercial law study groups meeting this weekend?</div>
              <div className="m">24 likes · 8 comments</div>
            </div>
          </div>
        </div>
      )}

      {tab === "Badges" && (
        <div className="bd" style={{ marginTop: 10 }}>
          <div><b><svg className="i"><use href="#heart" /></svg></b>First like</div>
          <div><b><svg className="i"><use href="#book" /></svg></b>Helper</div>
          <div className="lk"><b><svg className="i"><use href="#trophy" /></svg></b>Top creator</div>
        </div>
      )}
    </Frame>
  );
}

export function ScreenYourProfileBadges({ onBack }: { onBack?: () => void }) {
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const badges = [
    { id: "heart", name: "First like", desc: "Earned when someone likes your first post or comment.", unlocked: true },
    { id: "book", name: "Helper", desc: "Answered questions and marked helpful by community members.", unlocked: true },
    { id: "trophy", name: "Top creator", desc: "Locked. Reach top 10% in monthly room engagement.", unlocked: false },
    { id: "up", name: "Week streak", desc: "Locked. Visit and participate 7 days in a row.", unlocked: false },
    { id: "anon", name: "Trusted", desc: "Locked. Maintain a 95%+ report-free reputation.", unlocked: false },
  ];

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Profile</span>
        <svg className="i" style={{ cursor: "pointer" }}><use href="#cog" /></svg>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <div className="a36" style={{ width: 60, height: 60, fontSize: 22, background: "#0b0b0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
          M
        </div>
        <div>
          <p className="ttl" style={{ fontSize: 16 }}>Mary Okoye</p>
          <div className="cnt" style={{ fontSize: 12.5 }}>@maryo</div>
        </div>
      </div>

      <div style={{ margin: "8px 0" }}>
        <span className="chip on" style={{ padding: "3px 10px", fontSize: 11.5 }}>Common Man</span>
      </div>

      <p className="ds" style={{ margin: 0 }}>Law, 300L. Coffee and notes.</p>

      <div className="stats" style={{ margin: "12px 0 8px" }}>
        <div><b>128</b>Followers</div>
        <div><b>96</b>Following</div>
        <div><b>34</b>Posts</div>
      </div>

      <div className="tabs">
        <span>Posts</span>
        <span>Listings</span>
        <span className="a">Badges</span>
      </div>

      <div className="bd" style={{ marginTop: 10 }}>
        {badges.map((b) => (
          <div
            key={b.id}
            className={b.unlocked ? "" : "lk"}
            onClick={() => setSelectedBadge(b.name === selectedBadge ? null : b.name)}
            style={{ cursor: "pointer", background: selectedBadge === b.name ? "#eee" : undefined }}
          >
            <b><svg className="i"><use href={`#${b.id}`} /></svg></b>
            {b.name}
          </div>
        ))}
      </div>

      {selectedBadge && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#f5f5f5", borderRadius: 10, fontSize: 12 }}>
          <b>{selectedBadge}</b>: {badges.find((b) => b.name === selectedBadge)?.desc}
        </div>
      )}

      <p className="note c" style={{ marginTop: 14 }}>Tap a badge to see how to earn it.</p>
      <div className="c" style={{ marginTop: 6 }}>
        <span className="lnk" style={{ cursor: "pointer" }}>How Common status works</span>
      </div>
    </Frame>
  );
}

export function ScreenHowCommonStatusWorks({ onBack }: { onBack?: () => void }) {
  const [selectedTier, setSelectedTier] = useState<number>(0);

  const tiers = [
    { title: "Common Man", subtitle: "Where everyone starts", req: "Awarded automatically upon registration and profile verification." },
    { title: "Common Chancellor", subtitle: "Regular, helpful contributors", req: "Requires 50+ helpful replies, 10+ posts, and 500+ points in a month." },
    { title: "Common Senator", subtitle: "Voices the community trusts", req: "Requires 1,500+ points, verified peer ratings, and 90-day active standing." },
    { title: "Common President", subtitle: "Top individual contributors", req: "Reserved for top 1% community leaders with outstanding trust and helpfulness." },
  ];

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Common status</span>
        <span style={{ width: 20 }}></span>
      </div>
      <p className="sub">Your status reflects your own contributions, not your school.</p>

      {tiers.map((t, idx) => (
        <div
          key={idx}
          className="rad"
          onClick={() => setSelectedTier(idx)}
          style={{ gap: 10, cursor: "pointer", background: selectedTier === idx ? "#fafafa" : undefined }}
        >
          <div style={{ flex: 1 }}>
            {t.title}
            <div className="cnt">{t.subtitle}</div>
          </div>
          <i className={selectedTier === idx ? "on" : ""}></i>
        </div>
      ))}

      <div style={{ padding: "10px 12px", background: "#f5f5f5", borderRadius: 10, fontSize: 12, marginTop: 8 }}>
        <b>{tiers[selectedTier].title} requirement:</b>
        <div style={{ marginTop: 2, color: "#444" }}>{tiers[selectedTier].req}</div>
      </div>

      <label style={{ marginTop: 16 }}>How you earn recognition</label>
      <div className="lr"><div className="l1">Original posts people engage with</div></div>
      <div className="lr"><div className="l1">Helpful comments and replies</div></div>
      <div className="lr"><div className="l1">Showing up regularly</div></div>
      <div className="lr"><div className="l1">Word Puzzle achievements</div></div>
      <p className="note">Spam and repeated taps don’t count. Anonymous activity is never part of your status.</p>
    </Frame>
  );
}

export function ScreenLeaderboard({ onBack }: { onBack?: () => void }) {
  const [timeTab, setTimeTab] = useState<"Week" | "Month" | "All time">("Month");
  const [catFilter, setCatFilter] = useState<"Overall" | "Creators" | "Helpful">("Overall");

  const leaderboardData: Record<string, Array<{ rank: number; name: string; avatar: string; role: string; points: string }>> = {
    Week: [
      { rank: 1, name: "Amaka O.", avatar: "A", role: "Common Chancellor", points: "820" },
      { rank: 2, name: "Daniel K.", avatar: "D", role: "Common Senator", points: "790" },
      { rank: 3, name: "Emeka N.", avatar: "E", role: "Common Man", points: "650" },
      { rank: 4, name: "Tolu A.", avatar: "T", role: "Common Chancellor", points: "510" },
    ],
    Month: [
      { rank: 1, name: "Daniel K.", avatar: "D", role: "Common Senator", points: "2,410" },
      { rank: 2, name: "Amaka O.", avatar: "A", role: "Common Chancellor", points: "2,180" },
      { rank: 3, name: "Tolu A.", avatar: "T", role: "Common Chancellor", points: "1,960" },
      { rank: 4, name: "Emeka N.", avatar: "E", role: "Common Man", points: "1,740" },
    ],
    "All time": [
      { rank: 1, name: "Daniel K.", avatar: "D", role: "Common Senator", points: "14,890" },
      { rank: 2, name: "Tolu A.", avatar: "T", role: "Common President", points: "13,200" },
      { rank: 3, name: "Amaka O.", avatar: "A", role: "Common Senator", points: "11,450" },
      { rank: 4, name: "Chidi P.", avatar: "C", role: "Common Chancellor", points: "8,920" },
    ],
  };

  const currentList = leaderboardData[timeTab] || leaderboardData["Month"];

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Leaderboard</span>
        <span style={{ width: 20 }}></span>
      </div>

      <div className="tabs" style={{ marginTop: -4 }}>
        {(["Week", "Month", "All time"] as const).map((t) => (
          <span
            key={t}
            className={timeTab === t ? "a" : ""}
            onClick={() => setTimeTab(t)}
            style={{ cursor: "pointer" }}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="cat">
        {(["Overall", "Creators", "Helpful"] as const).map((c) => (
          <span
            key={c}
            className={`chip ${catFilter === c ? "on" : ""}`}
            onClick={() => setCatFilter(c)}
            style={{ cursor: "pointer" }}
          >
            {c}
          </span>
        ))}
      </div>

      {currentList.map((item) => (
        <div key={item.rank} className="lb">
          <span className="rk">{item.rank}</span>
          <div className="a36 s">{item.avatar}</div>
          <div>
            <div>{item.name}</div>
            <div className="cnt">{item.role}</div>
          </div>
          <span className="pt">{item.points}</span>
        </div>
      ))}

      <div className="lb me">
        <span className="rk">18</span>
        <div className="a36 s">Y</div>
        <div>
          <div>You</div>
          <div className="cnt">Common Man</div>
        </div>
        <span className="pt">{timeTab === "Week" ? "190" : timeTab === "Month" ? "620" : "2,140"}</span>
      </div>

      <p className="note c" style={{ marginTop: "auto" }}>Ranks people, not schools. Updated daily.</p>
    </Frame>
  );
}

export function ScreenSettingsHub({ onBack, onNavigate }: { onBack?: () => void; onNavigate?: (key: string) => void }) {
  const [navMsg, setNavMsg] = useState<string | null>(null);

  const handleNav = (key: string) => {
    if (onNavigate) {
      onNavigate(key);
    } else {
      setNavMsg(`Opening ${key}...`);
      setTimeout(() => setNavMsg(null), 1000);
    }
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Settings</span>
        <span style={{ width: 20 }}></span>
      </div>

      {navMsg && (
        <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          {navMsg}
        </div>
      )}

      <div className="lr" onClick={() => handleNav("account")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#user" /></svg></span>
        <div className="l1">Account</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" onClick={() => handleNav("privacy")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#lock" /></svg></span>
        <div className="l1">Privacy</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" onClick={() => handleNav("notifications")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#bell" /></svg></span>
        <div className="l1">Notifications</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" onClick={() => handleNav("feed")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#srch" /></svg></span>
        <div className="l1">Feed preferences</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" onClick={() => handleNav("app")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#cog" /></svg></span>
        <div className="l1">App preferences</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" onClick={() => handleNav("blocked")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#blk" /></svg></span>
        <div className="l1">Blocked users</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" onClick={() => handleNav("link")} style={{ cursor: "pointer" }}>
        <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#link" /></svg></span>
        <div className="l1">Anonymous link</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div style={{ marginTop: "auto" }}>
        <div className="lr" onClick={() => handleNav("logout")} style={{ cursor: "pointer" }}><div className="l1">Log out</div></div>
        <div className="lr dn" onClick={() => handleNav("delete")} style={{ cursor: "pointer" }}><div className="l1">Delete account</div></div>
      </div>
    </Frame>
  );
}

export function ScreenSettingsAccount({ onBack }: { onBack?: () => void }) {
  const [deviceLoggedOut, setDeviceLoggedOut] = useState(false);

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Account</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="lr">
        <div className="l1">Email<small>mary•••••@uni.edu</small></div>
        <span className="msg ok" style={{ margin: 0 }}>Verified</span>
      </div>
      <div className="lr" style={{ cursor: "pointer" }}>
        <div className="l1">Change email</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr" style={{ cursor: "pointer" }}>
        <div className="l1">Change password</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div
        className="lr"
        onClick={() => {
          setDeviceLoggedOut(true);
          setTimeout(() => setDeviceLoggedOut(false), 2000);
        }}
        style={{ cursor: "pointer" }}
      >
        <div className="l1">
          Log out of other devices
          <small>{deviceLoggedOut ? "✓ Signed out from 2 other sessions" : "You will stay signed in here"}</small>
        </div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <p className="note">Changing your email or password asks you to confirm it’s you.</p>
      <div style={{ marginTop: "auto" }}>
        <div className="lr dn" style={{ cursor: "pointer" }}>
          <div className="l1">Delete account<small>Permanently remove your account</small></div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenSettingsPrivacy({ onBack }: { onBack?: () => void }) {
  const [publicProfile, setPublicProfile] = useState(true);
  const [showSchool, setShowSchool] = useState(false);
  const [showBadges, setShowBadges] = useState(true);
  const [messagePerm, setMessagePerm] = useState<"Everyone" | "People I follow" | "No one">("Everyone");

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Privacy</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="lr" onClick={() => setPublicProfile(!publicProfile)} style={{ cursor: "pointer" }}>
        <div className="l1">Public profile<small>{publicProfile ? "Anyone can see your profile" : "Only followers can see"}</small></div>
        <span className={`tg ${publicProfile ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => setShowSchool(!showSchool)} style={{ cursor: "pointer" }}>
        <div className="l1">Show school<small>{showSchool ? "Visible on your profile" : "Hidden from profile"}</small></div>
        <span className={`tg ${showSchool ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => setShowBadges(!showBadges)} style={{ cursor: "pointer" }}>
        <div className="l1">Show badges</div>
        <span className={`tg ${showBadges ? "on" : ""}`}></span>
      </div>
      <label>Who can message me</label>
      <div className="chips">
        {(["Everyone", "People I follow", "No one"] as const).map((perm) => (
          <span
            key={perm}
            className={`chip ${messagePerm === perm ? "on" : ""}`}
            onClick={() => setMessagePerm(perm)}
            style={{ cursor: "pointer" }}
          >
            {perm}
          </span>
        ))}
      </div>
      <div className="lr" style={{ marginTop: 8, cursor: "pointer" }}>
        <div className="l1">Blocked users</div>
        <svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="pv" style={{ marginTop: "auto" }}>
        Anonymous messages and posts are never linked to your profile. Hiding your profile doesn’t stop safety teams from reviewing reports.
      </div>
    </Frame>
  );
}

export function ScreenSettingsNotifications({ onBack }: { onBack?: () => void }) {
  const [prefs, setPrefs] = useState({
    push: true,
    likes: true,
    comments: true,
    followers: false,
    inbox: true,
    market: true,
    announcements: true,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Notifications</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="lr" onClick={() => toggle("push")} style={{ cursor: "pointer" }}>
        <div className="l1">Push notifications</div>
        <span className={`tg ${prefs.push ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => toggle("likes")} style={{ cursor: "pointer" }}>
        <div className="l1">Likes</div>
        <span className={`tg ${prefs.likes ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => toggle("comments")} style={{ cursor: "pointer" }}>
        <div className="l1">Comments and replies</div>
        <span className={`tg ${prefs.comments ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => toggle("followers")} style={{ cursor: "pointer" }}>
        <div className="l1">New followers</div>
        <span className={`tg ${prefs.followers ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => toggle("inbox")} style={{ cursor: "pointer" }}>
        <div className="l1">Anonymous inbox</div>
        <span className={`tg ${prefs.inbox ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => toggle("market")} style={{ cursor: "pointer" }}>
        <div className="l1">Market messages</div>
        <span className={`tg ${prefs.market ? "on" : ""}`}></span>
      </div>
      <div className="lr" onClick={() => toggle("announcements")} style={{ cursor: "pointer" }}>
        <div className="l1">Announcements</div>
        <span className={`tg ${prefs.announcements ? "on" : ""}`}></span>
      </div>
      <p className="note">Turned-off categories won’t send push or in-app alerts.</p>
    </Frame>
  );
}

export function ScreenSettingsFeedPreferences({ onBack }: { onBack?: () => void }) {
  const initialInterests = ["Campus life", "Music", "Tech", "Study tips"];
  const allInterests = ["Campus life", "Music", "Comedy", "Sports", "Tech", "Study tips", "Fashion", "Gaming"];
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests);
  const [resetMsg, setResetMsg] = useState(false);

  const toggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(selectedInterests.filter((t) => t !== tag));
    } else {
      setSelectedInterests([...selectedInterests, tag]);
    }
  };

  const handleReset = () => {
    setSelectedInterests(initialInterests);
    setResetMsg(true);
    setTimeout(() => setResetMsg(false), 1500);
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Feed preferences</span>
        <span style={{ width: 20 }}></span>
      </div>
      <label style={{ marginTop: 0 }}>Your interests ({selectedInterests.length} selected)</label>
      <div className="chips">
        {allInterests.map((interest) => (
          <span
            key={interest}
            className={`chip ${selectedInterests.includes(interest) ? "on" : ""}`}
            onClick={() => toggleInterest(interest)}
            style={{ cursor: "pointer" }}
          >
            {interest}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="lr" style={{ cursor: "pointer" }}>
          <div className="l1">Not interested<small>Posts and topics you hid</small></div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" style={{ cursor: "pointer" }}>
          <div className="l1">School<small>Optional</small></div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
      </div>
      <div style={{ marginTop: "auto" }}>
        {resetMsg && (
          <div style={{ fontSize: 12, textAlign: "center", marginBottom: 6, color: "#1a7f37" }}>
            ✓ Recommendations reset to defaults
          </div>
        )}
        <span className="ghost l" onClick={handleReset} style={{ cursor: "pointer" }}>
          Reset recommendations
        </span>
      </div>
    </Frame>
  );
}

export function ScreenSettingsAppPreferences({ onBack }: { onBack?: () => void }) {
  const [theme, setTheme] = useState<"Light" | "Dark" | "System">("System");
  const [autoplay, setAutoplay] = useState<"Always" | "Wi-Fi only" | "Never">("Wi-Fi only");
  const [dataSaver, setDataSaver] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">App preferences</span>
        <span style={{ width: 20 }}></span>
      </div>
      <label style={{ marginTop: 0 }}>Theme</label>
      <div className="chips">
        {(["Light", "Dark", "System"] as const).map((t) => (
          <span
            key={t}
            className={`chip ${theme === t ? "on" : ""}`}
            onClick={() => setTheme(t)}
            style={{ cursor: "pointer" }}
          >
            {t}
          </span>
        ))}
      </div>
      <label>Autoplay videos</label>
      <div className="chips">
        {(["Always", "Wi-Fi only", "Never"] as const).map((opt) => (
          <span
            key={opt}
            className={`chip ${autoplay === opt ? "on" : ""}`}
            onClick={() => setAutoplay(opt)}
            style={{ cursor: "pointer" }}
          >
            {opt}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="lr" onClick={() => setDataSaver(!dataSaver)} style={{ cursor: "pointer" }}>
          <div className="l1">Data saver<small>{dataSaver ? "Reduced media quality" : "Standard quality"}</small></div>
          <span className={`tg ${dataSaver ? "on" : ""}`}></span>
        </div>
        <div className="lr" onClick={() => setReduceMotion(!reduceMotion)} style={{ cursor: "pointer" }}>
          <div className="l1">Reduce motion</div>
          <span className={`tg ${reduceMotion ? "on" : ""}`}></span>
        </div>
        <div className="lr" style={{ cursor: "pointer" }}>
          <div className="l1">Language<small>English</small></div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenSettingsBlockedUsers({ onBack }: { onBack?: () => void }) {
  const [blockedUsers, setBlockedUsers] = useState([
    { id: "1", name: "Chidi P.", username: "@chidip", initial: "C" },
    { id: "2", name: "Sam B.", username: "@samb", initial: "S" },
  ]);

  const handleUnblock = (id: string) => {
    setBlockedUsers(blockedUsers.filter((u) => u.id !== id));
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Blocked users</span>
        <span style={{ width: 20 }}></span>
      </div>

      {blockedUsers.map((u) => (
        <div key={u.id} className="ch">
          <div className="a36 s">{u.initial}</div>
          <div style={{ flex: 1 }}>
            <div className="n">{u.name}</div>
            <div className="s">{u.username}</div>
          </div>
          <span className="ghost" onClick={() => handleUnblock(u.id)} style={{ cursor: "pointer" }}>
            Unblock
          </span>
        </div>
      ))}

      <p className="note">Blocked people can’t see your posts or message you.</p>

      {blockedUsers.length === 0 ? (
        <div className="emp" style={{ marginTop: "auto", marginBottom: "auto" }}>
          <p className="cnt">No one is currently blocked</p>
        </div>
      ) : (
        <div className="emp" style={{ marginTop: "auto", marginBottom: "auto" }}>
          <p className="cnt">No one else is blocked</p>
        </div>
      )}
    </Frame>
  );
}

export function ScreenDeleteAccount({ onBack, onCancel }: { onBack?: () => void; onCancel?: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleted, setIsDeleted] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = () => {
    if (canDelete) {
      setIsDeleted(true);
    }
  };

  if (isDeleted) {
    return (
      <Frame>
        <div className="hd">
          <span className="t">Account Deleted</span>
        </div>
        <div className="emp" style={{ marginTop: 80 }}>
          <p className="ttl">Your account is removed</p>
          <p className="sub" style={{ margin: "6px 0 16px" }}>Thank you for being part of Common Room. You will be redirected.</p>
          <span className="ghost l" onClick={onCancel} style={{ cursor: "pointer" }}>Return to Home</span>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Delete account</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="banner">This can’t be undone.</div>
      <p className="sub">When you delete your account:</p>
      <ul className="rules" style={{ margin: "0 2px 10px" }}>
        <li>Your profile, posts and comments are removed</li>
        <li>Your listings are taken down</li>
        <li>Your Inbox and chats are deleted</li>
        <li>Your link stops working</li>
      </ul>
      <label>Type DELETE to confirm</label>
      <input
        type="text"
        placeholder="DELETE"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className={`in ${canDelete ? "v" : "e"}`}
        style={{ width: "100%", background: "#fff", border: canDelete ? "1px solid #1a7f37" : "1px solid #d4d4d4", borderRadius: 12, padding: "0 12px", height: 40, letterSpacing: 1 }}
      />
      <div className="acts" style={{ marginTop: "auto" }}>
        <span className="ghost l" onClick={onCancel} style={{ cursor: "pointer" }}>Cancel</span>
        <span
          className={`pbtn l ${canDelete ? "" : "off"}`}
          onClick={handleDelete}
          style={{ background: canDelete ? "#b3261e" : undefined, cursor: canDelete ? "pointer" : "default" }}
        >
          Delete
        </span>
      </div>
    </Frame>
  );
}

export function ScreenAnonymousLinkSettings({ onBack }: { onBack?: () => void }) {
  const [linkCode, setLinkCode] = useState("k7x2q9");
  const [acceptMessages, setAcceptMessages] = useState(true);
  const [copied, setCopied] = useState(false);

  const fullLink = `commonroom.app/m/${linkCode}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let newCode = "";
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLinkCode(newCode);
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Anonymous link</span>
        <span style={{ width: 20 }}></span>
      </div>

      {copied && (
        <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 10, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
          ✓ Link copied to clipboard
        </div>
      )}

      <div className="pv" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 500 }}>{fullLink}</span>
        <svg className="i" onClick={handleCopy} style={{ cursor: "pointer" }}><use href="#copy" /></svg>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <span className="ghost" onClick={handleCopy} style={{ cursor: "pointer" }}>
          <svg className="i"><use href="#up" /></svg>Share
        </span>
        <span className="ghost" onClick={handleCopy} style={{ cursor: "pointer" }}>
          <svg className="i"><use href="#copy" /></svg>{copied ? "Copied" : "Copy"}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="lr" onClick={() => setAcceptMessages(!acceptMessages)} style={{ cursor: "pointer" }}>
          <div className="l1">
            Accept messages
            <small>{acceptMessages ? "Ready for new messages" : "New messages currently paused"}</small>
          </div>
          <span className={`tg ${acceptMessages ? "on" : ""}`}></span>
        </div>
        <div className="lr" onClick={handleRegenerate} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#refresh" /></svg></span>
          <div className="l1">Regenerate link<small>Old link stops working</small></div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
      </div>

      <div className="inf" style={{ marginTop: "auto" }}>
        Regenerating gives you a new link. Messages already in your Inbox are kept.
      </div>
    </Frame>
  );
}

export function ProfileSettingsScreensGallery() {
  const screens = [
    { title: "38. Edit profile", component: <ScreenEditProfile /> },
    { title: "39. Other user's profile", component: <ScreenOtherUserProfile /> },
    { title: "40. Block user", component: <ScreenBlockUserSheet /> },
    { title: "41. Your profile, Listings tab", component: <ScreenYourProfileListings /> },
    { title: "42. Your profile, Badges tab", component: <ScreenYourProfileBadges /> },
    { title: "43. How Common status works", component: <ScreenHowCommonStatusWorks /> },
    { title: "44. Leaderboard", component: <ScreenLeaderboard /> },
    { title: "45. Settings", component: <ScreenSettingsHub /> },
    { title: "46. Settings, Account", component: <ScreenSettingsAccount /> },
    { title: "47. Settings, Privacy", component: <ScreenSettingsPrivacy /> },
    { title: "48. Settings, Notifications", component: <ScreenSettingsNotifications /> },
    { title: "49. Settings, Feed preferences", component: <ScreenSettingsFeedPreferences /> },
    { title: "50. Settings, App preferences", component: <ScreenSettingsAppPreferences /> },
    { title: "51. Settings, Blocked users", component: <ScreenSettingsBlockedUsers /> },
    { title: "52. Delete account", component: <ScreenDeleteAccount /> },
    { title: "53. Anonymous link settings", component: <ScreenAnonymousLinkSettings /> },
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
