import React, { useEffect, useState } from "react";
import type { ApiGameResult } from "../../types/api";
import type { GameContext } from "../types";

interface Props {
  game: GameContext | null;
  result: ApiGameResult | null;
  isPlaying: boolean;
  onClose: () => void;
  onPlay: (betAmount: number) => Promise<void>;
}

const GameModal: React.FC<Props> = ({ game, result, isPlaying, onClose, onPlay }) => {
  const [bet, setBet] = useState<number>(game?.minBet ?? 1);

  useEffect(() => {
    if (game) {
      setBet(game.minBet);
    }
  }, [game]);

  if (!game) {
    return null;
  }

  const handlePlay = () => {
    if (bet < game.minBet || bet > game.maxBet) {
      return;
    }
    void onPlay(bet);
  };

  const renderContent = () => {
    if (!result) {
      return <span>Ready to make your move?</span>;
    }
    const data = result.gameData ?? {};
    if (typeof (data as { symbols?: string }).symbols === "string") {
      return <div style={{ fontSize: "2.4rem" }}>{(data as { symbols: string }).symbols}</div>;
    }
    if (Array.isArray((data as { playerHand?: unknown }).playerHand)) {
      const { playerHand = [], dealerHand = [] } = data as { playerHand: string[]; dealerHand: string[] };
      return (
        <div>
          <p>Player: {playerHand.join(", ")}</p>
          <p>Dealer: {dealerHand.join(", ")}</p>
        </div>
      );
    }
    if (typeof (data as { winningNumber?: number }).winningNumber === "number") {
      return <div>Winning number {(data as { winningNumber: number }).winningNumber}</div>;
    }
    return <div>{result.resultType}</div>;
  };

  return (
    <div className="modal">
      <div className="modal__content">
        <button className="close-btn" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">{game.providerName ?? "Flagship table"}</p>
        <h2>{game.name}</h2>
        <p className="muted">
          Bets {game.minBet} – {game.maxBet}
        </p>
        <div className="game-display">{renderContent()}</div>
        <div className="bet-row">
          <label>
            Stake
            <input
              className="input"
              type="number"
              min={game.minBet}
              max={game.maxBet}
              value={bet}
              onChange={event => setBet(Number(event.target.value))}
            />
          </label>
          <button className="button button-primary" onClick={handlePlay} disabled={isPlaying}>
            {isPlaying ? "Dealing..." : "Play"}
          </button>
        </div>
        {result && (
          <div className={`result-card ${result.resultType.toLowerCase()}`}>
            <strong>
              {result.resultType === "WIN" ? "You win!" : result.resultType === "DRAW" ? "Push" : "Better luck next time"}
            </strong>
            <p>Bet: {result.betAmount}</p>
            <p>Payout: {result.payout}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModal;
