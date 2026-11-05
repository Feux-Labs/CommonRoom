"use client";

import React, { useState } from "react";
import { Frame } from "@/components/cr";

export function ScreenListingDetail({
  onBack,
  onMessage,
  initialLiked = false,
}: {
  onBack?: () => void;
  onMessage?: () => void;
  initialLiked?: boolean;
}) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div style={{ display: "flex", gap: 14 }}>
          <svg
            className="i"
            onClick={() => setIsLiked(!isLiked)}
            style={{ cursor: "pointer", fill: isLiked ? "#0b0b0b" : "none" }}
          >
            <use href="#heart" />
          </svg>
          <svg className="i" style={{ cursor: "pointer" }}><use href="#up" /></svg>
        </div>
      </div>

      <div className="tile xl">
        <svg className="i"><use href="#calc" /></svg>
      </div>

      <div className="pg">
        {[0, 1, 2].map((idx) => (
          <i
            key={idx}
            onClick={() => setActivePhoto(idx)}
            style={{
              cursor: "pointer",
              background: activePhoto === idx ? "#0b0b0b" : "#d4d4d4",
            }}
          />
        ))}
      </div>

      <p className="ttl">Casio FX-991EX calculator</p>
      <div className="pr">₦18,000</div>
      <div className="meta">
        <svg className="i"><use href="#pin" /></svg>Block C · 2h ago
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        <span className="chip">Electronics</span>
        <span className="chip">Like new</span>
      </div>
      <p className="ds">Used for one semester. Works perfectly, comes with the cover. Meet at Block C.</p>
      <div className="hr"></div>
      <div className="sell">
        <div className="a36">D</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>Daniel K.</div>
          <div className="cnt">Economics · 200L</div>
        </div>
        <span className="lnk" style={{ cursor: "pointer" }}>View profile</span>
      </div>
      <div className="bb">
        <span className="pbtn l" onClick={onMessage} style={{ cursor: "pointer" }}>Message seller</span>
        <span
          className="ghost"
          onClick={() => setIsLiked(!isLiked)}
          style={{ cursor: "pointer" }}
        >
          <svg className="i" style={{ fill: isLiked ? "#0b0b0b" : "none" }}>
            <use href="#heart" />
          </svg>
        </span>
        <span className="ghost" style={{ cursor: "pointer" }}><svg className="i"><use href="#flag" /></svg></span>
      </div>
    </Frame>
  );
}

export function ScreenSellItem({ onClose, onPost }: { onClose?: () => void; onPost?: (data: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("Like new");
  const [location, setLocation] = useState("Block C");
  const [description, setDescription] = useState("");
  const [photosCount, setPhotosCount] = useState(1);

  const canPost = title.trim().length > 0 && price.trim().length > 0;

  const handleAddPhoto = () => {
    if (photosCount < 4) setPhotosCount(photosCount + 1);
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        <span className="t">Sell an item</span>
        <span
          className={`pbtn ${canPost ? "" : "off"}`}
          onClick={() => {
            if (canPost) onPost?.({ title, category, price, condition, location, description });
          }}
          style={{ cursor: canPost ? "pointer" : "not-allowed" }}
        >
          Post
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div className="ph1 fill">
          <span className="tag">Cover</span>
        </div>
        {Array.from({ length: 3 }).map((_, i) => {
          const isUploaded = i + 1 < photosCount;
          return (
            <div
              key={i}
              className={`ph1 ${isUploaded ? "fill" : ""}`}
              onClick={handleAddPhoto}
              style={{ cursor: "pointer" }}
            >
              {isUploaded ? (
                <span style={{ fontSize: 11, fontWeight: 500 }}>Photo {i + 2}</span>
              ) : (
                <svg className="i"><use href="#plus" /></svg>
              )}
            </div>
          );
        })}
      </div>
      <p className="note" style={{ margin: "4px 0 0" }}>
        {photosCount} of 4 photos added.
      </p>

      <label>Title</label>
      <div className={`in ${title ? "v" : ""}`}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you selling?"
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
      </div>

      <div className="two">
        <div>
          <label>Category</label>
          <div className="in v">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
            >
              <option value="Electronics">Electronics</option>
              <option value="Books">Books</option>
              <option value="Furniture">Furniture</option>
              <option value="Fashion">Fashion</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label>Price</label>
          <div className={`in ${price ? "v" : ""}`}>
            <span style={{ color: "#8a8a8a", marginRight: 4 }}>₦</span>
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9,]/g, ""))}
              placeholder="0"
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
            />
          </div>
        </div>
      </div>

      <label>Condition</label>
      <div className="chips">
        {["New", "Like new", "Used"].map((cond) => (
          <span
            key={cond}
            className={`chip ${condition === cond ? "on" : ""}`}
            onClick={() => setCondition(cond)}
            style={{ cursor: "pointer" }}
          >
            {cond}
          </span>
        ))}
      </div>

      <label>Location</label>
      <div className="in v">
        <svg className="i"><use href="#pin" /></svg>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ flex: 1, marginLeft: 8, border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
        />
        <svg className="i"><use href="#chv" /></svg>
      </div>

      <label>Description</label>
      <div className="in v" style={{ height: 64, alignItems: "flex-start", paddingTop: 11 }}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details buyers should know (condition, hostel, meeting preference)..."
          style={{ width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit", resize: "none" }}
        />
      </div>
    </Frame>
  );
}

