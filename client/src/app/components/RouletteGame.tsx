import React, { useEffect, useState, useRef } from "react";
import type { ApiGameResult } from "../../types/api";

interface Props {
  result: ApiGameResult | null;
  isPlaying: boolean;
  onBet: (betType: string, betValue?: number) => void;
  bet: number;
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const ZERO = 0;

const ROULETTE_NUMBERS = [
  ZERO,
  ...Array.from({ length: 36 }, (_, i) => i + 1)
];

const getNumberColor = (num: number): "red" | "black" | "green" => {
  if (num === 0) return "green";
  return RED_NUMBERS.includes(num) ? "red" : "black";
};

const RouletteGame: React.FC<Props> = ({ result, isPlaying, onBet, bet }) => {
  const [selectedBet, setSelectedBet] = useState<string>("");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballPosition, setBallPosition] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  const winningNumber = result?.gameData
    ? (result.gameData as { winningNumber?: number }).winningNumber ?? null
    : null;

  useEffect(() => {
    if (isPlaying) {
      setIsSpinning(true);
      const spinDuration = 3000 + Math.random() * 2000;
      const rotations = 5 + Math.random() * 3;
      const finalRotation = rotations * 360 + (winningNumber !== null ? (winningNumber * (360 / 37)) : 0);
      
      setWheelRotation(finalRotation);
      
      setTimeout(() => {
        setIsSpinning(false);
      }, spinDuration);
    }
  }, [isPlaying, winningNumber]);

  useEffect(() => {
    if (winningNumber !== null && !isSpinning) {
      const numberAngle = (winningNumber * (360 / 37)) % 360;
      setBallPosition(numberAngle);
    }
  }, [winningNumber, isSpinning]);

  const handleNumberClick = (num: number) => {
    if (isPlaying || isSpinning) return;
    setSelectedNumber(num);
    setSelectedBet("number");
    onBet("NUMBER", num);
  };

  const handleColorBet = (color: "red" | "black") => {
    if (isPlaying || isSpinning) return;
    setSelectedNumber(null);
    setSelectedBet(color.toUpperCase());
    onBet(color.toUpperCase());
  };

  const handleEvenOdd = (type: "even" | "odd") => {
    if (isPlaying || isSpinning) return;
    setSelectedNumber(null);
    setSelectedBet(type.toUpperCase());
    onBet(type.toUpperCase());
  };

  const handleRangeBet = (range: "low" | "high") => {
    if (isPlaying || isSpinning) return;
    setSelectedNumber(null);
    setSelectedBet(range.toUpperCase());
    onBet(range.toUpperCase());
  };

  return (
    <div className="roulette-table">
      <div className="roulette-table-bg">
        <div className="roulette-felt" />
        <div className="roulette-glow" />
      </div>

      <div className="roulette-wheel-container">
        <div className="roulette-wheel-wrapper">
          <div
            ref={wheelRef}
            className={`roulette-wheel ${isSpinning ? "spinning" : ""}`}
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinning ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none"
            }}
          >
            {ROULETTE_NUMBERS.map((num, index) => {
              const angle = (index * (360 / 37));
              const color = getNumberColor(num);
              return (
                <div
                  key={num}
                  className={`roulette-number roulette-number-${color} ${winningNumber === num ? "winning" : ""}`}
                  style={{
                    transform: `rotate(${angle}deg) translateY(-140px)`,
                    transformOrigin: "center 140px"
                  }}
                >
                  <span>{num}</span>
                </div>
              );
            })}
          </div>
          <div
            ref={ballRef}
            className={`roulette-ball ${isSpinning ? "rolling" : ""}`}
            style={{
              transform: `rotate(${ballPosition}deg) translateY(-140px)`,
              transformOrigin: "center 140px"
            }}
          >
            <div className="ball-glow" />
          </div>
          <div className="roulette-pointer" />
        </div>

        {winningNumber !== null && !isSpinning && (
          <div className="roulette-result">
            <div className={`result-number result-number-${getNumberColor(winningNumber)}`}>
              <span>{winningNumber}</span>
            </div>
            {result && (
              <div className={`result-status ${result.resultType.toLowerCase()}`}>
                {result.resultType === "WIN" ? (
                  <>
                    <div className="result-icon">🎉</div>
                    <div className="result-payout">+{result.payout.toFixed(2)}</div>
                  </>
                ) : (
                  <div className="result-icon">💔</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="roulette-betting-area">
        <div className="betting-section">
          <div className="betting-label">Numbers</div>
          <div className="numbers-grid">
            {ROULETTE_NUMBERS.map(num => {
              const color = getNumberColor(num);
              return (
                <button
                  key={num}
                  className={`number-btn number-btn-${color} ${selectedNumber === num ? "selected" : ""} ${winningNumber === num ? "winning" : ""}`}
                  onClick={() => handleNumberClick(num)}
                  disabled={isPlaying || isSpinning}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        <div className="betting-section">
          <div className="betting-label">Colors</div>
          <div className="color-bets">
            <button
              className={`color-btn color-btn-red ${selectedBet === "RED" ? "selected" : ""}`}
              onClick={() => handleColorBet("red")}
              disabled={isPlaying || isSpinning}
            >
              Red
            </button>
            <button
              className={`color-btn color-btn-black ${selectedBet === "BLACK" ? "selected" : ""}`}
              onClick={() => handleColorBet("black")}
              disabled={isPlaying || isSpinning}
            >
              Black
            </button>
          </div>
        </div>

        <div className="betting-section">
          <div className="betting-label">Even/Odd</div>
          <div className="even-odd-bets">
            <button
              className={`even-odd-btn ${selectedBet === "EVEN" ? "selected" : ""}`}
              onClick={() => handleEvenOdd("even")}
              disabled={isPlaying || isSpinning}
            >
              Even
            </button>
            <button
              className={`even-odd-btn ${selectedBet === "ODD" ? "selected" : ""}`}
              onClick={() => handleEvenOdd("odd")}
              disabled={isPlaying || isSpinning}
            >
              Odd
            </button>
          </div>
        </div>

        <div className="betting-section">
          <div className="betting-label">Range</div>
          <div className="range-bets">
            <button
              className={`range-btn ${selectedBet === "LOW" ? "selected" : ""}`}
              onClick={() => handleRangeBet("low")}
              disabled={isPlaying || isSpinning}
            >
              1-18
            </button>
            <button
              className={`range-btn ${selectedBet === "HIGH" ? "selected" : ""}`}
              onClick={() => handleRangeBet("high")}
              disabled={isPlaying || isSpinning}
            >
              19-36
            </button>
          </div>
        </div>
      </div>

      <div className="roulette-bet-display">
        <div className="bet-chip">
          <span className="bet-label">Bet</span>
          <span className="bet-value">{bet.toFixed(2)}</span>
        </div>
        {selectedBet && (
          <div className="selected-bet">
            <span>{selectedBet}</span>
            {selectedNumber !== null && <span>{selectedNumber}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouletteGame;

