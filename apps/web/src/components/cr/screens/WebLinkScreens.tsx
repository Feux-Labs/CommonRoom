"use client";

import React, { useState, useEffect } from "react";
import { Frame } from "@/components/cr";

export function ScreenMessageSending({
  recipientName = "Amara",
  onSent,
}: {
  recipientName?: string;
  onSent?: (msg: string) => void;
}) {
  const [message, setMessage] = useState(
    "Your presentation today was actually really good, I did not expect the ending."
  );
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");

  const prompts = [
    "What's your favourite course this semester?",
    "Any study tips for upcoming tests?",
    "Best quiet spot to read on campus?",
    "Your presentation today was really inspiring!",
  ];

  const handleRandomPrompt = () => {
    const random = prompts[Math.floor(Math.random() * prompts.length)];
    setMessage(random);
  };

  const handleSend = () => {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    setTimeout(() => {
      setStatus("idle");
      onSent?.(message);
    }, 1200);
  };

  return (
    <Frame web noPadding>
      <div className="wt">
        <div className="lg">
          <span className="dots">
            <i style={{ background: "#fff" }}></i>
            <i style={{ background: "#8a8a8a" }}></i>
            <i style={{ background: "#4a4a4a" }}></i>
          </span>
          common room
        </div>
        <div className="sq">{recipientName[0]}</div>
        <h2>Send {recipientName} an anonymous message</h2>
        <p>{recipientName} won’t see who you are. No account needed.</p>
      </div>

      <div className="wc">
        {status === "failed" && (
          <div className="banner" style={{ marginBottom: 10 }}>
            Couldn’t send your message. Check your connection and try again.
          </div>
        )}
        <textarea
          className="tb"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 500))}
          placeholder={`Write an anonymous note to ${recipientName}...`}
          style={{ width: "100%", border: "1px solid #d4d4d4", outline: "none", resize: "none", font: "inherit" }}
          rows={4}
        />
        <div className="sp" style={{ margin: "8px 2px 12px" }}>
          <span
            className="cnt"
            onClick={handleRandomPrompt}
            style={{ cursor: "pointer", textDecoration: "underline" }}
          >
            Need a prompt?
          </span>
          <span className="cnt">{message.length} / 500</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span
            className={`pbtn l ${status === "sending" || !message.trim() ? "off" : ""}`}
            onClick={handleSend}
            style={{
              background: "#0b0b0b",
              color: "#fff",
              cursor: message.trim() && status !== "sending" ? "pointer" : "not-allowed",
              opacity: status === "sending" ? 0.85 : 1,
            }}
          >
            {status === "sending" && <span className="spin"></span>}
            {status === "sending" ? "Sending..." : "Send"}
          </span>
        </div>
      </div>

      <div className="priv">
        <svg className="i"><use href="#lock" /></svg>
        <span>
          Your identity is never shared with {recipientName}. Messages are private, and {recipientName} chooses whether to share anything publicly.
        </span>
      </div>
      <div className="wf">
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report abuse</span>
        <span className="lnk" style={{ cursor: "pointer" }}>Get your own link</span>
      </div>
    </Frame>
  );
}

export function ScreenMessageSent({
  recipientName = "Amara",
  onSendAnother,
}: {
  recipientName?: string;
  onSendAnother?: () => void;
}) {
  return (
    <Frame web noPadding>
      <div className="wt" style={{ paddingBottom: 70 }}>
        <div className="lg">
          <span className="dots">
            <i style={{ background: "#fff" }}></i>
            <i style={{ background: "#8a8a8a" }}></i>
            <i style={{ background: "#4a4a4a" }}></i>
          </span>
          common room
        </div>
      </div>
      <div className="wc" style={{ marginTop: -46, paddingTop: 18 }}>
        <div className="big">
          <svg className="i"><use href="#chk" /></svg>
        </div>
        <h3>Message sent</h3>
        <p className="sub">{recipientName} won’t see who you are.</p>
        <div className="mid">
          <span className="ghost l" onClick={onSendAnother} style={{ cursor: "pointer" }}>Send another</span>
          <span className="pbtn l" style={{ cursor: "pointer" }}>Get your own link</span>
        </div>
      </div>
      <div className="wf">
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report abuse</span>
        <span className="lnk" style={{ cursor: "pointer" }}>Get your own link</span>
      </div>
    </Frame>
  );
}