export function ScreenYourListingOwner({ onBack }: { onBack?: () => void }) {
  const [status, setStatus] = useState<"Active" | "Sold" | "Unavailable">("Active");

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Your listing</span>
        <svg className="i" style={{ cursor: "pointer" }}><use href="#more" /></svg>
      </div>
      <div className="row">
        <div className="tile d2" style={{ width: 84, height: 84, flex: "none" }}>
          <svg className="i"><use href="#fridge" /></svg>
        </div>
        <div>
          <p className="ttl">Mini fridge, barely used</p>
          <div className="pr" style={{ margin: "2px 0 6px" }}>₦95,000</div>
          <span
            className={`chip ${status === "Active" ? "on" : ""}`}
            style={{ fontSize: 11, padding: "3px 8px" }}
          >
            {status}
          </span>
        </div>
      </div>
      <div className="stats">
        <div><b>142</b>Views</div>
        <div><b>9</b>Saves</div>
        <div><b>3</b>Messages</div>
      </div>
      <div className="lr" style={{ cursor: "pointer" }}>Edit listing<svg className="i"><use href="#rt" /></svg></div>
      <div
        className="lr"
        onClick={() => setStatus(status === "Sold" ? "Active" : "Sold")}
        style={{ cursor: "pointer" }}
      >
        {status === "Sold" ? "Mark as active" : "Mark as sold"}<svg className="i"><use href="#rt" /></svg>
      </div>
      <div
        className="lr"
        onClick={() => setStatus(status === "Unavailable" ? "Active" : "Unavailable")}
        style={{ cursor: "pointer" }}
      >
        {status === "Unavailable" ? "Make available" : "Mark as unavailable"}<svg className="i"><use href="#rt" /></svg>
      </div>
      <div className="lr dn" style={{ cursor: "pointer" }}>Delete listing</div>
      <p className="note">Listings expire after 30 days. You will get a reminder to renew.</p>
    </Frame>
  );
}

