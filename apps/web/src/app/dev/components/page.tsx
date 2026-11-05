"use client";

import { useState } from "react";
import {
  Avatar,
  Banner,
  BottomNav,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Header,
  Input,
  ListRow,
  ProgressBar,
  Sheet,
  Skeleton,
  Tabs,
  Toast,
  Toggle,
} from "@/components/cr";

const demoTabs = [
  { key: "hot", label: "Hot" },
  { key: "trending", label: "Trending" },
  { key: "fresh", label: "Fresh" },
];

export default function ComponentsPage() {
  const [selectedChip, setSelectedChip] = useState("Room");
  const [toggleOn, setToggleOn] = useState(true);
  const [activeTab, setActiveTab] = useState("hot");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("Changes saved");

  return (
    <main className="cr-ui cr-showcase">
      <header className="cr-showcase__header">
        <h1>Common Room components</h1>
        <p>Shared design system preview · compact type · phone and desktop responsive</p>
      </header>

      <div className="cr-showcase__grid">
        <section className="cr-showcase__card">
          <h2>Button</h2>
          <div className="cr-showcase__row">
            <Button>Continue</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="pill">Save</Button>
          </div>
          <Button fullWidth>Full-width action</Button>
          <Button disabled>Unavailable</Button>
        </section>

        <section className="cr-showcase__card">
          <h2>Chip</h2>
          <div className="cr-showcase__row">
            {["Room", "Market", "Anonymous"].map((item) => (
              <Chip
                key={item}
                label={item}
                active={selectedChip === item}
                onClick={() => setSelectedChip(item)}
              />
            ))}
          </div>
        </section>

        <section className="cr-showcase__card">
          <h2>Toggle</h2>
          <div className="cr-showcase__row cr-showcase__row--spread">
            <span>Allow notifications</span>
            <Toggle on={toggleOn} onChange={setToggleOn} label="Allow notifications" />
          </div>
        </section>

        <section className="cr-showcase__card">
          <h2>Tabs</h2>
          <Tabs tabs={demoTabs} activeTab={activeTab} onChange={setActiveTab} />
          <span className="cr-showcase__nav-label">Selected: {activeTab}</span>
        </section>

        <section className="cr-showcase__card">
          <h2>Header</h2>
          <Header
            title="Room"
            showBack
            onBack={() => setNotice("Back pressed")}
            rightAction={<Button variant="ghost">Edit</Button>}
          />
        </section>

        <section className="cr-showcase__card">
          <h2>List row</h2>
          <ListRow
            icon="bell"
            label="Notifications"
            sublabel="Replies and activity"
            right={<span aria-hidden="true">›</span>}
            onClick={() => setNotice("Notifications opened")}
          />
        </section>

        <section className="cr-showcase__card">
          <h2>Avatar</h2>
          <div className="cr-showcase__row">
            <Avatar initials="A" label="Amara" />
            <Avatar initials="J" gray label="Jordan" />
            <Avatar initials="M" small label="Morgan" />
          </div>
        </section>

        <section className="cr-showcase__card">
          <h2>Sheet</h2>
          <Sheet title="Share post" modal>
            <p className="cr-showcase__nav-label">Choose where you want to share this post.</p>
            <Button variant="ghost">Copy link</Button>
          </Sheet>
        </section>

        <section className="cr-showcase__card">
          <h2>Toast</h2>
          <Toast>{notice}</Toast>
        </section>

        <section className="cr-showcase__card">
          <h2>Banner</h2>
          <Banner variant="info">Your changes are saved on this device.</Banner>
          <Banner>We couldn’t load this. Try again.</Banner>
        </section>

        <section className="cr-showcase__card">
          <h2>Input</h2>
          <Input
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@school.edu"
            message="Use your school email if you have one."
          />
        </section>

        <section className="cr-showcase__card">
          <h2>Skeleton</h2>
          <Skeleton style={{ width: "72%" }} />
          <Skeleton style={{ width: "100%", height: 88 }} />
        </section>

        <section className="cr-showcase__card">
          <h2>Empty state</h2>
          <EmptyState
            title="Nothing here yet"
            description="Saved items will show up here."
            action={<Button variant="ghost">Browse Market</Button>}
          />
        </section>

        <section className="cr-showcase__card">
          <h2>Error state</h2>
          <ErrorState
            title="Couldn’t load this"
            description="Check your connection and try again."
            onRetry={() => setNotice("Retry requested")}
          />
        </section>

        <section className="cr-showcase__card">
          <h2>Progress bar</h2>
          <ProgressBar value={64} label="Media upload" />
          <span className="cr-showcase__nav-label">64% uploaded</span>
        </section>

        <section className="cr-showcase__card">
          <h2>Bottom navigation</h2>
          <div className="cr-showcase__frame">
            <span className="cr-showcase__nav-label">Home · Room · Anonymous · Market · Me</span>
          </div>
        </section>
      </div>

      <BottomNav active="Market" />
    </main>
  );
}
