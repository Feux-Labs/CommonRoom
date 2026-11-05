"use client";

import React, { useState } from "react";

function AdminSidebar({
  active = "Analytics",
  onSelect,
}: {
  active?: string;
  onSelect?: (tab: string) => void;
}) {
  const tabs = ["Analytics", "Users", "Reports", "Complaints", "Announcements"];

  return (
    <div className="sb">
      <div className="lg2">Common Room admin</div>
      {tabs.map((tab) => (
        <div
          key={tab}
          className={active === tab ? "a" : ""}
          onClick={() => onSelect?.(tab)}
          style={{ cursor: "pointer" }}
        >
          {tab}
        </div>
      ))}
      <div className="who">
        Maria E.<br />Moderator
      </div>
    </div>
  );
}

export function ScreenAdminAnalytics() {
  const [metricPeriod, setMetricPeriod] = useState<"Today" | "Week" | "Month">("Week");

  return (
    <div className="af">
      <AdminSidebar active="Analytics" />
      <div className="mn">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div className="sh" style={{ margin: 0 }}>Analytics</div>
          <div className="chips">
            {(["Today", "Week", "Month"] as const).map((p) => (
              <span
                key={p}
                className={`chip ${metricPeriod === p ? "on" : ""}`}
                onClick={() => setMetricPeriod(p)}
                style={{ cursor: "pointer", padding: "2px 8px", fontSize: 11 }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="mcs">
          <div className="mc">
            <div className="cnt">Registered users</div>
            <div className="pr" style={{ margin: "2px 0" }}>4,820</div>
            <div className="cnt">+212 this week</div>
          </div>
          <div className="mc">
            <div className="cnt">Active today</div>
            <div className="pr" style={{ margin: "2px 0" }}>1,340</div>
            <div className="cnt">28% of users</div>
          </div>
          <div className="mc">
            <div className="cnt">Posts and comments</div>
            <div className="pr" style={{ margin: "2px 0" }}>6,905</div>
            <div className="cnt">Today</div>
          </div>
          <div className="mc">
            <div className="cnt">Open reports</div>
            <div className="pr" style={{ margin: "2px 0" }}>17</div>
            <div className="cnt">5 older than 24h</div>
          </div>
        </div>

        <div className="two" style={{ marginTop: 14 }}>
          <div className="pn">
            <div className="cnt">Weekly active users</div>
            <div className="bar7">
              <i style={{ height: "40%" }} title="Mon: 400"></i>
              <i style={{ height: "52%" }} title="Tue: 520"></i>
              <i style={{ height: "48%" }} title="Wed: 480"></i>
              <i style={{ height: "63%" }} title="Thu: 630"></i>
              <i style={{ height: "58%" }} title="Fri: 580"></i>
              <i style={{ height: "72%" }} title="Sat: 720"></i>
              <i style={{ height: "80%" }} title="Sun: 800"></i>
            </div>
            <div className="cnt sp"><span>Mon</span><span>Sun</span></div>
          </div>
          <div className="pn">
            <div className="tr"><span>Market listings</span><span>312</span></div>
            <div className="tr"><span>New listings today</span><span>24</span></div>
            <div className="tr"><span>Anonymous links opened</span><span>890</span></div>
            <div className="tr"><span>Messages sent</span><span>410</span></div>
            <div className="tr"><span>Moderation queue</span><span>17 open</span></div>
            <div className="tr"><span>Errors (24h)</span><span>3</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScreenAdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [usersList] = useState([
    { id: "1", name: "Daniel K.", handle: "@danielk", status: "Active", joined: "Jan 2026", reports: 0 },
    { id: "2", name: "Chidi P.", handle: "@chidip", status: "Restricted", joined: "Mar 2026", reports: 4 },
    { id: "3", name: "Sam B.", handle: "@samb", status: "Active", joined: "Apr 2026", reports: 1 },
    { id: "4", name: "Mary Okoye", handle: "@maryo", status: "Active", joined: "May 2026", reports: 0 },
    { id: "5", name: "d•••••@uni.edu", handle: "Auth only", status: "Auth only", joined: "Jun 2026", reports: "-" },
  ]);

  const filtered = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || u.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="af">
      <AdminSidebar active="Users" />
      <div className="mn">
        <div className="sh" style={{ margin: "0 0 8px" }}>Users</div>

        <div className="sch" style={{ width: 320, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: "#f5f5f5", borderRadius: 8, height: 32 }}>
          <svg className="i" style={{ width: 14, height: 14 }}><use href="#srch" /></svg>
          <input
            type="text"
            placeholder="Search name, username or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, width: "100%", fontFamily: "inherit" }}
          />
        </div>

        <div className="chips">
          {["All", "Active", "Restricted", "Suspended", "Banned"].map((status) => (
            <span
              key={status}
              className={`chip ${statusFilter === status ? "on" : ""}`}
              onClick={() => setStatusFilter(status)}
              style={{ cursor: "pointer" }}
            >
              {status}
            </span>
          ))}
        </div>

        <div className="tbl" style={{ marginTop: 10 }}>
          <div className="tr th">
            <span>User</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Reports</span>
            <span></span>
          </div>

          {filtered.map((u) => (
            <div key={u.id} className="tr">
              <span>{u.name} {u.handle !== "Auth only" && <span style={{ color: "#6b6b6b" }}>{u.handle}</span>}</span>
              <span>
                <span
                  className={`chip ${u.status === "Active" ? "" : u.status === "Auth only" ? "off" : "on"}`}
                  style={{ padding: "2px 9px", fontSize: 11 }}
                >
                  {u.status}
                </span>
              </span>
              <span>{u.joined}</span>
              <span>{u.reports}</span>
              <span>
                <span className="ghost" style={{ height: 28, padding: "0 12px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                  {u.status === "Auth only" ? "Create profile" : "View"}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="c" style={{ marginTop: 10 }}>
          <span className="ghost" style={{ height: 28, padding: "0 12px", cursor: "pointer" }}>Load more</span>
          <div className="cnt" style={{ marginTop: 6 }}>
            Showing {filtered.length} of 4,820. Auth accounts are matched with app profiles.
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScreenAdminUserDetail() {
  const [currentStatus, setCurrentStatus] = useState("Restricted");
  const [history, setHistory] = useState([
    { date: "12 Oct", action: "Post removed" },
    { date: "12 Oct", action: "Restricted · 7 days" },
    { date: "2 Oct", action: "Warning sent" },
    { date: "Maria E.", action: "Added note" },
  ]);

  const handleAction = (action: string, newStatus: string) => {
    setCurrentStatus(newStatus);
    setHistory([{ date: "Just now", action: `${action} by Maria E.` }, ...history]);
  };

  return (
    <div className="af">
      <AdminSidebar active="Users" />
      <div className="mn">
        <div className="sp" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="sh" style={{ margin: "0 0 8px" }}>Chidi P. @chidip</div>
          <span
            className={`chip ${currentStatus === "Active" ? "" : "on"}`}
            style={{ padding: "2px 9px", fontSize: 11, background: currentStatus === "Banned" ? "#b3261e" : undefined, color: currentStatus === "Banned" ? "#fff" : undefined }}
          >
            {currentStatus}
          </span>
        </div>

        <div className="two">
          <div className="pn">
            <div className="cnt">Account</div>
            <div className="tr"><span>Email</span><span>c•••••@uni.edu</span></div>
            <div className="tr"><span>Joined</span><span>Mar 2026</span></div>
            <div className="tr"><span>Posts</span><span>12</span></div>
            <div className="tr"><span>Reports against</span><span>4</span></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <span
                className="ghost"
                onClick={() => handleAction("Restricted", "Restricted")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Restrict
              </span>
              <span
                className="ghost"
                onClick={() => handleAction("Suspended", "Suspended")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Suspend
              </span>
              <span
                className="ghost"
                onClick={() => handleAction("Cleared status", "Active")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Clear / Activate
              </span>
              <span
                className="pbtn"
                onClick={() => handleAction("Banned permanently", "Banned")}
                style={{ height: 28, background: "#b3261e", cursor: "pointer" }}
              >
                Ban
              </span>
            </div>
            <p className="note">Every action asks for a reason and is saved to the audit log.</p>
          </div>

          <div className="pn">
            <div className="cnt">Moderation history</div>
            {history.map((h, i) => (
              <div key={i} className="tr">
                <span>{h.date}</span>
                <span>{h.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScreenAdminReports() {
  const [reportTab, setReportTab] = useState<"Posts" | "Comments" | "Listings" | "Anonymous">("Anonymous");

  const [reports, setReports] = useState([
    { id: 1, title: "Spam link in post", type: "Posts", status: "Open" },
    { id: 2, title: "Harassment in reply", type: "Comments", status: "In review" },
    { id: 3, title: "Fake listing", type: "Listings", status: "Open" },
    { id: 4, title: "Anonymous post report", type: "Anonymous", status: "Open" },
  ]);

  const [selectedReportId, setSelectedReportId] = useState(4);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const updateReportStatus = (status: string, toast: string) => {
    setReports(reports.map((r) => (r.id === selectedReportId ? { ...r, status } : r)));
    setFeedback(toast);
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="af">
      <AdminSidebar active="Reports" />
      <div className="mn">
        <div className="sh" style={{ margin: "0 0 8px" }}>Reports</div>
        <div className="chips">
          {(["Posts", "Comments", "Listings", "Anonymous"] as const).map((tab) => (
            <span
              key={tab}
              className={`chip ${reportTab === tab ? "on" : ""}`}
              onClick={() => setReportTab(tab)}
              style={{ cursor: "pointer" }}
            >
              {tab}
            </span>
          ))}
        </div>

        {feedback && (
          <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginTop: 8 }}>
            ✓ {feedback}
          </div>
        )}

        <div className="two" style={{ marginTop: 10 }}>
          <div className="pn">
            {reports.map((r) => (
              <div
                key={r.id}
                className="tr"
                onClick={() => setSelectedReportId(r.id)}
                style={{
                  cursor: "pointer",
                  background: selectedReportId === r.id ? "#f5f5f5" : undefined,
                  borderRadius: 6,
                  padding: "4px 6px",
                }}
              >
                <span>{r.title}</span>
                <span>
                  <span
                    className={`chip ${r.status === "Dismissed" ? "off" : "on"}`}
                    style={{ padding: "2px 9px", fontSize: 11 }}
                  >
                    {r.status}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="pn">
            <div className="cnt">{selectedReport.title} · 3 reports · Harassment</div>
            <div className="pv">“Reported content text for #{selectedReport.id} appears here for moderation review.”</div>
            <div className="inf">Sender details are hidden. Viewing them needs the Safety role, a reason, and is logged.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <span
                className="pbtn"
                onClick={() => updateReportStatus("Removed", "Content removed from platform")}
                style={{ height: 28, cursor: "pointer" }}
              >
                Remove content
              </span>
              <span
                className="ghost"
                onClick={() => updateReportStatus("Restricted", "Author restricted")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Restrict author
              </span>
              <span
                className="ghost"
                onClick={() => updateReportStatus("Dismissed", "Report dismissed")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Dismiss
              </span>
              <span
                className="ghost"
                onClick={() => alert("Audited: Sender metadata accessed by Maria E.")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                View sender metadata
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScreenAdminComplaints() {
  const [complaints, setComplaints] = useState([
    { id: 1, from: "@samb", title: "Can’t upload photo", desc: "I get an error when I change my profile picture.", status: "Open" },
    { id: 2, from: "@chidip", title: "Wrong badge shown", desc: "I completed the streak but badge is still locked.", status: "In progress" },
    { id: 3, from: "@maryo", title: "Suggestion: dark mode", desc: "Would love an AMOLED true black theme for night study.", status: "Resolved" },
  ]);

  const [selectedId, setSelectedId] = useState(1);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);

  const selected = complaints.find((c) => c.id === selectedId) || complaints[0];

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setComplaints(complaints.map((c) => (c.id === selectedId ? { ...c, status: "Resolved" } : c)));
    setReplySent(true);
    setReplyText("");
    setTimeout(() => setReplySent(false), 2000);
  };

  return (
    <div className="af">
      <AdminSidebar active="Complaints" />
      <div className="mn">
        <div className="sh" style={{ margin: "0 0 8px" }}>Complaints and feedback</div>
        <div className="two">
          <div className="pn">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="tr"
                onClick={() => setSelectedId(c.id)}
                style={{
                  cursor: "pointer",
                  background: selectedId === c.id ? "#f5f5f5" : undefined,
                  borderRadius: 6,
                  padding: "4px 6px",
                }}
              >
                <span>{c.title}</span>
                <span>
                  <span
                    className={`chip ${c.status === "Resolved" ? "off" : "on"}`}
                    style={{ padding: "2px 9px", fontSize: 11 }}
                  >
                    {c.status}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="pn">
            <div className="cnt">From {selected.from} · {selected.title}</div>
            <div className="pv">{selected.desc}</div>

            {replySent && (
              <div style={{ background: "#1a7f37", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
                ✓ Reply delivered to {selected.from} & marked resolved
              </div>
            )}

            <textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="in"
              style={{
                width: "100%",
                minHeight: 60,
                border: "1px solid #d4d4d4",
                borderRadius: 8,
                padding: "8px 10px",
                fontFamily: "inherit",
                fontSize: 12,
                resize: "none",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <span
                className="pbtn"
                onClick={handleSendReply}
                style={{ height: 28, cursor: "pointer" }}
              >
                Send reply
              </span>
              <span
                className="ghost"
                onClick={() => setComplaints(complaints.map((c) => (c.id === selectedId ? { ...c, status: "Resolved" } : c)))}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Mark resolved
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScreenAdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: "Welcome to Common Room", status: "Published", author: "Maria E." },
    { id: 2, title: "Market tips", status: "Scheduled", author: "Maria E." },
    { id: 3, title: "Exam week hours", status: "Draft", author: "Joe A." },
  ]);

  const [title, setTitle] = useState("Market tips");
  const [message, setMessage] = useState("Meet in public places and check items before paying.");
  const [placements, setPlacements] = useState<string[]>(["Home banner", "Notification"]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const togglePlacement = (p: string) => {
    if (placements.includes(p)) {
      setPlacements(placements.filter((x) => x !== p));
    } else {
      setPlacements([...placements, p]);
    }
  };

  const handlePublish = (status: "Published" | "Scheduled" | "Draft") => {
    if (!title.trim()) return;
    const existing = announcements.find((a) => a.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      setAnnouncements(announcements.map((a) => (a.id === existing.id ? { ...a, status } : a)));
    } else {
      setAnnouncements([
        { id: Date.now(), title, status, author: "Maria E." },
        ...announcements,
      ]);
    }
    setFeedback(`Announcement ${status.toLowerCase()}!`);
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="af">
      <AdminSidebar active="Announcements" />
      <div className="mn">
        <div className="sh" style={{ margin: "0 0 8px" }}>Announcements</div>

        {feedback && (
          <div style={{ background: "#0b0b0b", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
            ✓ {feedback}
          </div>
        )}

        <div className="two">
          <div className="pn">
            {announcements.map((a) => (
              <div key={a.id} className="tr">
                <span>{a.title}</span>
                <span>
                  <span
                    className={`chip ${a.status === "Published" ? "" : a.status === "Scheduled" ? "on" : "off"}`}
                    style={{ padding: "2px 9px", fontSize: 11 }}
                  >
                    {a.status}
                  </span>
                </span>
                <span>{a.author}</span>
              </div>
            ))}
          </div>

          <div className="pn">
            <label style={{ marginTop: 0 }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="in v"
              style={{ width: "100%", height: 36, border: "1px solid #d4d4d4", borderRadius: 8, padding: "0 10px", fontSize: 13 }}
            />

            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="in"
              style={{
                width: "100%",
                minHeight: 60,
                border: "1px solid #d4d4d4",
                borderRadius: 8,
                padding: "8px 10px",
                fontFamily: "inherit",
                fontSize: 12,
                resize: "none",
              }}
            />

            <label>Show in</label>
            <div className="chips">
              {["Home banner", "Room", "Notification"].map((place) => (
                <span
                  key={place}
                  className={`chip ${placements.includes(place) ? "on" : ""}`}
                  onClick={() => togglePlacement(place)}
                  style={{ cursor: "pointer" }}
                >
                  {place}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <span
                className="pbtn"
                onClick={() => handlePublish("Published")}
                style={{ height: 28, cursor: "pointer" }}
              >
                Publish
              </span>
              <span
                className="ghost"
                onClick={() => handlePublish("Scheduled")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Schedule
              </span>
              <span
                className="ghost"
                onClick={() => handlePublish("Draft")}
                style={{ height: 28, padding: "0 12px", cursor: "pointer" }}
              >
                Save draft
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminScreensGallery() {
  const screens = [
    { title: "62. Analytics", component: <ScreenAdminAnalytics /> },
    { title: "63. Users", component: <ScreenAdminUsers /> },
    { title: "64. User detail and actions", component: <ScreenAdminUserDetail /> },
    { title: "65. Reports", component: <ScreenAdminReports /> },
    { title: "66. Complaints and feedback", component: <ScreenAdminComplaints /> },
    { title: "67. Announcements", component: <ScreenAdminAnnouncements /> },
  ];

  return (
    <div className="wgrid">
      {screens.map((s, idx) => (
        <div key={idx} className="wcell">
          <p className="cap">{s.title}</p>
          {s.component}
        </div>
      ))}
    </div>
  );
}
