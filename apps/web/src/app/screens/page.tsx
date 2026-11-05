"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AuthScreensGallery,
  CoreActionScreensGallery,
  WebLinkScreensGallery,
  MarketScreensGallery,
  ProfileSettingsScreensGallery,
  DiscoveryScreensGallery,
  AdminScreensGallery,
  FeedStateScreensGallery,
} from "@/components/cr";

type SectionKey =
  | "all"
  | "auth"
  | "actions"
  | "weblink"
  | "market"
  | "profile"
  | "discovery"
  | "admin"
  | "feed";

interface SectionInfo {
  key: SectionKey;
  label: string;
  range: string;
  count: number;
  component: React.ReactNode;
}

export default function ScreensShowcasePage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const sections: SectionInfo[] = [
    {
      key: "auth",
      label: "1. Auth & Onboarding",
      range: "1–11",
      count: 11,
      component: <AuthScreensGallery />,
    },
    {
      key: "actions",
      label: "2. Core Actions",
      range: "12–19",
      count: 8,
      component: <CoreActionScreensGallery />,
    },
    {
      key: "weblink",
      label: "3. Web & Anonymous Links",
      range: "20–25",
      count: 6,
      component: <WebLinkScreensGallery />,
    },
    {
      key: "market",
      label: "4. Marketplace & Seller Chat",
      range: "26–37",
      count: 12,
      component: <MarketScreensGallery />,
    },
    {
      key: "profile",
      label: "5. Profile & Settings",
      range: "38–53",
      count: 16,
      component: <ProfileSettingsScreensGallery />,
    },
    {
      key: "discovery",
      label: "6. Discovery & Notifications",
      range: "54–61",
      count: 8,
      component: <DiscoveryScreensGallery />,
    },
    {
      key: "admin",
      label: "7. Web Admin Dashboard",
      range: "62–67",
      count: 6,
      component: <AdminScreensGallery />,
    },
    {
      key: "feed",
      label: "8. Feed States & Retention",
      range: "68–77",
      count: 10,
      component: <FeedStateScreensGallery />,
    },
  ];

  const visibleSections =
    activeSection === "all"
      ? sections
      : sections.filter((s) => s.key === activeSection);

  return (
    <div className="cr-page" style={{ minHeight: "100vh", background: "#f3f3f3" }}>
      {/* Sticky Top Navigation & Controls */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#ffffff",
          borderBottom: "1px solid #d4d4d4",
          padding: "12px 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link
                href="/nav"
                style={{
                  fontSize: 12,
                  color: "#6b6b6b",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 500,
                }}
              >
                ← Back to App Nav
              </Link>
              <span style={{ color: "#d4d4d4" }}>|</span>
              <span
                style={{
                  fontSize: 11,
                  background: "#0b0b0b",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 500,
                }}
              >
                77 Interactive Screens
              </span>
              <span
                style={{
                  fontSize: 11,
                  background: "#e6f4ea",
                  color: "#137333",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 500,
                }}
              >
                ✓ Dynamic State Enabled
              </span>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 0", color: "#0b0b0b" }}>
              Common Room — Next.js Monochrome System
            </h1>
          </div>

          {/* Quick Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="Filter by section or screen..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                height: 34,
                padding: "0 12px",
                border: "1px solid #d4d4d4",
                borderRadius: 20,
                fontSize: 13,
                outline: "none",
                width: 220,
                background: "#f9f9f9",
              }}
            />
          </div>
        </div>

        {/* Section Tabs */}
        <div
          style={{
            maxWidth: 1400,
            margin: "10px auto 0",
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <button
            onClick={() => setActiveSection("all")}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: activeSection === "all" ? "#0b0b0b" : "#d4d4d4",
              background: activeSection === "all" ? "#0b0b0b" : "#fff",
              color: activeSection === "all" ? "#fff" : "#0b0b0b",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All Screens (77)
          </button>

          {sections.map((sec) => {
            const isActive = activeSection === sec.key;
            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1px solid",
                  borderColor: isActive ? "#0b0b0b" : "#d4d4d4",
                  background: isActive ? "#0b0b0b" : "#fff",
                  color: isActive ? "#fff" : "#0b0b0b",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {sec.label} ({sec.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <main style={{ maxWidth: 1400, margin: "24px auto", padding: "0 20px 80px" }}>
        {visibleSections.map((sec) => (
          <section key={sec.key} style={{ marginBottom: 48 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                borderBottom: "2px solid #0b0b0b",
                paddingBottom: 8,
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#0b0b0b" }}>
                  {sec.label}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b6b6b" }}>
                  Screens {sec.range} · {sec.count} interactive screens
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#6b6b6b" }}>
                Interactive Preview
              </span>
            </div>

            {/* Gallery Component */}
            {sec.component}
          </section>
        ))}
      </main>
    </div>
  );
}

