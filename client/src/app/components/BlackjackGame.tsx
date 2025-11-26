import React, { useEffect, useState } from "react";
import type { ApiGameResult } from "../../types/api";

interface Props {
  result: ApiGameResult | null;
  isPlaying: boolean;
  onAction: (action: "hit" | "stand") => void;
  bet: number;
  userBalance?: number;
}

interface CardData {
  suit: string;
  rank: string;
  value: number;
}

const parseCard = (cardString: string): CardData => {
  const suitMap: Record<string, string> = {
    "HEARTS": "hearts",
    "DIAMONDS": "diamonds",
    "CLUBS": "clubs",
    "SPADES": "spades"
  };
  
  const rankMap: Record<string, { display: string; value: number }> = {
    "ACE": { display: "A", value: 11 },
    "TWO": { display: "2", value: 2 },
    "THREE": { display: "3", value: 3 },
    "FOUR": { display: "4", value: 4 },
    "FIVE": { display: "5", value: 5 },
    "SIX": { display: "6", value: 6 },
    "SEVEN": { display: "7", value: 7 },
    "EIGHT": { display: "8", value: 8 },
    "NINE": { display: "9", value: 9 },
    "TEN": { display: "10", value: 10 },
    "JACK": { display: "J", value: 10 },
    "QUEEN": { display: "Q", value: 10 },
    "KING": { display: "K", value: 10 }
  };

  const parts = cardString.split(" of ");
  const rank = parts[0] || "ACE";
  const suit = parts[1] || "SPADES";
  
  const rankInfo = rankMap[rank] || { display: "A", value: 11 };
  
  return {
    suit: suitMap[suit] || "spades",
    rank: rankInfo.display,
    value: rankInfo.value
  };
};

const getSuitColor = (suit: string): string => {
  return suit === "hearts" || suit === "diamonds" ? "#ef4444" : "#1a1a1a";
};

