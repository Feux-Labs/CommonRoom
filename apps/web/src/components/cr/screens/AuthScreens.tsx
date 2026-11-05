"use client";

import React, { useState, useEffect, useRef } from "react";
import { Frame } from "@/components/cr";

export function ScreenCreateEmail({
  onContinue,
  onSignIn,
}: {
  onContinue?: (email: string) => void;
  onSignIn?: () => void;
}) {
  const [email, setEmail] = useState("you@school.edu");
  const isValid = email.includes("@") && email.includes(".");

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="a"></i>
        <i></i>
        <i></i>
      </div>
      <h2>Create your account</h2>
      <p className="sub">Use your school email if you have one.</p>
      <label>Email</label>
      <div className={`in ${email ? "v" : ""}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>
      <div
        className={`btn ${isValid ? "" : "off"}`}
        onClick={() => {
          if (isValid) onContinue?.(email);
        }}
        style={{ cursor: isValid ? "pointer" : "not-allowed" }}
      >
        Continue
      </div>
      <div className="foot">
        Already have an account? <u onClick={onSignIn} style={{ cursor: "pointer" }}>Sign in</u>
      </div>
    </Frame>
  );
}

export function ScreenCreatePassword({ onContinue }: { onContinue?: (pwd: string) => void }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);

  // Dynamic validation rules based on user input
  const hasMinLen = pwd.length >= 8;
  const hasNumber = /\d/.test(pwd);
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const isValid = hasMinLen && hasNumber && hasLetter;

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="b"></i>
        <i className="a"></i>
        <i></i>
      </div>
      <h2>Set a password</h2>
      <p className="sub">You will use it to sign in.</p>
      <label>Password</label>
      <div className={`in ${pwd ? "v" : ""}`}>
        <input
          type={show ? "text" : "password"}
          value={pwd}
          placeholder="Enter a strong password"
          onChange={(e) => setPwd(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
        <svg
          onClick={() => setShow(!show)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b6b6b"
          strokeWidth="1.5"
          style={{ cursor: "pointer", width: 16, height: 16, flexShrink: 0 }}
        >
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <ul className="rules">
        <li className={hasMinLen ? "ok" : ""}>At least 8 characters {hasMinLen && "✓"}</li>
        <li className={hasNumber ? "ok" : ""}>One number {hasNumber && "✓"}</li>
        <li className={hasLetter ? "ok" : ""}>One letter {hasLetter && "✓"}</li>
      </ul>
      <div
        className={`btn ${isValid ? "" : "off"}`}
        onClick={() => {
          if (isValid) onContinue?.(pwd);
        }}
        style={{ cursor: isValid ? "pointer" : "not-allowed" }}
      >
        Continue
      </div>
    </Frame>
  );
}

export function ScreenCreateUsername({ onCreate }: { onCreate?: (data: { fullName: string; username: string }) => void }) {
  const [fullName, setFullName] = useState("Amara Okoye");
  const [username, setUsername] = useState("amara");

  const cleanHandle = username.replace(/^@/, "").toLowerCase();
  const isAvailable = cleanHandle.length >= 3 && !["admin", "mod", "commonroom"].includes(cleanHandle);

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="b"></i>
        <i className="b"></i>
        <i className="a"></i>
      </div>
      <h2>Pick a username</h2>
      <p className="sub">This is how people find you. You can change it later.</p>
      <label>Full name</label>
      <div className="in v">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>
      <label>Username</label>
      <div className="in v">
        <span style={{ color: "#8a8a8a", marginRight: 2 }}>@</span>
        <input
          value={cleanHandle}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""))}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>
      {cleanHandle.length >= 3 ? (
        <p className={`msg ${isAvailable ? "ok" : "e"}`}>
          {isAvailable ? `@${cleanHandle} is available ✓` : `@${cleanHandle} is reserved`}
        </p>
      ) : (
        <p className="msg">Minimum 3 characters</p>
      )}
      <div
        className={`btn ${isAvailable && fullName ? "" : "off"}`}
        onClick={() => {
          if (isAvailable && fullName) onCreate?.({ fullName, username: cleanHandle });
        }}
        style={{ cursor: isAvailable && fullName ? "pointer" : "not-allowed" }}
      >
        Create account
      </div>
      <div className="foot">
        By continuing you agree to the <u>Terms</u> and <u>Community Guidelines</u>.
      </div>
    </Frame>
  );
}

export function ScreenVerifyEmail({ onVerify, onResend }: { onVerify?: (code: string) => void; onResend?: () => void }) {
  const [digits, setDigits] = useState(["4", "8", "1", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState(3);
  const [countdown, setCountdown] = useState(42);

  // Dynamic countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (val: string, index: number) => {
    const digit = val.slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    if (digit && index < 5) {
      setActiveIndex(index + 1);
    }
  };

  const code = digits.join("");
  const isComplete = code.length === 6 && digits.every((d) => d !== "");

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <h2>Check your email</h2>
      <p className="sub">We sent a 6-digit code to amara@school.edu.</p>

      <div className="otp">
        {digits.map((d, i) => (
          <b
            key={i}
            className={i === activeIndex ? "cur" : ""}
            onClick={() => setActiveIndex(i)}
            style={{ position: "relative" }}
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(e.target.value, i)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
              }}
            />
            {d}
          </b>
        ))}
      </div>

      <p className="msg">Code expires in 10 minutes.</p>

      <div
        className={`btn ${isComplete ? "" : "off"}`}
        onClick={() => {
          if (isComplete) onVerify?.(code);
        }}
        style={{ cursor: isComplete ? "pointer" : "not-allowed" }}
      >
        Verify
      </div>

      <div className="r c">
        {countdown > 0 ? (
          <span className="lnk" style={{ color: "#6b6b6b" }}>
            Resend code in 0:{countdown < 10 ? `0${countdown}` : countdown}
          </span>
        ) : (
          <span
            className="lnk"
            onClick={() => {
              setCountdown(45);
              onResend?.();
            }}
            style={{ cursor: "pointer", fontWeight: 500 }}
          >
            Resend code now
          </span>
        )}
      </div>

      <div className="foot">
        <u style={{ cursor: "pointer" }}>Use a different email</u>
      </div>
    </Frame>
  );
}

export function ScreenOnboardingInterests({ onContinue }: { onContinue?: (selected: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(["Study tips", "Tech", "Career"]);
  const interests = [
    "Study tips",
    "Tech",
    "Campus life",
    "Career",
    "Music",
    "Sports",
    "Comedy",
    "Hostel life",
    "Events",
    "Creative writing",
    "Anime",
    "Politics",
  ];

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const canContinue = selected.length >= 3;

  return (
    <Frame>
      <div className="dots" style={{ marginTop: 6 }}>
        <i className="a"></i>
        <i></i>
        <i></i>
      </div>
      <h2>What are you into?</h2>
      <p className="sub">
        Pick at least 3. This shapes your feed ({selected.length} selected).
      </p>
      <div className="chips">
        {interests.map((item) => (
          <span
            key={item}
            className={`chip ${selected.includes(item) ? "on" : ""}`}
            onClick={() => toggle(item)}
            style={{ cursor: "pointer" }}
          >
            {item} {selected.includes(item) && "✓"}
          </span>
        ))}
      </div>
      <div
        className={`btn ${canContinue ? "" : "off"}`}
        style={{ marginTop: "auto", cursor: canContinue ? "pointer" : "not-allowed" }}
        onClick={() => {
          if (canContinue) onContinue?.(selected);
        }}
      >
        {canContinue ? "Continue" : `Pick ${3 - selected.length} more`}
      </div>
    </Frame>
  );
}

export function ScreenOnboardingSchool({
  onContinue,
  onSkip,
}: {
  onContinue?: (data: { school: string; dept: string; level: string }) => void;
  onSkip?: () => void;
}) {
  const [school, setSchool] = useState("University of Abuja");
  const [dept, setDept] = useState("Computer Science");
  const [level, setLevel] = useState("300L");

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="b"></i>
        <i className="a"></i>
        <i></i>
      </div>
      <h2>Where do you study?</h2>
      <p className="sub">Optional. Skip if you are not in school.</p>

      <label>School</label>
      <div className="in v">
        <input
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" }}
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.5" style={{ width: 16, height: 16 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      <label>Department</label>
      <div className="in v">
        <input
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          placeholder="e.g. Computer Science"
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" }}
        />
      </div>

      <label>Level</label>
      <div className="in v">
        <input
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          placeholder="e.g. 100L, 200L, 300L"
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" }}
        />
      </div>

      <p className="msg">Shown on your profile. You can hide it in Privacy settings.</p>

      <div
        className="btn"
        style={{ marginTop: "auto", cursor: "pointer" }}
        onClick={() => onContinue?.({ school, dept, level })}
      >
        Continue
      </div>
      <div className="r c">
        <span className="lnk" onClick={onSkip} style={{ cursor: "pointer" }}>
          Skip for now
        </span>
      </div>
    </Frame>
  );
}

export function ScreenOnboardingPhoto({ onFinish, onSkip }: { onFinish?: (photoUrl?: string) => void; onSkip?: () => void }) {
  const [photoSelected, setPhotoSelected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoSelected(true);
    }
  };

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="b"></i>
        <i className="b"></i>
        <i className="a"></i>
      </div>
      <h2>Add a photo</h2>
      <p className="sub">Helps people recognise you. JPG or PNG, up to 5 MB.</p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      <div
        className="av"
        onClick={() => fileInputRef.current?.click()}
        style={{
          cursor: "pointer",
          background: photoSelected ? "#0b0b0b" : "#f0f0f0",
          color: photoSelected ? "#fff" : "#0b0b0b",
          fontSize: photoSelected ? 32 : "inherit",
        }}
      >
        {photoSelected ? (
          "A"
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.5" style={{ width: 26, height: 26 }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </div>

      <div className="c">
        <span
          className="ghost"
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          {photoSelected ? "Change photo" : "Choose photo"}
        </span>
      </div>

      <div
        className="btn"
        style={{ marginTop: "auto", cursor: "pointer" }}
        onClick={() => onFinish?.(photoSelected ? "selected" : undefined)}
      >
        Finish
      </div>
      <div className="r c">
        <span className="lnk" onClick={onSkip} style={{ cursor: "pointer" }}>
          Skip for now
        </span>
      </div>
    </Frame>
  );
}

export function ScreenForgotPassword({ onSendCode, onSignIn }: { onSendCode?: (email: string) => void; onSignIn?: () => void }) {
  const [email, setEmail] = useState("you@school.edu");

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="a"></i>
        <i className="b"></i>
        <i></i>
      </div>
      <h2>Reset your password</h2>
      <p className="sub">Enter your email and we will send a reset code.</p>
      <label>Email</label>
      <div className="in v">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>
      <div
        className="btn"
        style={{ cursor: email ? "pointer" : "not-allowed" }}
        onClick={() => onSendCode?.(email)}
      >
        Send code
      </div>
      <div className="foot">
        Remembered it? <u onClick={onSignIn} style={{ cursor: "pointer" }}>Sign in</u>
      </div>
    </Frame>
  );
}

export function ScreenResetPassword({ onUpdate }: { onUpdate?: (pwd: string) => void }) {
  const [code] = useState("502917");
  const [pwd, setPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const passwordsMatch = pwd === confirmPwd && pwd.length > 0;
  const showError = confirmPwd.length > 0 && !passwordsMatch;

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <h2>New password</h2>
      <p className="sub">Enter the code we sent, then choose a new password.</p>
      <label>Code</label>
      <div className="otp" style={{ marginTop: 0 }}>
        {code.split("").map((c, i) => (
          <b key={i}>{c}</b>
        ))}
      </div>
      <label>New password</label>
      <div className={`in ${pwd ? "v" : ""}`}>
        <input
          type={showPwd ? "text" : "password"}
          value={pwd}
          placeholder="New password"
          onChange={(e) => setPwd(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
        <svg
          onClick={() => setShowPwd(!showPwd)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b6b6b"
          strokeWidth="1.5"
          style={{ cursor: "pointer", width: 16, height: 16 }}
        >
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      <label>Confirm password</label>
      <div className={`in ${showError ? "e" : ""} ${confirmPwd ? "v" : ""}`}>
        <input
          type="password"
          value={confirmPwd}
          placeholder="Confirm new password"
          onChange={(e) => setConfirmPwd(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>
      {showError && <p className="msg e">Passwords do not match.</p>}
      {passwordsMatch && <p className="msg ok">Passwords match ✓</p>}

      <div
        className={`btn ${passwordsMatch ? "" : "off"}`}
        style={{ cursor: passwordsMatch ? "pointer" : "not-allowed" }}
        onClick={() => {
          if (passwordsMatch) onUpdate?.(pwd);
        }}
      >
        Update password
      </div>
    </Frame>
  );
}

export function ScreenSignInError({ onSignIn, onForgot }: { onSignIn?: () => void; onForgot?: () => void }) {
  const [identifier, setIdentifier] = useState("amara@school.edu");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("Email or password is incorrect. Check them and try again.");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <Frame>
      <svg className="back" viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.6">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <div className="dots">
        <i className="a"></i>
        <i className="b"></i>
        <i></i>
      </div>
      <h2>Welcome back</h2>
      <p className="sub">Sign in to pick up where you left off.</p>

      {errorMessage && <div className="banner">{errorMessage}</div>}

      <label>Email or username</label>
      <div className={`in ${errorMessage ? "e" : ""} v`}>
        <input
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setErrorMessage("");
          }}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>

      <label>Password</label>
      <div className={`in ${errorMessage ? "e" : ""} ${password ? "v" : ""}`}>
        <input
          type={showPwd ? "text" : "password"}
          value={password}
          placeholder="Your password"
          onChange={(e) => {
            setPassword(e.target.value);
            setErrorMessage("");
          }}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
        <svg
          onClick={() => setShowPwd(!showPwd)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b6b6b"
          strokeWidth="1.5"
          style={{ cursor: "pointer", width: 16, height: 16 }}
        >
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      <div className="r">
        <span className="lnk" onClick={onForgot} style={{ cursor: "pointer" }}>
          Forgot password?
        </span>
      </div>

      <div className="btn" style={{ cursor: "pointer" }} onClick={onSignIn}>
        Sign in
      </div>

      <p className="msg c" style={{ marginTop: 12 }}>
        Other states: email not verified (shows Resend code), account suspended (shows reason and Contact support), too many attempts (try again in 5 minutes).
      </p>
    </Frame>
  );
}

export function ScreenSessionExpired({ onSignIn, onWelcome }: { onSignIn?: () => void; onWelcome?: () => void }) {
  return (
    <Frame>
      <div className="ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" strokeWidth="1.5" style={{ width: 26, height: 26 }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
      <h2 className="c">You were signed out</h2>
      <p className="sub c">Your session expired. Sign in again to continue.</p>
      <div className="btn" style={{ cursor: "pointer" }} onClick={onSignIn}>
        Sign in
      </div>
      <div className="foot">
        <u onClick={onWelcome} style={{ cursor: "pointer" }}>Back to welcome</u>
      </div>
    </Frame>
  );
}

export function AuthScreensGallery() {
  const screens = [
    { title: "1. Create account, email", component: <ScreenCreateEmail /> },
    { title: "2. Create account, password", component: <ScreenCreatePassword /> },
    { title: "3. Create account, username", component: <ScreenCreateUsername /> },
    { title: "4. Verify email", component: <ScreenVerifyEmail /> },
    { title: "5. Onboarding, interests", component: <ScreenOnboardingInterests /> },
    { title: "6. Onboarding, school", component: <ScreenOnboardingSchool /> },
    { title: "7. Onboarding, photo", component: <ScreenOnboardingPhoto /> },
    { title: "8. Forgot password", component: <ScreenForgotPassword /> },
    { title: "9. Reset password", component: <ScreenResetPassword /> },
    { title: "10. Sign-in error states", component: <ScreenSignInError /> },
    { title: "11. Session expired", component: <ScreenSessionExpired /> },
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
