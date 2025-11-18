import React from "react";

const ITEMS = [
  { label: "Overview", icon: "🔍" },
  { label: "Favorites", icon: "⭐" },
  { label: "Top games", icon: "🔥" },
  { label: "All games", icon: "🎲" },
  { label: "Amusnet hits", icon: "👑" },
  { label: "Tournaments", icon: "🏆" },
  { label: "New arrivals", icon: "🆕" },
  { label: "Bonus store", icon: "🎁" }
];

const SidebarNav: React.FC = () => (
  <aside className="sidebar-nav">
    {ITEMS.map((item, index) => (
      <button key={item.label} type="button" className={index === 0 ? "active" : ""}>
        <span className="icon">{item.icon}</span>
        <span>{item.label}</span>
      </button>
    ))}
  </aside>
);

export default SidebarNav;
