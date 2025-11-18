import React, { useMemo, useState } from "react";
import type { ApiProvider, ApiSlotGame } from "../../types/api";
import type { GameContext } from "../types";

interface Props {
  providers: ApiProvider[];
  selectedProvider: string | null;
  slots: ApiSlotGame[];
  active: boolean;
  onSelectProvider: (providerId: string) => void;
  onSelectGame: (game: GameContext) => void;
}

const PROVIDER_META: Record<
  string,
  { tagline: string; stats: Array<{ label: string; value: string }> }
> = {
  "provider-a": {
    tagline: "Fruit-forward jackpots, radiant neon reels and upbeat soundtracks.",
    stats: [
      { label: "Top RTP", value: "96.4%" },
      { label: "Hit frequency", value: "27%" },
      { label: "Jackpots", value: "Hourly drops" }
    ]
  },
  "provider-b": {
    tagline: "High-volatility thunder spins and regal table crossovers.",
    stats: [
      { label: "Top RTP", value: "95.2%" },
      { label: "Hit frequency", value: "21%" },
      { label: "Jackpots", value: "Daily mega" }
    ]
  }
};

const SLOT_CATEGORIES = ["all", "jackpot", "branded", "classic"] as const;

const CATEGORY_MAP: Record<string, (typeof SLOT_CATEGORIES)[number]> = {
  "fruit-slots": "classic",
  "diamond-riches": "jackpot",
  "thunder-strike": "branded",
  "royal-crown": "jackpot",
  "lucky-wheel": "classic"
};

const SlotsPanel: React.FC<Props> = ({
  providers,
  selectedProvider,
  slots,
  active,
  onSelectProvider,
  onSelectGame
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof SLOT_CATEGORIES)[number]>("all");

  const filteredSlots = useMemo(() => {
    const term = search.trim().toLowerCase();
    return slots.filter(slot => {
      const matchesSearch = term ? slot.name.toLowerCase().includes(term) : true;
      const slotCategory = CATEGORY_MAP[slot.id] ?? "classic";
      const matchesCategory = category === "all" || slotCategory === category;
      return matchesSearch && matchesCategory;
    });
  }, [slots, search, category]);

  const providerMeta = selectedProvider ? PROVIDER_META[selectedProvider] : undefined;

  return (
    <section className={`panel ${active ? "active" : ""}`}>
      <div className="providers-wrapper">
        <aside>
          <h3>Premium providers</h3>
          <div className="providers-grid">
            {providers.map(provider => (
              <div
                key={provider.id}
                className={`provider-card ${selectedProvider === provider.id ? "active" : ""}`}
                onClick={() => onSelectProvider(provider.id)}
              >
                <h4>{provider.name}</h4>
                <p className="muted">{provider.description ?? ""}</p>
                <small>{provider.gamesCount} games</small>
              </div>
            ))}
            {!providers.length && <p className="history-empty">No providers available right now.</p>}
          </div>
      </aside>
      <div>
        <h3>Slot catalogue</h3>
        {providerMeta && (
          <div className="provider-detail card">
            <p className="muted">{providerMeta.tagline}</p>
            <div className="provider-stats">
              {providerMeta.stats.map(stat => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="search-bar">
          <input
            className="input search-input"
            type="search"
            placeholder="Search for branded slots..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <div className="category-chips">
          {SLOT_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`category-chip ${category === cat ? "active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <div className="cards-grid">
          {filteredSlots.map(game => (
            <div
                key={game.id}
                className="game-card"
                onClick={() =>
                  onSelectGame({
                    id: game.id,
                    name: game.name,
                    minBet: game.minBet,
                    maxBet: game.maxBet,
                    providerName: providers.find(p => p.id === selectedProvider)?.name
                  })
                }
              >
                <h4>{game.name}</h4>
                <p className="muted">{game.description ?? ""}</p>
                <p className="label">
                  Bets {game.minBet} – {game.maxBet}
                </p>
              </div>
            ))}
            {!filteredSlots.length && (
              <p className="history-empty">No slots match this search. Try another keyword.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SlotsPanel;
