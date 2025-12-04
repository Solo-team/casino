import React, { useMemo, useState, useEffect, useRef } from "react";
import type { ApiGame, NftSymbolSummary } from "../../types/api";
import type { GameContext } from "../types";

type RarityFilter = "all" | NftSymbolSummary["rarity"];

interface Props {
  games: ApiGame[];
  onSelect: (game: GameContext) => void;
}

const rarityPalette: Record<NftSymbolSummary["rarity"], string> = {
  legendary: "#f0b90b",
  rare: "#4dd5ff",
  common: "#8e9cb5"
};

// Анимированная мини-рулетка для превью карточки (горизонтальная, справа налево)
const MiniSlotPreview: React.FC<{ symbols: NftSymbolSummary[]; previewImage?: string }> = ({ symbols, previewImage }) => {
  const [offset, setOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile || symbols.length < 2) return;

    const ITEM_SIZE = 100; // ширина элемента
    const TOTAL_ITEMS = symbols.length;
    const STRIP_WIDTH = ITEM_SIZE * TOTAL_ITEMS;
    const SPEED = 40; // пикселей в секунду - медленная прокрутка справа налево

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const newOffset = (elapsed * SPEED / 1000) % STRIP_WIDTH;
      
      setOffset(newOffset);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [symbols.length, isMobile]);

  // На мобилке показываем статичную картинку
  if (isMobile) {
    return (
      <div className="mini-slot-preview static">
        {previewImage ? (
          <img src={previewImage} alt="Preview" />
        ) : symbols[0] ? (
          <img src={symbols[0].imageUrl} alt={symbols[0].name} />
        ) : null}
      </div>
    );
  }

  if (symbols.length < 2) {
    return (
      <div className="mini-slot-preview static">
        {symbols[0] && <img src={symbols[0].imageUrl} alt={symbols[0].name} />}
      </div>
    );
  }

  // Дублируем для бесшовной прокрутки
  const displaySymbols = [...symbols, ...symbols, ...symbols];

  return (
    <div className="mini-slot-preview horizontal">
      <div 
        className="mini-slot-strip-h"
        style={{ transform: `translateX(-${offset}px)` }}
      >
        {displaySymbols.map((sym, idx) => (
          <div key={`${sym.id}-${idx}`} className="mini-slot-item-h">
            <img src={sym.imageUrl} alt={sym.name} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
};

const GamesGrid: React.FC<Props> = ({ games, onSelect }) => {
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");

  const filteredGames = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return games.filter(game => {
      const matchesQuery = !trimmed || game.name.toLowerCase().includes(trimmed);
      if (!matchesQuery) {
        return false;
      }
      if (rarityFilter === "all") {
        return true;
      }
      const symbols = game.metadata?.symbols ?? [];
      return symbols.some(symbol => symbol.rarity === rarityFilter);
    });
  }, [games, query, rarityFilter]);

  const handleSelect = (game: ApiGame) => {
    onSelect({
      id: game.id,
      name: game.name,
      minBet: game.minBet,
      maxBet: game.maxBet,
      metadata: game.metadata ?? null
    });
  };

  const renderSymbolStack = (symbols: NftSymbolSummary[] = []) => {
    return symbols.slice(0, 4).map(symbol => (
      <span key={symbol.id} className={`symbol-pill ${symbol.rarity}`}>
        <img src={symbol.imageUrl} alt={symbol.name} loading="lazy" />
      </span>
    ));
  };

  const renderRarityBar = (game: ApiGame) => {
    const total = game.metadata?.itemCount ?? 1;
    const breakdown = game.metadata?.rarity ?? { legendary: 0, rare: 0, common: total };
    return (
      <div className="rarity-bar">
        {(["legendary", "rare", "common"] as const).map(key => {
          const percent = Math.max(2, Math.round(((breakdown[key] ?? 0) / total) * 100));
          return <span key={key} style={{ width: `${percent}%`, background: rarityPalette[key] }} />;
        })}
      </div>
    );
  };

  return (
    <section className="nft-gallery">
      <header className="nft-gallery__header">
        <div>
          <p className="eyebrow">NFT slots</p>
          <h3>Pick a collection</h3>
          <p className="muted">Every spin pulls real metadata from GetGems drops.</p>
        </div>
        <div className="nft-gallery__filters">
          <div className="filter-pills">
            {(["all", "legendary", "rare"] as const).map(filter => (
              <button
                key={filter}
                type="button"
                className={rarityFilter === filter ? "active" : undefined}
                onClick={() => setRarityFilter(filter)}
              >
                {filter === "all" ? "All" : filter}
              </button>
            ))}
          </div>
          <input
            className="input search-input"
            type="search"
            placeholder="Search Plush Pepe..."
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
      </header>

      {games.length === 0 ? (
        <div className="games-empty">
          <p className="muted">Loading NFT drops...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="games-empty">
          <p className="muted">No drops in this filter. Try another rarity tier.</p>
        </div>
      ) : (
        <div className="nft-grid">
          {filteredGames.map(game => (
            <button key={game.id} className="nft-card" type="button" onClick={() => handleSelect(game)}>
              <div className="nft-card__art">
                <MiniSlotPreview symbols={game.metadata?.symbols ?? []} previewImage={game.metadata?.previewImage} />
                <div className="nft-card__symbols">{renderSymbolStack(game.metadata?.symbols)}</div>
                <span className="nft-card__chance">
                  {(game.metadata?.winChance ?? 0.01) * 100 < 1
                    ? `${((game.metadata?.winChance ?? 0.01) * 100).toFixed(2)}%`
                    : `${((game.metadata?.winChance ?? 0.01) * 100).toFixed(1)}%`} chance
                </span>
              </div>
              <div className="nft-card__body">
                <div>
                  <h4>{game.name}</h4>
                  <p className="muted">{game.metadata?.priceStats ? `Median ${Math.round(game.metadata.priceStats.median).toLocaleString()} TON` : "Price feed live"}</p>
                </div>
                <div>
                  <small>Stake</small>
                  <strong>
                    {game.minBet} – {game.maxBet}
                  </strong>
                </div>
              </div>
              {renderRarityBar(game)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default GamesGrid;

