import React, { useMemo, useState } from "react";
import type { ApiGame } from "../../types/api";
import type { GameContext } from "../types";

interface Props {
  games: ApiGame[];
  active: boolean;
  onSelect: (game: GameContext) => void;
}

const GamesPanel: React.FC<Props> = ({ games, active, onSelect }) => {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filteredGames = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return games;
    return games.filter(game => game.name.toLowerCase().includes(trimmed));
  }, [games, query]);

  const toggleFavorite = (gameId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  return (
    <section className={`panel ${active ? "active" : ""}`}>
      <h3>Signature table games</h3>
      <p className="muted">Choose a table, set your stake and feel the rush.</p>
      {favorites.size > 0 && (
        <div className="favorites-row">
          <span>Favorites:</span>
          {[...favorites].map(id => {
            const game = games.find(g => g.id === id);
            if (!game) return null;
            return (
              <button key={id} type="button" onClick={() => onSelect({ id: game.id, name: game.name, minBet: game.minBet, maxBet: game.maxBet })}>
                {game.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="search-bar">
        <input
          className="input search-input"
          type="search"
          placeholder="Search blackjack, roulette, baccarat..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      <div className="cards-grid">
        {filteredGames.map(game => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => onSelect({ id: game.id, name: game.name, minBet: game.minBet, maxBet: game.maxBet })}
          >
            <p className="label">
              Bets {game.minBet} – {game.maxBet}
            </p>
            <h4>{game.name}</h4>
            <p className="muted">Live dealer ready</p>
            <button
              className={`favorite-btn ${favorites.has(game.id) ? "active" : ""}`}
              type="button"
              onClick={event => {
                event.stopPropagation();
                toggleFavorite(game.id);
              }}
            >
              {favorites.has(game.id) ? "Saved" : "Save"}
            </button>
          </div>
        ))}
        {!filteredGames.length && (
          <p className="history-empty">No tables match your search. Try another title.</p>
        )}
      </div>
    </section>
  );
};

export default GamesPanel;
