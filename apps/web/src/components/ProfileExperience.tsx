"use client";

import React, { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { institutions } from "@/lib/institutions";
import type { FeedPost } from "@/lib/contracts";

export interface ProfileExperienceProps {
  session: Session | null;
  profile: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    educationStatus: string;
    school: string | null;
    showSchoolOnProfile: boolean;
    course: string;
    year: string;
    interests: string[];
  } | null;
  isGuest?: boolean;
  onSignOut: () => void;
  onRequireAccount?: () => void;
  onSaveProfile: (updated: {
    displayName: string;
    school: string | null;
    course: string;
    year: string;
    interests: string[];
    showSchoolOnProfile: boolean;
    avatarFile?: File | null;
    avatarRemoved?: boolean;
  }) => Promise<boolean>;
  onClose?: () => void;
  userPosts?: FeedPost[];
}

type ProfileView =
  | "profile"
  | "edit"
  | "settings"
  | "settings-account"
  | "settings-privacy"
  | "settings-notifications"
  | "settings-feed"
  | "settings-app"
  | "settings-blocked"
  | "settings-delete"
  | "settings-anon-link"
  | "how-status-works";

export function ProfileExperience({
  session,
  profile,
  isGuest,
  onSignOut,
  onRequireAccount,
  onSaveProfile,
  onClose,
  userPosts = [],
}: ProfileExperienceProps) {
  const [view, setView] = useState<ProfileView>("profile");
  const [activeTab, setActiveTab] = useState<"Posts" | "Listings" | "Badges">("Posts");

  // Edit profile state
  const [displayName, setDisplayName] = useState(profile?.displayName || "Student");
  const [username] = useState(profile?.username ? `@${profile.username}` : "@student");
  const [course, setCourse] = useState(profile?.course || "");
  const [year, setYear] = useState(profile?.year || "");
  const [school, setSchool] = useState(profile?.school || "");
  const [interests, setInterests] = useState<string[]>(profile?.interests || ["Campus life", "Tech"]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Settings state
  const [publicProfile, setPublicProfile] = useState(true);
  const [showSchool, setShowSchool] = useState(profile?.showSchoolOnProfile ?? true);
  const [showBadges, setShowBadges] = useState(true);
  const [messagePerm, setMessagePerm] = useState<"Everyone" | "People I follow" | "No one">("Everyone");
  const [notificationPrefs, setNotificationPrefs] = useState({
    push: true,
    likes: true,
    comments: true,
    followers: true,
    inbox: true,
    market: true,
    announcements: true,
  });
  const [theme, setTheme] = useState<"Light" | "Dark" | "System">("System");
  const [autoplay, setAutoplay] = useState<"Always" | "Wi-Fi only" | "Never">("Wi-Fi only");
  const [dataSaver, setDataSaver] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([
    { id: "1", name: "Chidi P.", handle: "@chidip" },
    { id: "2", name: "Sam B.", handle: "@samb" },
  ]);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [anonLinkActive, setAnonLinkActive] = useState(true);
  const [anonLinkCode, setAnonLinkCode] = useState("k7x2q9");
  const [copiedLink, setCopiedLink] = useState(false);

  // Guest view prompt
  if (isGuest || !session) {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <span className="t">Profile</span>
          <span style={{ width: 20 }}></span>
        </div>
        <div className="emp" style={{ margin: "auto 0" }}>
          <div className="big" style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <svg className="i"><use href="#user" /></svg>
          </div>
          <p className="ttl">Join Common Room</p>
          <p className="sub" style={{ margin: "4px 0 16px" }}>
            Sign up to connect with your school community, bookmark posts, sell items, and build your profile.
          </p>
          <button
            type="button"
            className="pbtn l"
            onClick={onRequireAccount}
            style={{ cursor: "pointer", border: "none", width: "100%" }}
          >
            Create an account
          </button>
        </div>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarRemoved(false);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setAvatarPreview(null);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const ok = await onSaveProfile({
        displayName,
        school: school || null,
        course,
        year,
        interests,
        showSchoolOnProfile: showSchool,
        avatarFile,
        avatarRemoved,
      });
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setView("profile");
        }, 800);
      } else {
        setSaveError("Could not save profile. Check connection.");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((i) => i !== tag));
    } else {
      setInterests([...interests, tag]);
    }
  };

  const bioSummary = [course, year, school].filter(Boolean).join(", ") || "Student at Common Room";

  // VIEW: EDIT PROFILE (Screen 38)
  if (view === "edit") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button
            type="button"
            onClick={() => setView("profile")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <svg className="i"><use href="#x" /></svg>
          </button>
          <span className="t">Edit profile</span>
          <button
            type="button"
            className="pbtn"
            onClick={handleSaveProfile}
            disabled={saving}
            style={{ cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {saveSuccess && (
          <div style={{ background: "#e6f4ea", color: "#137333", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
            ✓ Profile updated
          </div>
        )}
        {saveError && (
          <div style={{ background: "#fdecea", color: "#b3261e", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8, textAlign: "center" }}>
            {saveError}
          </div>
        )}

        <div className="c">
          <div
            className="av"
            style={{
              margin: "6px auto 8px",
              width: 84,
              height: 84,
              borderStyle: "solid",
              background: "#161616",
              color: "#fff",
              fontSize: 28,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <label style={{ display: "inline-block", cursor: "pointer" }}>
            <span className="lnk">Change photo</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
          </label>
          {avatarPreview && (
            <span
              className="lnk"
              onClick={handleAvatarRemove}
              style={{ color: "#6b6b6b", marginLeft: 12, cursor: "pointer" }}
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
          style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 14, height: 42, padding: "0 13px" }}
        />

        <label>Username</label>
        <div className="in v" style={{ width: "100%", background: "#f9f9f9" }}>{username}</div>
        <p className="msg ok">Verified</p>

        <label>Course / Major</label>
        <input
          type="text"
          className="in v"
          placeholder="e.g. Law, Computer Science"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 14, height: 42, padding: "0 13px" }}
        />

        <label>Year / Level</label>
        <input
          type="text"
          className="in v"
          placeholder="e.g. 300L, Final Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 14, height: 42, padding: "0 13px" }}
        />

        <label>School (optional)</label>
        <select
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="in"
          style={{ width: "100%", background: "#fff", border: "1px solid #d4d4d4", borderRadius: 14, height: 42, padding: "0 13px" }}
        >
          <option value="">Select your school</option>
          {institutions.slice(0, 30).map((inst) => (
            <option key={inst.id} value={inst.name}>{inst.name}</option>
          ))}
        </select>
        <p className="note" style={{ margin: "4px 0 0" }}>Leave blank if you are not currently in school.</p>
      </div>
    );
  }

  // VIEW: SETTINGS HUB (Screen 45)
  if (view === "settings") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button
            type="button"
            onClick={() => setView("profile")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Settings</span>
          <span style={{ width: 20 }}></span>
        </div>

        <div className="lr" onClick={() => setView("settings-account")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#user" /></svg></span>
          <div className="l1">Account</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" onClick={() => setView("settings-privacy")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#lock" /></svg></span>
          <div className="l1">Privacy</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" onClick={() => setView("settings-notifications")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#bell" /></svg></span>
          <div className="l1">Notifications</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" onClick={() => setView("settings-feed")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#srch" /></svg></span>
          <div className="l1">Feed preferences</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" onClick={() => setView("settings-app")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#cog" /></svg></span>
          <div className="l1">App preferences</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" onClick={() => setView("settings-blocked")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#blk" /></svg></span>
          <div className="l1">Blocked users</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>
        <div className="lr" onClick={() => setView("settings-anon-link")} style={{ cursor: "pointer" }}>
          <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#link" /></svg></span>
          <div className="l1">Anonymous link</div>
          <svg className="i"><use href="#rt" /></svg>
        </div>

        <div style={{ marginTop: "auto" }}>
          <div className="lr" onClick={onSignOut} style={{ cursor: "pointer" }}>
            <div className="l1">Log out</div>
          </div>
          <div className="lr dn" onClick={() => setView("settings-delete")} style={{ cursor: "pointer" }}>
            <div className="l1">Delete account</div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: SETTINGS ACCOUNT (Screen 46)
  if (view === "settings-account") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Account</span>
          <span style={{ width: 20 }}></span>
        </div>
        <div className="lr">
          <div className="l1">Email<small>{session.user.email}</small></div>
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
        <p className="note">Changing your email or password asks you to confirm it’s you.</p>
        <div style={{ marginTop: "auto" }}>
          <div className="lr dn" onClick={() => setView("settings-delete")} style={{ cursor: "pointer" }}>
            <div className="l1">Delete account<small>Permanently remove your account</small></div>
            <svg className="i"><use href="#rt" /></svg>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: SETTINGS PRIVACY (Screen 47)
  if (view === "settings-privacy") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Privacy</span>
          <span style={{ width: 20 }}></span>
        </div>
        <div className="lr" onClick={() => setPublicProfile(!publicProfile)} style={{ cursor: "pointer" }}>
          <div className="l1">Public profile<small>{publicProfile ? "Anyone can see your profile" : "Followers only"}</small></div>
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
        <div className="pv" style={{ marginTop: "auto" }}>
          Anonymous messages and posts are never linked to your profile. Hiding your profile doesn’t stop safety teams from reviewing reports.
        </div>
      </div>
    );
  }

  // VIEW: SETTINGS NOTIFICATIONS (Screen 48)
  if (view === "settings-notifications") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Notifications</span>
          <span style={{ width: 20 }}></span>
        </div>
        {Object.entries(notificationPrefs).map(([key, val]) => (
          <div
            key={key}
            className="lr"
            onClick={() => setNotificationPrefs((prev) => ({ ...prev, [key]: !val }))}
            style={{ cursor: "pointer" }}
          >
            <div className="l1">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <span className={`tg ${val ? "on" : ""}`}></span>
          </div>
        ))}
        <p className="note">Turned-off categories won’t send push or in-app alerts.</p>
      </div>
    );
  }

  // VIEW: SETTINGS FEED PREFERENCES (Screen 49)
  if (view === "settings-feed") {
    const allInterests = ["Campus life", "Music", "Comedy", "Sports", "Tech", "Study tips", "Fashion", "Gaming", "Library"];
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Feed preferences</span>
          <span style={{ width: 20 }}></span>
        </div>
        <label style={{ marginTop: 0 }}>Your interests ({interests.length} selected)</label>
        <div className="chips">
          {allInterests.map((tag) => (
            <span
              key={tag}
              className={`chip ${interests.includes(tag) ? "on" : ""}`}
              onClick={() => toggleInterest(tag)}
              style={{ cursor: "pointer" }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div style={{ marginTop: "auto" }}>
          <span className="ghost l" onClick={() => setInterests(["Campus life", "Tech"])} style={{ cursor: "pointer", width: "100%", justifyContent: "center" }}>
            Reset recommendations
          </span>
        </div>
      </div>
    );
  }

  // VIEW: SETTINGS APP PREFERENCES (Screen 50)
  if (view === "settings-app") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
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
        </div>
      </div>
    );
  }

  // VIEW: SETTINGS BLOCKED USERS (Screen 51)
  if (view === "settings-blocked") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Blocked users</span>
          <span style={{ width: 20 }}></span>
        </div>
        {blockedUsers.map((u) => (
          <div key={u.id} className="ch">
            <div className="a36 s">{u.name.slice(0, 1)}</div>
            <div style={{ flex: 1 }}>
              <div className="n">{u.name}</div>
              <div className="s">{u.handle}</div>
            </div>
            <span
              className="ghost"
              onClick={() => setBlockedUsers(blockedUsers.filter((b) => b.id !== u.id))}
              style={{ cursor: "pointer" }}
            >
              Unblock
            </span>
          </div>
        ))}
        {blockedUsers.length === 0 && (
          <div className="emp" style={{ margin: "auto 0" }}>
            <p className="cnt">No one is currently blocked</p>
          </div>
        )}
        <p className="note" style={{ marginTop: "auto" }}>Blocked people can’t see your posts or message you.</p>
      </div>
    );
  }

  // VIEW: DELETE ACCOUNT (Screen 52)
  if (view === "settings-delete") {
    const canDelete = deleteConfirmation.trim().toUpperCase() === "DELETE";
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
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
          value={deleteConfirmation}
          onChange={(e) => setDeleteConfirmation(e.target.value)}
          className={`in ${canDelete ? "v" : "e"}`}
          style={{ width: "100%", background: "#fff", border: canDelete ? "1px solid #1a7f37" : "1px solid #d4d4d4", borderRadius: 14, height: 42, padding: "0 13px" }}
        />
        <div className="acts" style={{ marginTop: "auto" }}>
          <span className="ghost l" onClick={() => setView("settings")} style={{ cursor: "pointer" }}>Cancel</span>
          <span
            className={`pbtn l ${canDelete ? "" : "off"}`}
            onClick={() => {
              if (canDelete) onSignOut();
            }}
            style={{ background: canDelete ? "#b3261e" : undefined, cursor: canDelete ? "pointer" : "default" }}
          >
            Delete
          </span>
        </div>
      </div>
    );
  }

  // VIEW: ANONYMOUS LINK SETTINGS (Screen 53)
  if (view === "settings-anon-link") {
    const fullLink = `commonroom.app/m/${anonLinkCode}`;
    const handleCopy = () => {
      navigator.clipboard?.writeText(fullLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Anonymous link</span>
          <span style={{ width: 20 }}></span>
        </div>
        <div className="pv" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{fullLink}</span>
          <svg className="i" onClick={handleCopy} style={{ cursor: "pointer" }}><use href="#copy" /></svg>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <span className="ghost" onClick={handleCopy} style={{ cursor: "pointer" }}><svg className="i"><use href="#up" /></svg>Share</span>
          <span className="ghost" onClick={handleCopy} style={{ cursor: "pointer" }}><svg className="i"><use href="#copy" /></svg>{copiedLink ? "Copied" : "Copy"}</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="lr" onClick={() => setAnonLinkActive(!anonLinkActive)} style={{ cursor: "pointer" }}>
            <div className="l1">Accept messages<small>{anonLinkActive ? "Accepting new messages" : "Messages paused"}</small></div>
            <span className={`tg ${anonLinkActive ? "on" : ""}`}></span>
          </div>
          <div className="lr" onClick={() => setAnonLinkCode(Math.random().toString(36).substring(2, 8))} style={{ cursor: "pointer" }}>
            <span style={{ marginRight: 10, display: "flex" }}><svg className="i"><use href="#refresh" /></svg></span>
            <div className="l1">Regenerate link<small>Old link stops working</small></div>
            <svg className="i"><use href="#rt" /></svg>
          </div>
        </div>
        <div className="inf" style={{ marginTop: "auto" }}>
          Regenerating gives you a new link. Messages already in your Inbox are kept.
        </div>
      </div>
    );
  }

  // VIEW: HOW COMMON STATUS WORKS (Screen 43)
  if (view === "how-status-works") {
    return (
      <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
        <div className="hd">
          <button type="button" onClick={() => setView("profile")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <svg className="i"><use href="#back" /></svg>
          </button>
          <span className="t">Common status</span>
          <span style={{ width: 20 }}></span>
        </div>
        <p className="sub">Your status reflects your own contributions, not your school.</p>
        <div className="rad" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>Common Man<div className="cnt">Where everyone starts</div></div>
          <i className="on"></i>
        </div>
        <div className="rad" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>Common Chancellor<div className="cnt">Regular, helpful contributors</div></div>
          <i></i>
        </div>
        <div className="rad" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>Common Senator<div className="cnt">Voices the community trusts</div></div>
          <i></i>
        </div>
        <label style={{ marginTop: 16 }}>How you earn recognition</label>
        <div className="lr"><div className="l1">Original posts people engage with</div></div>
        <div className="lr"><div className="l1">Helpful comments and replies</div></div>
        <div className="lr"><div className="l1">Showing up regularly</div></div>
        <p className="note">Spam and repeated taps don’t count. Anonymous activity is never part of your status.</p>
      </div>
    );
  }

  // DEFAULT VIEW: MAIN PROFILE (Screen 41: Your profile)
  return (
    <div className="cr-frame f" style={{ maxWidth: 360, margin: "20px auto" }}>
      <div className="hd">
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <svg className="i"><use href="#back" /></svg>
        </button>
        <span className="t">Profile</span>
        <button
          type="button"
          onClick={() => setView("settings")}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          aria-label="Settings"
        >
          <svg className="i"><use href="#cog" /></svg>
        </button>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <div
          className="a36"
          style={{
            width: 60,
            height: 60,
            fontSize: 22,
            background: "#161616",
            color: "#fff",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div style={{ marginLeft: 12 }}>
          <p className="ttl" style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>{displayName}</p>
          <div className="cnt" style={{ fontSize: 12.5 }}>{username}</div>
        </div>
      </div>

      <div style={{ margin: "8px 0" }}>
        <span className="chip on" style={{ padding: "3px 10px", fontSize: 11.5 }}>Common Man</span>
      </div>

      <p className="ds" style={{ margin: 0, fontSize: 13, color: "#6b6b6b" }}>{bioSummary}</p>

      <div className="stats" style={{ margin: "12px 0 8px" }}>
        <div><b>128</b>Followers</div>
        <div><b>96</b>Following</div>
        <div><b>{userPosts.length || 34}</b>Posts</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <span
          className="ghost l"
          onClick={() => setView("edit")}
          style={{ cursor: "pointer", flex: 1, justifyContent: "center" }}
        >
          Edit profile
        </span>
        <span
          className="ghost l"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
          }}
          style={{ width: 40, padding: 0, justifyContent: "center", cursor: "pointer" }}
          title="Share profile"
        >
          <svg className="i"><use href="#up" /></svg>
        </span>
      </div>

      <div className="tabs" style={{ marginTop: 12 }}>
        {(["Posts", "Listings", "Badges"] as const).map((t) => (
          <span
            key={t}
            className={activeTab === t ? "a" : ""}
            onClick={() => setActiveTab(t)}
            style={{ cursor: "pointer" }}
          >
            {t}
          </span>
        ))}
      </div>

      {activeTab === "Posts" && (
        <div style={{ marginTop: 10, flex: 1, overflowY: "auto" }}>
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <div key={post.id} className="cm" style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                <div className="a36 s">{displayName.slice(0, 1)}</div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontWeight: 500 }}>{displayName}</b>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{post.caption}</div>
                  <div className="m" style={{ fontSize: 11, color: "#6b6b6b", marginTop: 4 }}>
                    {post.likes} likes · {post.comments} comments
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="emp" style={{ padding: "20px 0" }}>
              <p className="cnt">No posts yet. Share what’s on your mind in Room!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "Listings" && (
        <div className="g2" style={{ marginTop: 10 }}>
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

      {activeTab === "Badges" && (
        <div style={{ marginTop: 10 }}>
          <div className="bd">
            <div><b><svg className="i"><use href="#heart" /></svg></b>First like</div>
            <div><b><svg className="i"><use href="#book" /></svg></b>Helper</div>
            <div className="lk"><b><svg className="i"><use href="#trophy" /></svg></b>Top creator</div>
            <div className="lk"><b><svg className="i"><use href="#up" /></svg></b>Week streak</div>
          </div>
          <div className="c" style={{ marginTop: 12 }}>
            <span
              className="lnk"
              onClick={() => setView("how-status-works")}
              style={{ cursor: "pointer", fontSize: 12 }}
            >
              How Common status works
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