const BlackjackGame: React.FC<Props> = ({ result, isPlaying, onAction, bet, userBalance = 0 }) => {
  const [playerCards, setPlayerCards] = useState<CardData[]>([]);
  const [dealerCards, setDealerCards] = useState<CardData[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [showDealerCard, setShowDealerCard] = useState(false);
  const [cardAnimations, setCardAnimations] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (result?.gameData) {
      const data = result.gameData as {
        playerHand?: string[];
        dealerHand?: string[];
        playerScore?: number;
        dealerScore?: number;
        gameFinished?: boolean;
      };

      if (data.playerHand) {
        const cards = data.playerHand.map(parseCard);
        setPlayerCards(cards);
        setPlayerScore(data.playerScore || cards.reduce((sum, c) => sum + c.value, 0));
      }

      if (data.dealerHand) {
        const cards = data.dealerHand.map(parseCard);
        setDealerCards(cards);
        // Only show dealer score if game is finished
        const gameFinished = data.gameFinished !== false; // Default to true for backward compatibility
        setShowDealerCard(gameFinished);
        if (gameFinished) {
          setDealerScore(data.dealerScore || cards.reduce((sum, c) => sum + c.value, 0));
        }
      }

      if (data.playerHand && data.playerHand.length > 0) {
        const newCardIndex = data.playerHand.length - 1;
        setCardAnimations(prev => new Set([...prev, newCardIndex]));
        setTimeout(() => {
          setCardAnimations(prev => {
            const next = new Set(prev);
            next.delete(newCardIndex);
            return next;
          });
        }, 600);
      }
    } else {
      setPlayerCards([]);
      setDealerCards([]);
      setPlayerScore(0);
      setDealerScore(0);
      setShowDealerCard(false);
    }
  }, [result]);

  const renderCard = (card: CardData, index: number, isDealer: boolean = false) => {
    const isHidden = isDealer && index === 0 && !showDealerCard;
    const isAnimated = cardAnimations.has(index);
    
    return (
      <div
        key={`${isDealer ? "dealer" : "player"}-${index}`}
        className={`blackjack-card ${isAnimated ? "card-deal" : ""} ${isHidden ? "card-hidden" : ""}`}
        style={{
          animationDelay: `${index * 0.15}s`,
          transform: `translateX(${index * 20}px) rotate(${index * 2}deg)`
        }}
      >
        {isHidden ? (
          <div className="card-back">
            <div className="card-back-pattern" />
          </div>
        ) : (
          <div className="card-front" style={{ borderColor: getSuitColor(card.suit) }}>
            <div className="card-corner card-corner-top">
              <span className="card-rank" style={{ color: getSuitColor(card.suit) }}>
                {card.rank}
              </span>
              <span className="card-suit" style={{ color: getSuitColor(card.suit) }}>
                {card.suit === "spades" ? "♠" : card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : "♣"}
              </span>
            </div>
            <div className="card-center">
              <span className="card-suit-large" style={{ color: getSuitColor(card.suit) }}>
                {card.suit === "spades" ? "♠" : card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : "♣"}
              </span>
            </div>
            <div className="card-corner card-corner-bottom">
              <span className="card-rank" style={{ color: getSuitColor(card.suit) }}>
                {card.rank}
              </span>
              <span className="card-suit" style={{ color: getSuitColor(card.suit) }}>
                {card.suit === "spades" ? "♠" : card.suit === "hearts" ? "♥" : card.suit === "diamonds" ? "♦" : "♣"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isBlackjack = result?.gameData && (result.gameData as { isBlackjack?: boolean }).isBlackjack;
  const isBusted = playerScore > 21;
  const gameOver = result !== null && showDealerCard;
  const hasCards = playerCards.length > 0;
  const canPlay = hasCards && !gameOver && !isPlaying;

  return (
    <div className="blackjack-table-realistic">
      <div className="table-wood-frame" />
      <div className="table-felt-realistic">
        <div className="table-text-center">
          <div className="table-title">BLACKJACK</div>
          <div className="table-rules">
            <div>БЛЭКДЖЕК ВЫПЛАЧИВАЕТСЯ 3 К 2</div>
            <div>Дилер должен сдавать при 16 и останавливаться при любых 17 или выше</div>
            <div>ВЫПЛАЧИВАЕТСЯ 2 К 1 Страхование ВЫПЛАЧИВАЕТСЯ 2 К 1</div>
          </div>
        </div>
      </div>

      <div className="blackjack-dealer-area-realistic">
        <div className="dealer-cards-container">
          <div className="dealer-hand-realistic">
            {dealerCards.map((card, index) => renderCard(card, index, true))}
          </div>
          {showDealerCard && (
            <div className="dealer-score-badge">
              <span className="score-value">{dealerScore}</span>
            </div>
          )}
        </div>
        <div className="dealer-equipment">
          <div className="chip-rack">
            <div className="chip chip-blue" />
            <div className="chip chip-green" />
            <div className="chip chip-red" />
            <div className="chip chip-yellow" />
          </div>
          <div className="card-shoe" />
          <div className="discard-tray" />
        </div>
      </div>

      <div className="blackjack-center-realistic">
        {result && (
          <div className={`blackjack-result-realistic ${result.resultType.toLowerCase()}`}>
            {result.resultType === "WIN" && (
              <>
                <div className="result-icon-large">🎉</div>
                <div className="result-text-large">
                  <strong>You Win!</strong>
                  {isBlackjack && <span className="blackjack-badge-large">Blackjack!</span>}
                  <div className="result-payout-large">+{result.payout.toFixed(2)}</div>
                </div>
              </>
            )}
            {result.resultType === "LOSS" && (
              <>
                <div className="result-icon-large">💔</div>
                <div className="result-text-large">
                  <strong>Dealer Wins</strong>
                  {isBusted && <span className="bust-badge-large">Bust!</span>}
                </div>
              </>
            )}
            {result.resultType === "DRAW" && (
              <>
                <div className="result-icon-large">🤝</div>
                <div className="result-text-large">
                  <strong>Push</strong>
                  <div className="result-payout-large">Bet returned</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="blackjack-player-area-realistic">
        <div className="player-cards-container">
          <div className="player-hand-realistic">
            {playerCards.map((card, index) => renderCard(card, index, false))}
          </div>
          <div className="player-score-badge">
            <span className="score-value">{playerScore}</span>
            {isBusted && <span className="bust-indicator">Bust!</span>}
          </div>
        </div>
        <div className="player-bet-area">
          <div className="bet-chips-stack">
            <div className="bet-chip-large">
              <span className="chip-value">€{bet.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {canPlay && (
          <div className="blackjack-actions-realistic">
            <button
              className="action-btn action-btn-hit"
              onClick={() => onAction("hit")}
              disabled={isPlaying || isBusted}
            >
              <div className="btn-icon">A♠</div>
              <span>СДАТЬ КАРТУ</span>
            </button>
            <button
              className="action-btn action-btn-stand"
              onClick={() => onAction("stand")}
              disabled={isPlaying}
            >
              <div className="btn-icon">✋</div>
              <span>ХВАТИТ</span>
            </button>
          </div>
        )}
        {!hasCards && !isPlaying && (
          <div className="blackjack-waiting">
            <p className="waiting-text">Установите ставку и нажмите "Deal Cards" для начала игры</p>
          </div>
        )}
      </div>

      <div className="game-info-panel">
        <div className="info-item">
          <span className="info-label">БАЛАНС</span>
          <span className="info-value">€{userBalance.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="info-item">
          <span className="info-label">СТАВКА</span>
          <span className="info-value">€{bet.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="info-item">
          <span className="info-label">ВЫИГРЫШ</span>
          <span className="info-value">€{result?.payout ? result.payout.toFixed(2).replace(".", ",") : "0,00"}</span>
        </div>
      </div>
    </div>
  );
};

export default BlackjackGame;

