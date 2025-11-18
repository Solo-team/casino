import React from "react";
import type { PanelId } from "../types";

interface Props {
  active: PanelId;
  onChange: (panel: PanelId) => void;
}

const TABS: { id: PanelId; label: string }[] = [
  { id: "games", label: "Table games" },
  { id: "slots", label: "Slots" },
  { id: "history", label: "History" },
  { id: "wallet", label: "Wallet" }
];

const PanelTabs: React.FC<Props> = ({ active, onChange }) => (
  <div className="panel-switcher">
    {TABS.map(tab => (
      <button
        key={tab.id}
        className={`tab ${active === tab.id ? "active" : ""}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default PanelTabs;
