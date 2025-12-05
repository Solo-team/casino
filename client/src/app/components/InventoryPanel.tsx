import React, { useMemo, useState } from "react";
import type { ApiGameResult, NftSymbolSummary } from "../../types/api";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  history: ApiGameResult[];
  className?: string;
}

type RarityFilter = "all" | NftSymbolSummary["rarity"];

interface InventoryItem extends NftSymbolSummary {
  count: number;
  firstAcquired: string;
  collectionName?: string;
}

const rarityColors: Record<NftSymbolSummary["rarity"], string> = {
  common: "rgba(255, 255, 255, 0.1)",
  rare: "rgba(124, 242, 255, 0.2)",
  legendary: "rgba(255, 215, 0, 0.3)"
};

const rarityLabels: Record<NftSymbolSummary["rarity"], string> = {
  common: "Common",
  rare: "Rare",
  legendary: "Legendary"
};

const rarityScores: Record<NftSymbolSummary["rarity"], number> = {
  common: 42,
  rare: 76,
  legendary: 94
};

const InventoryPanel: React.FC<Props> = ({ history, className }) => {
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [sortBy, setSortBy] = useState<"rarity" | "price" | "name">("rarity");

  const { inventory, rarityCounts, allItems } = useMemo(() => {
    const itemsMap = new Map<string, InventoryItem>();

    history.forEach(result => {
      if (result.resultType !== "WIN") return;

      const gameData = result.gameData as any;
      const symbols = gameData?.symbols as NftSymbolSummary[] | undefined;
      const matched = gameData?.matched as boolean | undefined;
      const collectionName = gameData?.collectionName as string | undefined;

      if (!symbols || !matched) return;

      symbols.forEach(symbol => {
        const existing = itemsMap.get(symbol.id);
        if (existing) {
          existing.count += 1;
          if (new Date(result.timestamp) < new Date(existing.firstAcquired)) {
            existing.firstAcquired = result.timestamp;
          }
        } else {
          itemsMap.set(symbol.id, {
            ...symbol,
            count: 1,
            firstAcquired: result.timestamp,
            collectionName
          });
        }
      });
    });

    const allItems = Array.from(itemsMap.values());

    const rarityCounts = allItems.reduce(
      (acc, item) => {
        acc[item.rarity] += item.count;
        return acc;
      },
      { common: 0, rare: 0, legendary: 0 } as Record<NftSymbolSummary["rarity"], number>
    );

    let sorted = [...allItems];

    if (sortBy === "rarity") {
      sorted.sort((a, b) => {
        const rarityOrder = { legendary: 3, rare: 2, common: 1 };
        const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
        if (rarityDiff !== 0) return rarityDiff;
        return b.priceValue - a.priceValue;
      });
    } else if (sortBy === "price") {
      sorted.sort((a, b) => b.priceValue - a.priceValue);
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    const filtered = rarityFilter === "all" ? sorted : sorted.filter(item => item.rarity === rarityFilter);

    return { inventory: filtered, rarityCounts, allItems };
  }, [history, rarityFilter, sortBy]);

  const totalValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + item.priceValue * item.count, 0);
  }, [inventory]);

  const filteredEmpty = rarityFilter !== "all" && inventory.length === 0 && allItems.length > 0;

  if (inventory.length === 0) {
    return (
      <section className={`inventory-panel ${className || ""}`}>
        <div className="inventory-panel__header">
          <div>
            <p className="eyebrow">NFT Collection</p>
            <h3>Inventory</h3>
          </div>
        </div>
        <div className="inventory-empty">
          <p>Your inventory is empty.</p>
          <p className="muted">Win NFT slot games to collect rare items!</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`inventory-panel ${className || ""}`}>
      <div className="inventory-panel__header">
        <div>
          <p className="eyebrow">NFT Collection</p>
          <h3>Inventory</h3>
          <div className="inventory-stats">
            <span>{inventory.length} unique items</span>
            <span>•</span>
            <span>{inventory.reduce((sum, item) => sum + item.count, 0)} total</span>
            <span>•</span>
            <span className="inventory-value">{formatCurrency(totalValue)}</span>
          </div>
        </div>
        <div className="inventory-rarity-summary">
          <button
            className={`rarity-filter ${rarityFilter === "all" ? "active" : ""}`}
            onClick={() => setRarityFilter("all")}
          >
            All
          </button>
          <button
            className={`rarity-filter ${rarityFilter === "legendary" ? "active" : ""} ${rarityCounts.legendary === 0 ? "is-empty" : ""}`}
            onClick={() => setRarityFilter("legendary")}
            data-rarity="legendary"
            disabled={rarityCounts.legendary === 0}
          >
            <span className="rarity-badge__label">Legendary</span>
            <span className="rarity-badge__count">{rarityCounts.legendary}</span>
          </button>
          <button
            className={`rarity-filter ${rarityFilter === "rare" ? "active" : ""} ${rarityCounts.rare === 0 ? "is-empty" : ""}`}
            onClick={() => setRarityFilter("rare")}
            data-rarity="rare"
            disabled={rarityCounts.rare === 0}
          >
            <span className="rarity-badge__label">Rare</span>
            <span className="rarity-badge__count">{rarityCounts.rare}</span>
          </button>
          <button
            className={`rarity-filter ${rarityFilter === "common" ? "active" : ""} ${rarityCounts.common === 0 ? "is-empty" : ""}`}
            onClick={() => setRarityFilter("common")}
            data-rarity="common"
            disabled={rarityCounts.common === 0}
          >
            <span className="rarity-badge__label">Common</span>
            <span className="rarity-badge__count">{rarityCounts.common}</span>
          </button>
        </div>
      </div>

      <div className="inventory-controls">
        <div className="inventory-filter-info">
          {rarityFilter !== "all" && (
            <span className="inventory-filter-badge">
              Showing {inventory.length} {rarityFilter} item{inventory.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="inventory-sort">
          <label htmlFor="inventory-sort-select">Sort by:</label>
          <select
            id="inventory-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "rarity" | "price" | "name")}
            className="inventory-sort-select"
          >
            <option value="rarity">Rarity</option>
            <option value="price">Price</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {inventory.length === 0 ? (
        filteredEmpty ? (
          <div className="inventory-empty">
            <p>No {rarityFilter} items found.</p>
            <button
              className="button button-ghost"
              onClick={() => setRarityFilter("all")}
              style={{ marginTop: "1rem" }}
            >
              Show all items
            </button>
          </div>
        ) : (
          <div className="inventory-empty">
            <p>Your inventory is empty.</p>
            <p className="muted">Win NFT slot games to collect rare items!</p>
          </div>
        )
      ) : (
        <div className="inventory-grid">
        {inventory.map(item => (
          <div key={item.id} className="inventory-item" data-rarity={item.rarity}>
            <div className="inventory-item__image-wrapper">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="inventory-item__image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/free.jpg";
                }}
              />
              {item.count > 1 && (
                <div className="inventory-item__count-badge">{item.count}</div>
              )}
              <div className="inventory-item__rarity-badge" data-rarity={item.rarity}>
                {rarityLabels[item.rarity]}
              </div>
            </div>
            <div className="inventory-item__info">
              <h4 className="inventory-item__name">{item.name}</h4>
              {item.collectionName && (
                <p className="inventory-item__collection">{item.collectionName}</p>
              )}
              <div className="inventory-item__meta">
                <span>{rarityScores[item.rarity]}% rarity</span>
                <span>•</span>
                <span>Acquired {formatDate(item.firstAcquired)}</span>
              </div>
              <div className="inventory-item__price">
                <span className="muted">Value:</span>
                <strong>{formatCurrency(item.priceValue)}</strong>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </section>
  );
};

export default InventoryPanel;