export function ScreenFiltersAndSort({ onReset, onShow }: { onReset?: () => void; onShow?: (filters: Record<string, unknown>) => void }) {
  const [sortBy, setSortBy] = useState("Newest");
  const [category, setCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("All");

  const handleReset = () => {
    setSortBy("Newest");
    setCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setCondition("All");
    onReset?.();
  };

  return (
    <Frame noPadding>
      <div className="dim" style={{ padding: "10px 20px" }}>Market</div>
      <div className="sheet fl" style={{ paddingTop: 12 }}>
        <div className="grab"></div>
        <div className="sp">
          <span className="sh">Filters</span>
          <span className="lnk" onClick={handleReset} style={{ cursor: "pointer" }}>Reset</span>
        </div>

        <label>Sort by</label>
        <div className="chips">
          {["Newest", "Price: low to high", "Price: high to low", "Relevance"].map((s) => (
            <span
              key={s}
              className={`chip ${sortBy === s ? "on" : ""}`}
              onClick={() => setSortBy(s)}
              style={{ cursor: "pointer" }}
            >
              {s}
            </span>
          ))}
        </div>

        <label>Category</label>
        <div className="chips">
          {["All", "Books", "Electronics", "Furniture", "Fashion"].map((c) => (
            <span
              key={c}
              className={`chip ${category === c ? "on" : ""}`}
              onClick={() => setCategory(c)}
              style={{ cursor: "pointer" }}
            >
              {c}
            </span>
          ))}
        </div>

        <label>Price</label>
        <div className="two">
          <div className="in">
            <span style={{ color: "#8a8a8a", marginRight: 4 }}>₦</span>
            <input
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
            />
          </div>
          <div className="in">
            <span style={{ color: "#8a8a8a", marginRight: 4 }}>₦</span>
            <input
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "inherit", font: "inherit" }}
            />
          </div>
        </div>

        <label>Location</label>
        <div className="in v">
          <svg className="i"><use href="#pin" /></svg>
          <span style={{ flex: 1, marginLeft: 8 }}>Near Block C</span>
          <svg className="i"><use href="#chv" /></svg>
        </div>

        <label>Condition</label>
        <div className="chips">
          {["All", "New", "Like new", "Used"].map((cond) => (
            <span
              key={cond}
              className={`chip ${condition === cond ? "on" : ""}`}
              onClick={() => setCondition(cond)}
              style={{ cursor: "pointer" }}
            >
              {cond}
            </span>
          ))}
        </div>

        <div className="acts" style={{ marginTop: "auto" }}>
          <span
            className="pbtn l"
            onClick={() => onShow?.({ sortBy, category, minPrice, maxPrice, condition })}
            style={{ cursor: "pointer" }}
          >
            Show results
          </span>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenLocationPicker({ onClose, onDone }: { onClose?: () => void; onDone?: (loc: string) => void }) {
  const [selected, setSelected] = useState(0);
  const locations = ["Block C", "Hostel A", "Hostel B", "Faculty gate", "Main library"];

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onClose} style={{ cursor: "pointer" }}><use href="#x" /></svg>
        <span className="t">Location</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="sch"><svg className="i"><use href="#srch" /></svg>Search block, hostel or area</div>
      <div className="lr" style={{ marginTop: 8 }}>
        <span style={{ display: "flex", gap: 10, alignItems: "center", color: "#0b0b0b", cursor: "pointer" }}>
          <svg className="i"><use href="#pin" /></svg>Use my current location
        </span>
      </div>
      <p className="note" style={{ margin: "6px 2px 10px" }}>
        Your browser or phone will ask for permission. Sellers never see your location.
      </p>
      {locations.map((loc, idx) => (
        <div key={idx} className="rad" onClick={() => setSelected(idx)} style={{ cursor: "pointer" }}>
          {loc}
          <i className={selected === idx ? "on" : ""}></i>
        </div>
      ))}
      <div className="btn" style={{ marginTop: "auto", cursor: "pointer" }} onClick={() => onDone?.(locations[selected])}>
        Done
      </div>
    </Frame>
  );
}

