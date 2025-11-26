import React, { useMemo, useState } from "react";
import type { ApiGame } from "../../types/api";
import type { GameContext } from "../types";

interface Props {
  games: ApiGame[];
  onSelect: (game: GameContext) => void;
}

const GAME_ICONS: Record<string, string> = {
  blackjack: "🂡",
  roulette: "🎰",
  "slot-machine": "🎲",
  "neon-trails": "⚡",
  "vault-heist": "💎",
  "aether-bonanza": "✨"
};

const GAME_GRADIENTS: Record<string, string> = {
  blackjack: "linear-gradient(135deg, #1a2a3a 0%, #0f1a2a 100%)",
  roulette: "linear-gradient(135deg, #2d1b3d 0%, #1a0f2e 100%)",
  "slot-machine": "linear-gradient(135deg, #3a2d1b 0%, #2a1f0f 100%)",
  "neon-trails": "linear-gradient(135deg, #0a1d3d 0%, #18a4ff 100%)",
  "vault-heist": "linear-gradient(135deg, #1c0f3b 0%, #7cf2ff 100%)",
  "aether-bonanza": "linear-gradient(135deg, #102231 0%, #9bf94a 100%)"
};

const GamesGrid: React.FC<Props> = ({ games, onSelect }) => {
  const [query, setQuery] = useState("");

  const filteredGames = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return games;
    return games.filter(game => game.name.toLowerCase().includes(trimmed));
  }, [games, query]);

  const getGameIcon = (gameId: string) => {
    return GAME_ICONS[gameId] || "🎮";
  };

  const getGameGradient = (gameId: string) => {
    return GAME_GRADIENTS[gameId] || "linear-gradient(135deg, #1a2a3a 0%, #0f1a2a 100%)";
  };

  return (
    <section className="games-grid-section">
      <div className="games-grid-header">
        <div>
          <h3>Premium Games</h3>
          <p className="muted">Choose your game and start playing</p>
        </div>
        {games.length > 0 && (
          <div className="search-bar">
            <input
              className="input search-input"
              type="search"
              placeholder="Search games..."
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
        )}
      </div>
      
      {games.length === 0 ? (
        <div className="games-empty">
          <p className="muted">Loading games...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="games-empty">
          <p className="muted">No games match your search. Try another query.</p>
        </div>
      ) : (
        <div className="games-grid-main">
          {filteredGames.map(game => (
            <div
              key={game.id}
              className="game-card-featured"
              style={{ background: getGameGradient(game.id) }}
              onClick={() => onSelect({ id: game.id, name: game.name, minBet: game.minBet, maxBet: game.maxBet })}
            >
              <div className="game-card-featured__icon">
                {getGameIcon(game.id)}
              </div>
              <div className="game-card-featured__content">
                <h4>{game.name}</h4>
                <p className="game-card-featured__meta">
                  <span>Bet: {game.minBet} - {game.maxBet}</span>
                </p>
                <div className="game-card-featured__overlay">
                  <button className="button button-primary">Play Now</button>
                </div>
              </div>
              <div className="game-card-featured__glow" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default GamesGrid;

