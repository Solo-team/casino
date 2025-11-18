import React from "react";
import type { ApiGame } from "../../types/api";
import type { GameContext } from "../types";

interface Props {
  games: ApiGame[];
  onSelect: (game: GameContext) => void;
}

const FALLBACK_GAMES = [
  { id: "kawaii", name: "Kawaii Princess" },
  { id: "mummy", name: "Mummyland" },
  { id: "supercash", name: "Super Cash" },
  { id: "coinstrike", name: "Coin Strike" },
  { id: "shining", name: "Shining Crown" },
  { id: "aviator", name: "Aviator Rush" }
];

const TopGamesSection: React.FC<Props> = ({ games, onSelect }) => {
  const list = games.length ? games : FALLBACK_GAMES.map((game, index) => ({
    id: game.id,
    name: game.name,
    minBet: 1,
    maxBet: 100,
    order: index
  }));

  return (
    <section className="top-games">
      <div className="section-header">
        <h3>Top games</h3>
        <button className="button button-secondary" type="button">
          I'm feeling lucky
        </button>
      </div>
      <div className="game-grid">
        {list.map(game => (
          <article key={game.id} className="top-game-card" onClick={() => onSelect({ id: game.id, name: game.name, minBet: game.minBet ?? 1, maxBet: game.maxBet ?? 100 })}>
            <div className="thumbnail" />
            <h4>{game.name}</h4>
            <small>Tap to play</small>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TopGamesSection;
