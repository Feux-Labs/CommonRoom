"use client";

import React, { useState, useEffect } from "react";
import { Frame } from "@/components/cr";

export function ScreenCreatePost({
  onClose,
  onPost,
  initialTopic = "Computer Science",
}: {
  onClose?: () => void;
  onPost?: (data: { content: string; topic: string; fileUrl?: string }) => void;
  initialTopic?: string;
}) {
  const [content, setContent] = useState(
    "How I revised a full semester of Data Structures in one weekend, and what I would change."
  );
  const [topic, setTopic] = useState(initialTopic);
  const [hasAttachment, setHasAttachment] = useState(true);
  const [attachmentType, setAttachmentType] = useState<"photo" | "video">("photo");
  const [uploadProgress, setUploadProgress] = useState(64);
  const [isUploading, setIsUploading] = useState(true);

  // Dynamic simulated progress if uploading
  useEffect(() => {
    if (!isUploading || !hasAttachment) return;
    const timer = setTimeout(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          setIsUploading(false);
          return 100;
        }
        return Math.min(100, p + 12);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [isUploading, hasAttachment]);

  const canPost = content.trim().length > 0 && (!hasAttachment || uploadProgress === 100);

  const handleAttach = (type: "photo" | "video") => {
    setAttachmentType(type);
    setHasAttachment(true);
    setUploadProgress(15);
    setIsUploading(true);
  };

  const handleRemoveAttachment = () => {
    setHasAttachment(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        <span
          className={`pbtn ${canPost ? "" : "off"}`}
          onClick={() => {
            if (canPost) onPost?.({ content, topic });
          }}
          style={{ cursor: canPost ? "pointer" : "not-allowed" }}
        >
          Post
        </span>
      </div>

      <div className="row">
        <div className="a36">A</div>
        <textarea
          className="ta"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder="What's happening on campus?"
          style={{
            border: "none",
            outline: "none",
            resize: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
            width: "100%",
          }}
          rows={3}
        />
      </div>

      {hasAttachment && (
        <>
          <div className="thumb">
            <span className="x" onClick={handleRemoveAttachment} style={{ cursor: "pointer" }}>
              <svg className="i" style={{ width: 12, height: 12 }}><use href="#x" /></svg>
            </span>
          </div>
          {isUploading && uploadProgress < 100 ? (
            <>
              <div className="pb">
                <i style={{ width: `${uploadProgress}%`, transition: "width 0.3s ease" }}></i>
              </div>
              <p className="note" style={{ marginLeft: 46 }}>
                Uploading {uploadProgress}%. You can post when it finishes.
              </p>
            </>
          ) : (
            <p className="note" style={{ marginLeft: 46, color: "#1a7f37" }}>
              ✓ Ready to post with {attachmentType}
            </p>
          )}
        </>
      )}

      <div className="hr"></div>

      <div style={{ display: "flex", gap: 8 }}>
        <span
          className="ghost"
          onClick={() => handleAttach("photo")}
          style={{ cursor: "pointer" }}
        >
          <svg className="i"><use href="#img" /></svg>Photo
        </span>
        <span
          className="ghost"
          onClick={() => handleAttach("video")}
          style={{ cursor: "pointer" }}
        >
          <svg className="i"><use href="#vid" /></svg>Video
        </span>
      </div>

      <label>Topic</label>
      <div className="in v">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit", width: "100%" }}
        />
        <span className="cnt">General</span>
      </div>

      <div className="sp" style={{ marginTop: 12 }}>
        <span className="cnt">Add #tags to help people find this</span>
        <span className="cnt">{content.length} / 500</span>
      </div>
    </Frame>
  );
}

export function ScreenCreateAnonymousPost({
  onClose,
  onPost,
}: {
  onClose?: () => void;
  onPost?: (data: { content: string; topic: string; photo?: boolean }) => void;
}) {
  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Campus life");
  const [hasPhoto, setHasPhoto] = useState(false);

  const topics = ["Campus life", "Library", "Food", "Hostel", "Academics", "Other"];
  const canPost = content.trim().length > 0;

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        <span className="t">New anonymous post</span>
        <span
          className={`pbtn ${canPost ? "" : "off"}`}
          onClick={() => {
            if (canPost) onPost?.({ content, topic: selectedTopic, photo: hasPhoto });
          }}
          style={{ cursor: canPost ? "pointer" : "not-allowed" }}
        >
          Post
        </span>
      </div>

      <p className="note" style={{ margin: "0 0 12px" }}>Never linked to your profile.</p>

      <div className="row">
        <div className="a36 g"><svg className="i"><use href="#anon" /></svg></div>
        <textarea
          className={`ta ${content ? "" : "ph"}`}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 300))}
          placeholder="Say it anonymously..."
          style={{
            border: "none",
            outline: "none",
            resize: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
            width: "100%",
          }}
          rows={3}
        />
      </div>

      <div className="hr"></div>

      <label style={{ marginTop: 0 }}>Topic</label>
      <div className="chips">
        {topics.map((t) => (
          <span
            key={t}
            className={`chip ${selectedTopic === t ? "on" : ""}`}
            onClick={() => setSelectedTopic(t)}
            style={{ cursor: "pointer" }}
          >
            {t}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <span
          className={`ghost ${hasPhoto ? "on" : ""}`}
          onClick={() => setHasPhoto(!hasPhoto)}
          style={{ cursor: "pointer", background: hasPhoto ? "#efefef" : "#fff" }}
        >
          <svg className="i"><use href="#img" /></svg>
          {hasPhoto ? "Photo added ✓" : "Add photo"}
        </span>
      </div>

      <div className="sp" style={{ marginTop: 14 }}>
        <span className="cnt">Follows Community Guidelines</span>
        <span className="cnt">{content.length} / 300</span>
      </div>
      <p className="note">You can delete a post later, but not edit it.</p>
    </Frame>
  );
}

export function ScreenCommentsRoom({ onClose }: { onClose?: () => void }) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([
    {
      id: "1",
      author: "Daniel K.",
      handle: "danielk",
      avatarColor: "#bdbdbd",
      time: "1h",
      text: "Which textbook did you use for the graph part?",
      likes: 3,
      isLiked: false,
      isReply: false,
    },
    {
      id: "2",
      author: "ife.codes",
      handle: "ife.codes",
      avatarColor: "#efefef",
      time: "45m",
      text: "Algorithms Illuminated vol 2. Free PDF in my bio.",
      likes: 4,
      isLiked: true,
      isReply: true,
    },
    {
      id: "3",
      author: "Chidi",
      handle: "chidi",
      avatarColor: "#8a8a8a",
      time: "30m",
      text: "This helped a lot, thanks.",
      likes: 2,
      isLiked: false,
      isReply: false,
    },
  ]);

  const toggleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              isLiked: !c.isLiked,
              likes: c.isLiked ? c.likes - 1 : c.likes + 1,
            }
          : c
      )
    );
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      author: "You",
      handle: "you",
      avatarColor: "#0b0b0b",
      time: "Just now",
      text: commentText.trim(),
      likes: 0,
      isLiked: false,
      isReply: false,
    };
    setComments([...comments, newComment]);
    setCommentText("");
  };

  return (
    <Frame noPadding>
      <div className="dim">Post by @ife.codes</div>
      <div className="sheet fl">
        <div className="grab"></div>
        <div className="sp">
          <span className="sh">Comments · {86 + (comments.length - 3)}</span>
          <svg className="ic" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {comments.map((c) => (
            <div key={c.id} className={`cm ${c.isReply ? "r" : ""}`}>
              <div className="a36 s" style={{ background: c.avatarColor }}>
                {c.author[0]}
              </div>
              <div>
                <b style={{ fontWeight: 500 }}>{c.author}</b> <span className="m">{c.time}</span>
                <br />{c.text}
                <div className="act">
                  <span
                    onClick={() => toggleLike(c.id)}
                    style={{ cursor: "pointer", color: c.isLiked ? "#b3261e" : "inherit" }}
                  >
                    <svg className="i" style={{ fill: c.isLiked ? "#b3261e" : "none" }}>
                      <use href="#heart" />
                    </svg>
                    {c.likes > 0 ? c.likes : ""}
                  </span>
                  <span style={{ cursor: "pointer" }}>Reply</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bar">
          <div className="a36 s">A</div>
          <input
            className="in"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            placeholder="Add a comment..."
            style={{ border: "none", outline: "none", background: "#f6f6f6", flex: 1, padding: "0 12px" }}
          />
          <svg
            className="i"
            onClick={handleAddComment}
            style={{ cursor: commentText.trim() ? "pointer" : "default", opacity: commentText.trim() ? 1 : 0.4 }}
          >
            <use href="#send" />
          </svg>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenCommentsAnonymous({ onClose }: { onClose?: () => void }) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([
    { id: "1", time: "5m", text: "Same. My 8am is cursed.", likes: 9, isLiked: false, isReply: false },
    { id: "2", time: "3m", text: "Prayer points for the 8am crew.", likes: 3, isLiked: false, isReply: true },
    { id: "3", time: "1m", text: "Lecturer arrived at 8:40 and still said we were late.", likes: 5, isLiked: true, isReply: false },
  ]);

  const toggleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
          : c
      )
    );
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setComments([
      ...comments,
      { id: Date.now().toString(), time: "Just now", text: commentText.trim(), likes: 0, isLiked: false, isReply: false },
    ]);
    setCommentText("");
  };

  return (
    <Frame noPadding>
      <div className="dim">Anonymous · Campus life</div>
      <div className="sheet fl">
        <div className="grab"></div>
        <div className="sp">
          <span className="sh">Comments · {38 + (comments.length - 3)}</span>
          <svg className="ic" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        </div>
        <p className="note" style={{ margin: "2px 0 0" }}>Comments here are anonymous too.</p>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {comments.map((c) => (
            <div key={c.id} className={`cm ${c.isReply ? "r" : ""}`}>
              <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
              <div>
                <b style={{ fontWeight: 500 }}>Anonymous</b> <span className="m">{c.time}</span>
                <br />{c.text}
                <div className="act">
                  <span
                    onClick={() => toggleLike(c.id)}
                    style={{ cursor: "pointer", color: c.isLiked ? "#b3261e" : "inherit" }}
                  >
                    <svg className="i" style={{ fill: c.isLiked ? "#b3261e" : "none" }}>
                      <use href="#heart" />
                    </svg>
                    {c.likes > 0 ? c.likes : ""}
                  </span>
                  <span style={{ cursor: "pointer" }}>Reply</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bar">
          <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
          <input
            className="in"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            placeholder="Comment anonymously..."
            style={{ border: "none", outline: "none", background: "#f6f6f6", flex: 1, padding: "0 12px" }}
          />
          <svg
            className="i"
            onClick={handleAddComment}
            style={{ cursor: commentText.trim() ? "pointer" : "default", opacity: commentText.trim() ? 1 : 0.4 }}
          >
            <use href="#send" />
          </svg>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenInboxConversation({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState([
    { id: "1", from: "them", text: "Do you still have the econ notes from last week?" },
    { id: "2", from: "me", text: "Yes, I will bring them tomorrow." },
    { id: "3", from: "them", text: "Thank you! Which hall?" },
    { id: "4", from: "me", text: "Hall 2, before 10am." },
  ]);
  const [replyText, setReplyText] = useState("");

  const handleSend = () => {
    if (!replyText.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), from: "me", text: replyText.trim() }]);
    setReplyText("");
  };

  return (
    <Frame>
      <div className="hd" style={{ justifyContent: "flex-start", gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
        <div>
          <div className="t">Anonymous</div>
          <div className="cnt">econ notes question</div>
        </div>
      </div>

      <div className="tm">Today</div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {messages.map((m) => (
          <div key={m.id} className={`bub ${m.from === "me" ? "me" : "in2"}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11.5, marginTop: 6, display: "flex", gap: 14 }}>
        <span className="lnk" style={{ cursor: "pointer" }}>Share publicly</span>
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report</span>
      </div>

      <div className="bar" style={{ marginTop: 8 }}>
        <input
          className="in"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Reply privately..."
          style={{ border: "none", outline: "none", background: "#f6f6f6", flex: 1, padding: "0 12px" }}
        />
        <svg
          className="i"
          onClick={handleSend}
          style={{ cursor: replyText.trim() ? "pointer" : "default", opacity: replyText.trim() ? 1 : 0.4 }}
        >
          <use href="#send" />
        </svg>
      </div>
    </Frame>
  );
}

export function ScreenShareMessagePublicly({
  onCancel,
  onShare,
  messageText = "Your presentation today was actually really good, honestly.",
}: {
  onCancel?: () => void;
  onShare?: () => void;
  messageText?: string;
}) {
  return (
    <Frame noPadding>
      <div className="dim k">Inbox</div>
      <div className="sheet">
        <div className="grab"></div>
        <span className="sh">Share this message publicly?</span>
        <div className="pv">
          <div className="row">
            <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
            <div>{messageText}</div>
          </div>
        </div>
        <p className="note" style={{ margin: 0 }}>
          It will appear in the Anonymous feed. Your name and the sender’s identity are not shown. Nothing else from your Inbox is shared.
        </p>
        <div className="acts">
          <span className="ghost" onClick={onCancel} style={{ cursor: "pointer" }}>Cancel</span>
          <span className="pbtn" onClick={onShare} style={{ cursor: "pointer" }}>Share</span>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenReportSheet({ onCancel, onReport }: { onCancel?: () => void; onReport?: (reason: string, details: string) => void }) {
  const [selected, setSelected] = useState(1);
  const [details, setDetails] = useState("");
  const reasons = [
    "Spam",
    "Harassment or bullying",
    "Hate speech",
    "Sexual content",
    "Self-harm",
    "Something else",
  ];

  return (
    <Frame noPadding>
      <div className="dim k">Post</div>
      <div className="sheet">
        <div className="grab"></div>
        <span className="sh">Report this post</span>
        <p className="note" style={{ margin: "2px 0 6px" }}>Pick the closest reason. Your report is anonymous.</p>
        {reasons.map((r, idx) => (
          <div key={idx} className="rad" onClick={() => setSelected(idx)} style={{ cursor: "pointer" }}>
            {r}
            <i className={selected === idx ? "on" : ""}></i>
          </div>
        ))}
        <div className="in" style={{ marginTop: 12, height: 38 }}>
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details (optional)"
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", color: "inherit", font: "inherit" }}
          />
        </div>
        <div className="acts">
          <span className="ghost" onClick={onCancel} style={{ cursor: "pointer" }}>Cancel</span>
          <span
            className="pbtn"
            onClick={() => onReport?.(reasons[selected], details)}
            style={{ cursor: "pointer" }}
          >
            Report
          </span>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenShareSheet({ postText = "Is it just me or does every 8am lecture feel like it was scheduled by someone who hates us?" }: { postText?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Frame noPadding>
      <div className="dim k" style={{ display: "flex", flexDirection: "column" }}>
        {copied && <span className="toast">Link copied</span>}
      </div>
      <div className="sheet">
        <div className="grab"></div>
        <span className="sh">Share post</span>
        <div className="pv">
          <div className="row">
            <div className="a36 g s"><svg className="i"><use href="#anon" /></svg></div>
            <div>{postText}</div>
          </div>
        </div>
        <div className="shr">
          <div onClick={handleCopy} style={{ cursor: "pointer" }}>
            <b><svg className="i"><use href="#link" /></svg></b>Copy link
          </div>
          <div style={{ cursor: "pointer" }}><b>W</b>WhatsApp</div>
          <div style={{ cursor: "pointer" }}><b>M</b>Messages</div>
          <div style={{ cursor: "pointer" }}><b><svg className="i"><use href="#up" /></svg></b>More</div>
        </div>
      </div>
    </Frame>
  );
}

export function CoreActionScreensGallery() {
  const screens = [
    { title: "12. Create post (Home and Room)", component: <ScreenCreatePost /> },
    { title: "13. Create anonymous post", component: <ScreenCreateAnonymousPost /> },
    { title: "14. Comments, Room", component: <ScreenCommentsRoom /> },
    { title: "15. Comments, Anonymous", component: <ScreenCommentsAnonymous /> },
    { title: "16. Inbox conversation", component: <ScreenInboxConversation /> },
    { title: "17. Share message publicly", component: <ScreenShareMessagePublicly /> },
    { title: "18. Report sheet", component: <ScreenReportSheet /> },
    { title: "19. Share sheet", component: <ScreenShareSheet /> },
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
