import React, { useEffect, useRef, useState } from "react";
import type { ApiGameResult } from "../../../types/api";
import { CanvasUtils } from "../utils/CanvasUtils";

interface Props {
  result: ApiGameResult | null;
  isPlaying: boolean;
  onAction: (action: "hit" | "stand" | "deal") => void;
  bet: number;
  userBalance?: number;
}

interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  value: number;
  x: number;
  y: number;
  hidden?: boolean;
}

interface GameState {
  playerCards: Card[];
  dealerCards: Card[];
  playerScore: number;
  dealerScore: number;
  showDealerCard: boolean;
  gameOver: boolean;
}

const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠"
};

const SUIT_COLORS = {
  hearts: "#ef4444",
  diamonds: "#ef4444",
  clubs: "#1a1a1a",
  spades: "#1a1a1a"
};

const parseCard = (cardString: string): Omit<Card, "x" | "y"> => {
  const suitMap: Record<string, "hearts" | "diamonds" | "clubs" | "spades"> = {
    HEARTS: "hearts",
    DIAMONDS: "diamonds",
    CLUBS: "clubs",
    SPADES: "spades"
  };

  const rankMap: Record<string, { display: string; value: number }> = {
    ACE: { display: "A", value: 11 },
    TWO: { display: "2", value: 2 },
    THREE: { display: "3", value: 3 },
    FOUR: { display: "4", value: 4 },
    FIVE: { display: "5", value: 5 },
    SIX: { display: "6", value: 6 },
    SEVEN: { display: "7", value: 7 },
    EIGHT: { display: "8", value: 8 },
    NINE: { display: "9", value: 9 },
    TEN: { display: "10", value: 10 },
    JACK: { display: "J", value: 10 },
    QUEEN: { display: "Q", value: 10 },
    KING: { display: "K", value: 10 }
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

const BlackjackCanvas: React.FC<Props> = ({ result, isPlaying, onAction, bet, userBalance = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    playerCards: [],
    dealerCards: [],
    playerScore: 0,
    dealerScore: 0,
    showDealerCard: false,
    gameOver: false
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 600;
  }, []);

  useEffect(() => {
    if (result?.gameData) {
      const data = result.gameData as {
        playerHand?: string[];
        dealerHand?: string[];
        playerScore?: number;
        dealerScore?: number;
        gameFinished?: boolean;
      };

      const playerCards: Card[] = (data.playerHand || []).map((cardStr, index) => ({
        ...parseCard(cardStr),
        x: 200 + index * 100,
        y: 400
      }));

      const dealerCards: Card[] = (data.dealerHand || []).map((cardStr, index) => ({
        ...parseCard(cardStr),
        x: 200 + index * 100,
        y: 150,
        hidden: index === 0 && !data.gameFinished
      }));

      setGameState({
        playerCards,
        dealerCards,
        playerScore: data.playerScore || 0,
        dealerScore: data.dealerScore || 0,
        showDealerCard: data.gameFinished !== false,
        gameOver: data.gameFinished !== false
      });
    } else {
      setGameState({
        playerCards: [],
        dealerCards: [],
        playerScore: 0,
        dealerScore: 0,
        showDealerCard: false,
        gameOver: false
      });
    }
  }, [result]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0a4d2e";
      ctx.fillRect(0, 0, 800, 600);

      const feltGradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 500);
      feltGradient.addColorStop(0, "#1a7a4a");
      feltGradient.addColorStop(0.5, "#0d5d2f");
      feltGradient.addColorStop(1, "#0a4d2e");
      ctx.fillStyle = feltGradient;
      ctx.fillRect(0, 0, 800, 600);

      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      for (let i = 0; i < 800; i += 8) {
        for (let j = 0; j < 600; j += 8) {
          if ((i + j) % 16 === 0) {
            ctx.fillRect(i, j, 2, 2);
          }
        }
      }

      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 600);
        ctx.stroke();
      }
      for (let i = 0; i < 600; i += 16) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }

      ctx.strokeStyle = "#4a5568";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 796, 596);

      CanvasUtils.drawTextWithShadow(ctx, "BLACKJACK", 400, 30, {
        fontSize: 48,
        fontFamily: "Space Grotesk, sans-serif",
        color: "#ffffff",
        shadowColor: "rgba(0, 0, 0, 0.7)",
        shadowBlur: 8,
        align: "center"
      });

      const rules = [
        "BLACKJACK PAYS 3 TO 2",
        "DEALER MUST HIT ON 16 AND STAND ON ALL 17",
        "INSURANCE PAYS 2 TO 1"
      ];
      rules.forEach((rule, index) => {
        CanvasUtils.drawTextWithShadow(ctx, rule, 400, 80 + index * 20, {
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.9)",
          shadowColor: "rgba(0, 0, 0, 0.6)",
          shadowBlur: 4,
          align: "center"
        });
      });

      const dealerCardCount = gameState.dealerCards.length;
      const dealerStartX = dealerCardCount > 0 ? 400 - (dealerCardCount * 90) / 2 : 400;
      
      gameState.dealerCards.forEach((card, index) => {
        const cardX = dealerStartX + index * 90;
        const cardY = 140;

        if (card.hidden) {
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 6;
          CanvasUtils.roundedRect(ctx, cardX, cardY, 80, 112, 10);
          const backGradient = ctx.createLinearGradient(cardX, cardY, cardX + 80, cardY + 112);
          backGradient.addColorStop(0, "#1e3a8a");
          backGradient.addColorStop(0.5, "#1e40af");
          backGradient.addColorStop(1, "#1e3a8a");
          ctx.fillStyle = backGradient;
          ctx.fill();
          ctx.strokeStyle = "#1e40af";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1;
          for (let i = 0; i < 80; i += 10) {
            ctx.beginPath();
            ctx.moveTo(cardX + i, cardY);
            ctx.lineTo(cardX + i, cardY + 112);
            ctx.stroke();
          }
          for (let i = 0; i < 112; i += 10) {
            ctx.beginPath();
            ctx.moveTo(cardX, cardY + i);
            ctx.lineTo(cardX + 80, cardY + i);
            ctx.stroke();
          }
        } else {
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 6;
          CanvasUtils.roundedRect(ctx, cardX, cardY, 80, 112, 10);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#d1d5db";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = SUIT_COLORS[card.suit];
          ctx.font = "bold 20px Arial";
          ctx.fillText(card.rank, cardX + 10, cardY + 24);
          ctx.font = "bold 18px Arial";
          ctx.fillText(SUIT_SYMBOLS[card.suit], cardX + 10, cardY + 44);

          ctx.font = "bold 56px Arial";
          ctx.fillText(SUIT_SYMBOLS[card.suit], cardX + 40 - 16, cardY + 56 + 30);

          ctx.save();
          ctx.translate(cardX + 70, cardY + 92);
          ctx.rotate(Math.PI);
          ctx.font = "bold 20px Arial";
          ctx.fillText(card.rank, 0, 0);
          ctx.font = "bold 18px Arial";
          ctx.fillText(SUIT_SYMBOLS[card.suit], 0, 22);
          ctx.restore();
        }
      });

      const playerCardCount = gameState.playerCards.length;
      const playerStartX = playerCardCount > 0 ? 400 - (playerCardCount * 90) / 2 : 400;

      gameState.playerCards.forEach((card, index) => {
        const cardX = playerStartX + index * 90;
        const cardY = 400;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        CanvasUtils.roundedRect(ctx, cardX, cardY, 80, 112, 10);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = SUIT_COLORS[card.suit];
        ctx.font = "bold 20px Arial";
        ctx.fillText(card.rank, cardX + 10, cardY + 24);
        ctx.font = "bold 18px Arial";
        ctx.fillText(SUIT_SYMBOLS[card.suit], cardX + 10, cardY + 44);

        ctx.font = "bold 56px Arial";
        ctx.fillText(SUIT_SYMBOLS[card.suit], cardX + 40 - 16, cardY + 56 + 30);

        ctx.save();
        ctx.translate(cardX + 70, cardY + 92);
        ctx.rotate(Math.PI);
        ctx.font = "bold 20px Arial";
        ctx.fillText(card.rank, 0, 0);
        ctx.font = "bold 18px Arial";
        ctx.fillText(SUIT_SYMBOLS[card.suit], 0, 22);
        ctx.restore();
      });

      if (gameState.showDealerCard || gameState.dealerCards.length > 0) {
        CanvasUtils.drawTextWithShadow(ctx, `Dealer: ${gameState.dealerScore}`, 400, 115, {
          fontSize: 22,
          fontFamily: "Arial",
          color: "#ffffff",
          shadowColor: "rgba(0, 0, 0, 0.8)",
          shadowBlur: 6,
          align: "center"
        });
      }

      if (gameState.playerCards.length > 0) {
        CanvasUtils.drawTextWithShadow(ctx, `Player: ${gameState.playerScore}`, 400, 385, {
          fontSize: 22,
          fontFamily: "Arial",
          color: "#ffffff",
          shadowColor: "rgba(0, 0, 0, 0.8)",
          shadowBlur: 6,
          align: "center"
        });
      }

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
      const chipGradient = ctx.createRadialGradient(100, 550, 0, 100, 550, 50);
      chipGradient.addColorStop(0, "#14b8a6");
      chipGradient.addColorStop(0.6, "#0d9488");
      chipGradient.addColorStop(1, "#0f766e");
      ctx.fillStyle = chipGradient;
      ctx.beginPath();
      ctx.arc(100, 550, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(100, 550, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(100, 550, 50, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100 + Math.cos(angle) * 35, 550 + Math.sin(angle) * 35);
        ctx.lineTo(100 + Math.cos(angle) * 45, 550 + Math.sin(angle) * 45);
        ctx.stroke();
      }

      CanvasUtils.drawTextWithShadow(ctx, `€${bet.toFixed(2)}`, 100, 550, {
        fontSize: 16,
        fontFamily: "Arial",
        color: "#ffffff",
        shadowColor: "rgba(0, 0, 0, 0.7)",
        shadowBlur: 5,
        align: "center",
        baseline: "middle"
      });

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      CanvasUtils.roundedRect(ctx, 10, 10, 180, 100, 10);
      const panelGradient = ctx.createLinearGradient(10, 10, 10, 110);
      panelGradient.addColorStop(0, "rgba(0, 0, 0, 0.75)");
      panelGradient.addColorStop(1, "rgba(0, 0, 0, 0.85)");
      ctx.fillStyle = panelGradient;
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      CanvasUtils.roundedRect(ctx, 11, 11, 178, 98, 9);
      ctx.stroke();

      CanvasUtils.drawTextWithShadow(ctx, "BALANCE", 20, 22, {
        fontSize: 13,
        fontFamily: "Arial",
        color: "rgba(255, 255, 255, 0.75)"
      });
      CanvasUtils.drawTextWithShadow(ctx, `€${userBalance.toFixed(2)}`, 20, 42, {
        fontSize: 20,
        fontFamily: "Arial",
        color: "#ffffff",
        shadowColor: "rgba(0, 0, 0, 0.5)",
        shadowBlur: 3
      });
      CanvasUtils.drawTextWithShadow(ctx, "BET", 20, 67, {
        fontSize: 13,
        fontFamily: "Arial",
        color: "rgba(255, 255, 255, 0.75)"
      });
      CanvasUtils.drawTextWithShadow(ctx, `€${bet.toFixed(2)}`, 20, 87, {
        fontSize: 20,
        fontFamily: "Arial",
        color: "#ffffff",
        shadowColor: "rgba(0, 0, 0, 0.5)",
        shadowBlur: 3
      });

      if (gameState.playerCards.length === 0 && !isPlaying) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        CanvasUtils.roundedRect(ctx, 320, 520, 160, 50, 10);
        const dealGradient = ctx.createLinearGradient(320, 520, 320, 570);
        dealGradient.addColorStop(0, "#14b8a6");
        dealGradient.addColorStop(0.5, "#0d9488");
        dealGradient.addColorStop(1, "#0f766e");
        ctx.fillStyle = dealGradient;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "#0f766e";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        CanvasUtils.roundedRect(ctx, 321, 521, 158, 48, 9);
        ctx.stroke();
        CanvasUtils.drawTextWithShadow(ctx, "DEAL CARDS", 400, 545, {
          fontSize: 17,
          fontFamily: "Arial",
          color: "#ffffff",
          shadowColor: "rgba(0, 0, 0, 0.7)",
          shadowBlur: 5,
          align: "center",
          baseline: "middle"
        });
      } else if (gameState.playerCards.length > 0 && !gameState.gameOver && !isPlaying) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        CanvasUtils.roundedRect(ctx, 250, 520, 120, 50, 10);
        const hitGradient = ctx.createLinearGradient(250, 520, 250, 570);
        hitGradient.addColorStop(0, "#3b82f6");
        hitGradient.addColorStop(0.5, "#2563eb");
        hitGradient.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = hitGradient;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        CanvasUtils.roundedRect(ctx, 251, 521, 118, 48, 9);
        ctx.stroke();
        CanvasUtils.drawTextWithShadow(ctx, "HIT", 310, 545, {
          fontSize: 15,
          fontFamily: "Arial",
          color: "#ffffff",
          shadowColor: "rgba(0, 0, 0, 0.7)",
          shadowBlur: 5,
          align: "center",
          baseline: "middle"
        });

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        CanvasUtils.roundedRect(ctx, 390, 520, 120, 50, 10);
        const standGradient = ctx.createLinearGradient(390, 520, 390, 570);
        standGradient.addColorStop(0, "#ef4444");
        standGradient.addColorStop(0.5, "#dc2626");
        standGradient.addColorStop(1, "#b91c1c");
        ctx.fillStyle = standGradient;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "#b91c1c";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        CanvasUtils.roundedRect(ctx, 391, 521, 118, 48, 9);
        ctx.stroke();
        CanvasUtils.drawTextWithShadow(ctx, "STAND", 450, 545, {
          fontSize: 15,
          fontFamily: "Arial",
          color: "#ffffff",
          shadowColor: "rgba(0, 0, 0, 0.7)",
          shadowBlur: 5,
          align: "center",
          baseline: "middle"
        });
      }

      if (gameState.gameOver && result) {
        const resultColor = result.resultType === "WIN" ? "#22c55e" : result.resultType === "LOSS" ? "#ef4444" : "#fbbf24";
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;
        CanvasUtils.roundedRect(ctx, 250, 250, 300, 120, 16);
        const resultGradient = ctx.createLinearGradient(250, 250, 250, 370);
        resultGradient.addColorStop(0, "rgba(13, 93, 47, 0.98)");
        resultGradient.addColorStop(1, "rgba(10, 77, 46, 0.98)");
        ctx.fillStyle = resultGradient;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = resultColor;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        CanvasUtils.roundedRect(ctx, 252, 252, 296, 116, 14);
        ctx.stroke();

        CanvasUtils.drawTextWithShadow(ctx, result.resultType, 400, 290, {
          fontSize: 36,
          fontFamily: "Arial",
          color: resultColor,
          shadowColor: "rgba(0, 0, 0, 0.9)",
          shadowBlur: 10,
          align: "center"
        });
        if (result.payout > 0) {
          CanvasUtils.drawTextWithShadow(ctx, `+€${result.payout.toFixed(2)}`, 400, 325, {
            fontSize: 26,
            fontFamily: "Arial",
            color: "#ffd700",
            shadowColor: "rgba(0, 0, 0, 0.9)",
            shadowBlur: 8,
            align: "center"
          });
        }
      }
    };

    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, result, isPlaying, bet, userBalance]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x >= 320 && x <= 480 && y >= 520 && y <= 570 && gameState.playerCards.length === 0 && !isPlaying) {
      onAction("deal");
    }

    if (x >= 250 && x <= 370 && y >= 520 && y <= 570 && gameState.playerCards.length > 0 && !gameState.gameOver && !isPlaying) {
      onAction("hit");
    }

    if (x >= 390 && x <= 510 && y >= 520 && y <= 570 && gameState.playerCards.length > 0 && !gameState.gameOver && !isPlaying) {
      onAction("stand");
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: (gameState.playerCards.length === 0 && !isPlaying) || (gameState.playerCards.length > 0 && !gameState.gameOver && !isPlaying) ? "pointer" : "default"
        }}
      />
    </div>
  );
};

export default BlackjackCanvas;