export function ScreenSellerProfile({ onBack, onMessage }: { onBack?: () => void; onMessage?: () => void }) {
  const [tab, setTab] = useState<"Active" | "Sold">("Active");

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div style={{ display: "flex", gap: 14 }}>
          <svg className="i" style={{ cursor: "pointer" }}><use href="#more" /></svg>
        </div>
      </div>
      <div className="row" style={{ alignItems: "center" }}>
        <div className="a36" style={{ width: 60, height: 60, fontSize: 22, background: "#bdbdbd" }}>D</div>
        <div>
          <p className="ttl" style={{ fontSize: 16 }}>Daniel K.</p>
          <div className="cnt" style={{ fontSize: 12.5 }}>Economics · 200L</div>
        </div>
      </div>
      <div className="stats" style={{ margin: "14px 0 10px" }}>
        <div><b>4</b>Active</div>
        <div><b>9</b>Sold</div>
        <div><b>Jan 2026</b>Joined</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span className="pbtn l" onClick={onMessage} style={{ cursor: "pointer" }}>Message</span>
        <span className="ghost l" style={{ width: 40, padding: 0, justifyContent: "center", cursor: "pointer" }}>
          <svg className="i"><use href="#up" /></svg>
        </span>
      </div>
      <div className="tabs">
        <span className={tab === "Active" ? "a" : ""} onClick={() => setTab("Active")} style={{ cursor: "pointer" }}>Active</span>
        <span className={tab === "Sold" ? "a" : ""} onClick={() => setTab("Sold")} style={{ cursor: "pointer" }}>Sold</span>
      </div>
      <div className="g2">
        <div className="li">
          <div className="tile">
            <span className="hbtn on"><svg className="i"><use href="#heart" /></svg></span>
            <svg className="i"><use href="#calc" /></svg>
          </div>
          <div className="n">Casio FX-991EX calculator</div>
          <div className="p">₦18,000</div>
          <div className="mm">Block C</div>
        </div>
        <div className="li">
          <div className="tile d2">
            <span className="hbtn"><svg className="i"><use href="#heart" /></svg></span>
            <svg className="i"><use href="#book" /></svg>
          </div>
          <div className="n">Economics 201 Textbook</div>
          <div className="p">₦5,500</div>
          <div className="mm">Block C</div>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenSavedListings({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState([
    { id: "1", title: "Mini fridge, barely used", price: "₦95,000", loc: "Block C", icon: "fridge" },
    { id: "2", title: "Casio FX-991EX calculator", price: "₦18,000", loc: "Block C", icon: "calc" },
  ]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Saved ({items.length})</span>
        <span style={{ width: 20 }}></span>
      </div>
      {items.length === 0 ? (
        <div className="emp" style={{ marginTop: 60 }}>
          <p className="ttl">No saved items</p>
          <p className="sub">Items you like will be kept here.</p>
        </div>
      ) : (
        <div className="g2">
          {items.map((it) => (
            <div key={it.id} className="li">
              <div className="tile d2">
                <span className="hbtn on" onClick={() => removeItem(it.id)} style={{ cursor: "pointer" }}>
                  <svg className="i"><use href="#heart" /></svg>
                </span>
                <svg className="i"><use href={`#${it.icon}`} /></svg>
              </div>
              <div className="n">{it.title}</div>
              <div className="p">{it.price}</div>
              <div className="mm">{it.loc}</div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

export function ScreenMarketNoResults({ onClear, onSell }: { onClear?: () => void; onSell?: () => void }) {
  const [query, setQuery] = useState("ps5 controller");

  return (
    <Frame>
      <div className="hd" style={{ justifyContent: "flex-start" }}>
        <span className="t" style={{ fontSize: 20, fontWeight: 400 }}>Market</span>
      </div>
      <div className="sch" style={{ color: "#0b0b0b" }}>
        <svg className="i"><use href="#srch" /></svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" }}
        />
      </div>
      <div className="cat">
        <span className="chip on">All</span>
        <span className="chip">Books</span>
        <span className="chip">Electronics</span>
        <span className="chip">Furniture</span>
      </div>
      <div className="emp">
        <div className="big" style={{ marginBottom: 10, width: 52, height: 52, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "auto", marginRight: "auto" }}>
          <svg className="i"><use href="#srch" /></svg>
        </div>
        <p className="ttl">No listings for “{query}”</p>
        <p className="sub" style={{ margin: "4px 0 14px" }}>Try broadening your search or check other categories.</p>
        <div className="mid">
          <span className="ghost l" onClick={onClear} style={{ cursor: "pointer" }}>Clear filters</span>
          <span className="pbtn l" onClick={onSell} style={{ cursor: "pointer" }}>Sell yours</span>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenListingSold({ onBack, onSeeSimilar }: { onBack?: () => void; onSeeSimilar?: () => void }) {
  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div style={{ display: "flex", gap: 14 }}>
          <svg className="i" style={{ cursor: "pointer" }}><use href="#up" /></svg>
        </div>
      </div>
      <div className="tile xl d3">
        <span className="tag">Sold</span>
        <svg className="i"><use href="#lamp" /></svg>
      </div>
      <div className="inf">This item has been sold. You can no longer message the seller.</div>
      <p className="ttl" style={{ color: "#6b6b6b" }}>Hostel desk lamp</p>
      <div className="pr" style={{ color: "#8a8a8a" }}>₦4,000</div>
      <div className="meta"><svg className="i"><use href="#pin" /></svg>Hostel A · 2 days ago</div>
      <div className="hr"></div>
      <div className="sell">
        <div className="a36">T</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>Tolu A.</div>
          <div className="cnt">Law · 100L</div>
        </div>
        <span className="lnk" style={{ cursor: "pointer" }}>View profile</span>
      </div>
      <div className="bb">
        <span className="pbtn l off">Sold</span>
        <span
          className="ghost l"
          onClick={onSeeSimilar}
          style={{ width: "auto", padding: "0 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
        >
          See similar items
        </span>
      </div>
    </Frame>
  );
}

export function ScreenMarketConversations({
  onBack,
  onSelectChat,
}: {
  onBack?: () => void;
  onSelectChat?: (id: string) => void;
}) {
  const [tab, setTab] = useState<"All" | "Buying" | "Selling">("All");

  const chats = [
    { id: "daniel", name: "Daniel K.", item: "Casio calculator", msg: "Is it still available?", time: "2m", unread: 2, type: "Buying" },
    { id: "tolu", name: "Tolu A.", item: "Mini fridge", msg: "I can do ₦90,000", time: "1h", unread: 1, type: "Selling" },
    { id: "amaka", name: "Amaka O.", item: "Econometrics textbook", msg: "Meet at the library?", time: "Yesterday", unread: 0, type: "Buying" },
    { id: "emeka", name: "Emeka N.", item: "Hostel desk lamp", msg: "This item was sold", time: "2 days", unread: 0, sold: true, type: "Buying" },
  ];

  const filtered = tab === "All" ? chats : chats.filter((c) => c.type === tab);

  return (
    <Frame>
      <div className="hd">
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <span className="t">Messages</span>
        <span style={{ width: 20 }}></span>
      </div>
      <div className="tabs" style={{ marginTop: -4 }}>
        <span className={tab === "All" ? "a" : ""} onClick={() => setTab("All")} style={{ cursor: "pointer" }}>All</span>
        <span className={tab === "Buying" ? "a" : ""} onClick={() => setTab("Buying")} style={{ cursor: "pointer" }}>Buying</span>
        <span className={tab === "Selling" ? "a" : ""} onClick={() => setTab("Selling")} style={{ cursor: "pointer" }}>Selling</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map((c) => (
          <div
            key={c.id}
            className="ch"
            onClick={() => onSelectChat?.(c.id)}
            style={{ cursor: "pointer", opacity: c.sold ? 0.6 : 1 }}
          >
            <div className="a36">{c.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="n">
                {c.name} <span className="cnt">· {c.item}</span>
              </div>
              <div className="s">{c.msg}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="tm2">{c.time}</div>
              {c.unread > 0 && (
                <div className="ub" style={{ marginLeft: "auto", marginTop: 3 }}>
                  {c.unread}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="note c" style={{ marginTop: "auto" }}>Report or block anyone from inside a chat.</p>
    </Frame>
  );
}

export function ScreenChatWithSeller({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState([
    { id: "1", from: "them", text: "Hi, is this still available?" },
    { id: "2", from: "me", text: "Yes it is. Can you meet at Block C?" },
    { id: "3", from: "them", text: "Sure, tomorrow at 2pm." },
  ]);
  const [inputText, setInputText] = useState("");

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), from: "me", text: text.trim() }]);
    setInputText("");
  };

  return (
    <Frame>
      <div className="hd" style={{ justifyContent: "flex-start", gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="a36 s">D</div>
        <div style={{ flex: 1 }}>
          <div className="t" style={{ fontSize: 13.5 }}>Daniel K.</div>
          <div className="cnt">Seller</div>
        </div>
        <svg className="i" style={{ cursor: "pointer" }}><use href="#more" /></svg>
      </div>

      <div className="lc">
        <div className="tile d3"><svg className="i"><use href="#calc" /></svg></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5 }}>Casio FX-991EX calculator</div>
          <div className="cnt">₦18,000 · Block C</div>
        </div>
        <span className="lnk" style={{ cursor: "pointer" }}>View</span>
      </div>

      <div className="tm">Today</div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {messages.map((m) => (
          <div key={m.id} className={`bub ${m.from === "me" ? "me" : "in2"}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        <div className="chips" style={{ marginBottom: 8 }}>
          <span
            className="chip"
            onClick={() => handleSend("Is the price negotiable?")}
            style={{ cursor: "pointer" }}
          >
            Is the price negotiable?
          </span>
          <span
            className="chip"
            onClick={() => handleSend("Where can we meet?")}
            style={{ cursor: "pointer" }}
          >
            Where can we meet?
          </span>
        </div>
        <div className="bar" style={{ marginTop: 0 }}>
          <input
            className="in"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message..."
            style={{ border: "none", outline: "none", background: "#f6f6f6", flex: 1, padding: "0 12px" }}
          />
          <svg
            className="i"
            onClick={() => handleSend()}
            style={{ cursor: inputText.trim() ? "pointer" : "default", opacity: inputText.trim() ? 1 : 0.4 }}
          >
            <use href="#send" />
          </svg>
        </div>
      </div>
    </Frame>
  );
}

export function ScreenChatListingSold({ onBack }: { onBack?: () => void }) {
  return (
    <Frame>
      <div className="hd" style={{ justifyContent: "flex-start", gap: 10 }}>
        <svg className="i" onClick={onBack} style={{ cursor: "pointer" }}><use href="#back" /></svg>
        <div className="a36 s">T</div>
        <div style={{ flex: 1 }}>
          <div className="t" style={{ fontSize: 13.5 }}>Tolu A.</div>
          <div className="cnt">Seller</div>
        </div>
        <svg className="i" style={{ cursor: "pointer" }}><use href="#more" /></svg>
      </div>
      <div className="lc">
        <div className="tile d3">
          <span className="tag" style={{ top: 2, left: 2, padding: "1px 5px", fontSize: 9 }}>Sold</span>
          <svg className="i"><use href="#calc" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5 }}>Casio FX-991EX calculator</div>
          <div className="cnt">₦18,000 · Block C</div>
        </div>
        <span className="lnk" style={{ cursor: "pointer" }}>View</span>
      </div>
      <div className="bub in2">Hi, is the lamp still available?</div>
      <div className="bub me">Yes, come tomorrow.</div>
      <div className="toast" style={{ background: "#f3f3f3", color: "#6b6b6b", marginTop: 14 }}>
        This item was sold
      </div>
      <div className="inf" style={{ marginTop: "auto" }}>
        You can no longer send messages about this listing. You can still report the chat.
      </div>
      <div className="bar" style={{ marginTop: 0, opacity: 0.5 }}>
        <div className="in" style={{ background: "#f3f3f3" }}>Messaging is off</div>
        <svg className="i"><use href="#send" /></svg>
      </div>
    </Frame>
  );
}

export function MarketScreensGallery() {
  const screens = [
    { title: "26. Listing detail", component: <ScreenListingDetail /> },
    { title: "27. Sell an item", component: <ScreenSellItem /> },
    { title: "28. Your listing (owner)", component: <ScreenYourListingOwner /> },
    { title: "29. Filters and sort", component: <ScreenFiltersAndSort /> },
    { title: "30. Location picker", component: <ScreenLocationPicker /> },
    { title: "31. Seller profile", component: <ScreenSellerProfile /> },
    { title: "32. Saved listings", component: <ScreenSavedListings /> },
    { title: "33. No results", component: <ScreenMarketNoResults /> },
    { title: "34. Listing sold", component: <ScreenListingSold /> },
    { title: "35. Market conversations", component: <ScreenMarketConversations /> },
    { title: "36. Chat with seller", component: <ScreenChatWithSeller /> },
    { title: "37. Chat, listing sold", component: <ScreenChatListingSold /> },
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