export function ScreenMessageSendFailed({ onRetry }: { onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      onRetry?.();
    }, 800);
  };

  return (
    <Frame web noPadding>
      <div className="wt">
        <div className="lg">
          <span className="dots">
            <i style={{ background: "#fff" }}></i>
            <i style={{ background: "#8a8a8a" }}></i>
            <i style={{ background: "#4a4a4a" }}></i>
          </span>
          common room
        </div>
        <div className="sq">A</div>
        <h2>Send Amara an anonymous message</h2>
        <p>Amara won’t see who you are. No account needed.</p>
      </div>
      <div className="wc">
        <div className="banner" style={{ marginBottom: 10 }}>
          Couldn’t send your message. Check your connection and try again. Your message is still here.
        </div>
        <div className="tb">Your presentation today was actually really good, I did not expect the ending.</div>
        <div className="sp" style={{ margin: "8px 2px 12px" }}>
          <span className="cnt"></span>
          <span className="cnt">78 / 500</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span
            className={`pbtn l ${retrying ? "off" : ""}`}
            onClick={handleRetry}
            style={{ cursor: retrying ? "default" : "pointer" }}
          >
            {retrying ? "Retrying..." : "Try again"}
          </span>
        </div>
      </div>
      <div className="wf">
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report abuse</span>
        <span className="lnk" style={{ cursor: "pointer" }}>Get your own link</span>
      </div>
    </Frame>
  );
}

export function ScreenMessageRateLimit({ initialSeconds = 590 }: { initialSeconds?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSecs = secondsLeft % 60;

  return (
    <Frame web noPadding>
      <div className="wt" style={{ paddingBottom: 70 }}>
        <div className="lg">
          <span className="dots">
            <i style={{ background: "#fff" }}></i>
            <i style={{ background: "#8a8a8a" }}></i>
            <i style={{ background: "#4a4a4a" }}></i>
          </span>
          common room
        </div>
      </div>
      <div className="wc" style={{ marginTop: -46, paddingTop: 18 }}>
        <div className="big">
          <svg className="i"><use href="#clk" /></svg>
        </div>
        <h3>Too many messages</h3>
        <p className="sub">
          You sent a few messages in a short time. You can send another in{" "}
          <b>
            {minutes}:{remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs}
          </b>.
        </p>
        <div className="mid">
          <span className="pbtn l" style={{ cursor: "pointer" }}>Get your own link</span>
        </div>
      </div>
      <div className="wf">
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report abuse</span>
        <span className="lnk" style={{ cursor: "pointer" }}>Get your own link</span>
      </div>
    </Frame>
  );
}

export function ScreenLinkTurnedOff() {
  return (
    <Frame web noPadding>
      <div className="wt" style={{ paddingBottom: 70 }}>
        <div className="lg">
          <span className="dots">
            <i style={{ background: "#fff" }}></i>
            <i style={{ background: "#8a8a8a" }}></i>
            <i style={{ background: "#4a4a4a" }}></i>
          </span>
          common room
        </div>
      </div>
      <div className="wc" style={{ marginTop: -46, paddingTop: 18 }}>
        <div className="big">
          <svg className="i"><use href="#pause" /></svg>
        </div>
        <h3>This link is turned off</h3>
        <p className="sub">This person isn’t taking anonymous messages right now. Try again later.</p>
        <div className="mid">
          <span className="pbtn l" style={{ cursor: "pointer" }}>Get your own link</span>
        </div>
      </div>
      <div className="wf">
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report abuse</span>
        <span className="lnk" style={{ cursor: "pointer" }}>Get your own link</span>
      </div>
    </Frame>
  );
}

export function ScreenLinkNotValid() {
  return (
    <Frame web noPadding>
      <div className="wt" style={{ paddingBottom: 70 }}>
        <div className="lg">
          <span className="dots">
            <i style={{ background: "#fff" }}></i>
            <i style={{ background: "#8a8a8a" }}></i>
            <i style={{ background: "#4a4a4a" }}></i>
          </span>
          common room
        </div>
      </div>
      <div className="wc" style={{ marginTop: -46, paddingTop: 18 }}>
        <div className="big">
          <svg className="i"><use href="#cx" /></svg>
        </div>
        <h3>This link isn’t valid</h3>
        <p className="sub">It may have been replaced or removed. Ask for a new link.</p>
        <div className="mid">
          <span className="pbtn l" style={{ cursor: "pointer" }}>Get your own link</span>
        </div>
      </div>
      <div className="wf">
        <span className="lnk" style={{ color: "#6b6b6b", cursor: "pointer" }}>Report abuse</span>
        <span className="lnk" style={{ cursor: "pointer" }}>Get your own link</span>
      </div>
    </Frame>
  );
}

export function WebLinkScreensGallery() {
  const screens = [
    {
      title: "20. Message typed, sending",
      component: (
        <ScreenMessageSending />
      ),
    },
    {
      title: "21. Message sent",
      component: (
        <ScreenMessageSent />
      ),
    },
    { title: "22. Couldn't send (message kept)", component: <ScreenMessageSendFailed /> },
    { title: "23. Too many messages (rate limit)", component: <ScreenMessageRateLimit /> },
    { title: "24. Link turned off", component: <ScreenLinkTurnedOff /> },
    { title: "25. Link not valid (invalid, expired or replaced)", component: <ScreenLinkNotValid /> },
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
