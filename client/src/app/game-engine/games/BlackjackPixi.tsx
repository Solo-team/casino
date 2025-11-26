import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { BlurFilter } from "pixi.js";
import type { ApiGameResult } from "../../../types/api";

interface Props {
  result: ApiGameResult | null;
  isPlaying: boolean;
  onAction: (action: "hit" | "stand" | "deal") => void;
  bet: number;
  userBalance?: number;
}

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 700;
const PANEL_WIDTH = 80;
const CARD_WIDTH = 130;
const CARD_HEIGHT = 190;
const CARD_SPACING = 60;
const RADIUS = 10;

const COLORS = {
  TABLE_FELT: 0x0d4a2e,
  TABLE_FELT_LIGHT: 0x1a6b47,
  TABLE_BORDER: 0x0a0a0a,
  CARD_BG: 0xffffff,
  CARD_BG_SHADOW: 0xf5f5f5,
  CARD_BACK: 0xdc2626,
  CARD_BACK_DARK: 0x991b1b,
  RED_SUIT: 0xdc2626,
  BLACK_SUIT: 0x1a1a1a,
  ACCENT: 0xffd700,
  ACCENT_LIGHT: 0xffed4e,
  SHADOW: 0x000000,
  BUTTON_BLUE: 0x3b82f6,
  BUTTON_BLUE_LIGHT: 0x60a5fa,
  BUTTON_RED: 0xef4444,
  BUTTON_RED_LIGHT: 0xf87171
};

const SUITS = {
  hearts: { symbol: "♥", color: COLORS.RED_SUIT },
  diamonds: { symbol: "♦", color: COLORS.RED_SUIT },
  clubs: { symbol: "♣", color: COLORS.BLACK_SUIT },
  spades: { symbol: "♠", color: COLORS.BLACK_SUIT }
};

const parseCard = (str: string) => {
  if (str === "HIDDEN") return { suit: "spades", rank: "?", isHidden: true, value: 0 };
  
  const parts = str.split(" of ");
  if (parts.length < 2) return { suit: "spades", rank: str, isHidden: false, value: 0 };

  const [rankStr, suitStr] = parts;
  const suitKey = suitStr.toLowerCase() as keyof typeof SUITS;
  
  const ranks: Record<string, string> = { 
    ACE: "A", TWO: "2", THREE: "3", FOUR: "4", FIVE: "5", SIX: "6", 
    SEVEN: "7", EIGHT: "8", NINE: "9", TEN: "10", JACK: "J", QUEEN: "Q", KING: "K" 
  };

  const rankValues: Record<string, number> = {
    "A": 11, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
    "7": 7, "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10
  };

  const rank = ranks[rankStr] || rankStr[0];
  const value = rankValues[rank] || 0;

  return { 
    suit: SUITS[suitKey] ? suitKey : "spades", 
    rank: rank,
    isHidden: false,
    value: value
  };
};

const calculateScore = (cards: string[]): number => {
  let score = 0;
  let aces = 0;

  for (const cardStr of cards) {
    if (cardStr === "HIDDEN") continue;
    const card = parseCard(cardStr);
    if (card.rank === "A") {
      aces++;
      score += 11;
    } else {
      score += card.value;
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
};

const createDropShadow = (width: number, height: number, radius: number, distance: number = 6, blur: number = 6): PIXI.Graphics => {
  const shadow = new PIXI.Graphics()
    .roundRect(distance, distance, width, height, radius)
    .fill({ color: 0x000000, alpha: 0.5 });
  shadow.filters = [new BlurFilter({ strength: blur })];
  return shadow;
};

const createCardSprite = (cardInfo: ReturnType<typeof parseCard>): PIXI.Container => {
  const container = new PIXI.Container();

  const shadow = createDropShadow(CARD_WIDTH, CARD_HEIGHT, RADIUS, 6, 6);
  container.addChild(shadow);

  const bg = new PIXI.Graphics();

  if (cardInfo.isHidden) {
    bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, RADIUS)
      .fill(COLORS.CARD_BG)
      .stroke({ width: 1, color: 0xcccccc });

    bg.rect(6, 6, CARD_WIDTH - 12, CARD_HEIGHT - 12)
      .fill(COLORS.CARD_BACK);
    
    bg.circle(CARD_WIDTH / 2, CARD_HEIGHT / 2, 15)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
      
    bg.moveTo(6, 6).lineTo(CARD_WIDTH-6, CARD_HEIGHT-6).stroke({ width: 1, color: 0x000000, alpha: 0.1 });
    bg.moveTo(CARD_WIDTH-6, 6).lineTo(6, CARD_HEIGHT-6).stroke({ width: 1, color: 0x000000, alpha: 0.1 });

  } else {
    bg.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, RADIUS)
      .fill(COLORS.CARD_BG)
      .stroke({ width: 1, color: 0xcccccc });

    const suitData = SUITS[cardInfo.suit as keyof typeof SUITS];
    const color = suitData.color;
    const textStyle = {
      fontFamily: "Arial",
      fontWeight: "bold" as const,
      fill: color,
    };

    const rankTop = new PIXI.Text({ text: cardInfo.rank, style: { ...textStyle, fontSize: 28 } });
    rankTop.position.set(10, 6);
    
    const suitTop = new PIXI.Text({ text: suitData.symbol, style: { ...textStyle, fontSize: 24 } });
    suitTop.position.set(10, 38);

    const rankBot = new PIXI.Text({ text: cardInfo.rank, style: { ...textStyle, fontSize: 28 } });
    rankBot.anchor.set(1, 1);
    rankBot.position.set(CARD_WIDTH - 10, CARD_HEIGHT - 6);
    rankBot.rotation = Math.PI;

    const suitBot = new PIXI.Text({ text: suitData.symbol, style: { ...textStyle, fontSize: 24 } });
    suitBot.anchor.set(1, 1);
    suitBot.position.set(CARD_WIDTH - 10, CARD_HEIGHT - 38);
    suitBot.rotation = Math.PI;

    const centerScale = ["J", "Q", "K"].includes(cardInfo.rank) ? 0.8 : 1;
    const centerText = ["J", "Q", "K"].includes(cardInfo.rank) ? cardInfo.rank : suitData.symbol;
    
    const center = new PIXI.Text({ 
      text: centerText, 
      style: { ...textStyle, fontSize: 76 * centerScale } 
    });
    center.alpha = 0.2;
    center.anchor.set(0.5);
    center.position.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);

    container.addChild(bg, center, rankTop, suitTop, rankBot, suitBot);
    return container;
  }

  container.addChild(bg);
  return container;
};

const BlackjackPixi: React.FC<Props> = ({ result, isPlaying, onAction, bet, userBalance = 0 }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const scene3DRef = useRef<PIXI.Container | null>(null);
  const gameLayerRef = useRef<PIXI.Container | null>(null);
  const balanceLabelRef = useRef<PIXI.Text | null>(null);
  const betLabelRef = useRef<PIXI.Text | null>(null);
  const prevPlayerCardsRef = useRef<string[]>([]);
  const prevDealerCardsRef = useRef<string[]>([]);
  const prevFinishedRef = useRef<boolean>(false);
  const dealerCardRefs = useRef<Map<number, PIXI.Container>>(new Map());
  const dealerCardsShownRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    const app = new PIXI.Application();

    const init = async () => {
      await app.init({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 0x000000,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (!isMounted || !gameContainerRef.current) {
        app.destroy();
        return;
      }

      gameContainerRef.current.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      appRef.current = app;

      const scene3D = new PIXI.Container();
      const tableLayer = new PIXI.Container();
      const gameLayer = new PIXI.Container();
      const uiLayer = new PIXI.Container();

      scene3DRef.current = scene3D;
      gameLayerRef.current = gameLayer;
      
      scene3D.addChild(tableLayer, gameLayer);
      app.stage.addChild(scene3D, uiLayer);

      scene3D.pivot.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      scene3D.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      scene3D.skew.x = -0.2;
      scene3D.scale.y = 0.9;

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      app.stage.on('pointermove', (e) => {
        const { x, y } = e.global;
        const nx = (x / GAME_WIDTH - 0.5);
        const ny = (y / GAME_HEIGHT - 0.5);

        if (scene3DRef.current) {
          scene3DRef.current.rotation = nx * 0.05;
          scene3DRef.current.skew.x = -0.2 + ny * 0.05;
        }
      });

      drawTable(tableLayer);
      setupUI(uiLayer);
      updateGameState();
    };

    init();

    return () => {
      isMounted = false;
      if (appRef.current) {
        appRef.current.destroy({ removeView: true }, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  const drawTable = (layer: PIXI.Container) => {
    const g = new PIXI.Graphics();

    g.roundRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 40)
     .fill(0x0a0a0f);

    g.roundRect(20, 20, GAME_WIDTH - 40, GAME_HEIGHT - 40, 32)
     .fill(0x0f1a23);

    const topMargin = 80;
    const bottomMargin = 30;
    const inset = 100;

    g.moveTo(inset, topMargin);
    g.lineTo(GAME_WIDTH - inset, topMargin);
    g.lineTo(GAME_WIDTH - bottomMargin, GAME_HEIGHT - bottomMargin);
    g.lineTo(bottomMargin, GAME_HEIGHT - bottomMargin);
    g.closePath();
    g.fill(COLORS.TABLE_FELT);

    g.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 400)
     .fill({ color: 0xffffff, alpha: 0.02 });

    g.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 250)
     .fill({ color: 0xffffff, alpha: 0.03 });

    g.rect(GAME_WIDTH - 140, 60, 100, 140)
     .fill(0x2d1b1b)
     .stroke({ width: 2, color: 0x000000, alpha: 0.5 });
    
    g.rect(GAME_WIDTH - 130, 70, 80, 120)
     .fill(COLORS.CARD_BACK);

    layer.addChild(g);

    const title = new PIXI.Text({
      text: "PREMIUM BLACKJACK",
      style: {
        fontFamily: "Arial", fontSize: 28, fill: 0xffffff,
        letterSpacing: 4, fontWeight: "bold"
      }
    });
    title.alpha = 0.15;
    title.anchor.set(0.5);
    title.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
    layer.addChild(title);
  };

  const animateCard = (
    card: PIXI.Container,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    toRotation: number,
    toScale: number,
    duration: number = 600
  ) => {
    const startX = fromX;
    const startY = fromY;
    const startRotation = -0.3;
    const startScale = 0.3;
    
    card.position.set(startX, startY);
    card.rotation = startRotation;
    card.scale.set(startScale);
    card.alpha = 0;

    const startTime = Date.now();
    const ticker = appRef.current?.ticker;

    if (!ticker) return;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const easeInOut = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentX = startX + (toX - startX) * easeOutCubic;
      const currentY = startY + (toY - startY) * easeOutCubic;
      const currentRotation = startRotation + (toRotation - startRotation) * easeInOut;
      const currentScale = startScale + (toScale - startScale) * easeInOut;
      const currentAlpha = progress < 0.3 ? progress / 0.3 : 1;

      card.position.set(currentX, currentY);
      card.rotation = currentRotation;
      card.scale.set(currentScale);
      card.alpha = currentAlpha;

      if (progress >= 1) {
        ticker.remove(animate);
        card.position.set(toX, toY);
        card.rotation = toRotation;
        card.scale.set(toScale);
        card.alpha = 1;
      }
    };

    ticker.add(animate);
  };

  const flipCard = (
    hiddenCard: PIXI.Container,
    cardData: string,
    finalX: number,
    finalY: number,
    finalRotation: number,
    finalScale: number,
    duration: number = 500
  ) => {
    const startTime = Date.now();
    const ticker = appRef.current?.ticker;

    if (!ticker || !gameLayerRef.current) return;

    const startScaleX = hiddenCard.scale.x;
    const startRotation = hiddenCard.rotation;
    let cardReplaced = false;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeInOut = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      if (progress < 0.5) {
        const flipProgress = progress * 2;
        hiddenCard.scale.x = startScaleX * (1 - flipProgress);
        hiddenCard.rotation = startRotation + (Math.PI / 2) * flipProgress;
      } else {
        if (!cardReplaced) {
          hiddenCard.removeChildren();
          const newCard = createCardSprite(parseCard(cardData));
          newCard.position.set(0, 0);
          hiddenCard.addChild(newCard);
          cardReplaced = true;
        }
        
        const flipProgress = (progress - 0.5) * 2;
        hiddenCard.scale.x = finalScale * flipProgress;
        hiddenCard.rotation = startRotation + Math.PI / 2 + (finalRotation - startRotation - Math.PI / 2) * flipProgress;
      }

      if (progress >= 1) {
        ticker.remove(animate);
        hiddenCard.scale.x = finalScale;
        hiddenCard.rotation = finalRotation;
        hiddenCard.position.set(finalX, finalY);
      }
    };

    ticker.add(animate);
  };

  const setupUI = (layer: PIXI.Container) => {
    const panel = new PIXI.Graphics()
      .roundRect(30, 30, 180, 70, 12)
      .fill({ color: 0x000000, alpha: 0.6 });
    layer.addChild(panel);

    const labelStyle = { fontFamily: "Arial", fontSize: 11, fill: 0xaaaaaa };
    const valueStyle = { fontFamily: "Arial", fontSize: 18, fill: COLORS.ACCENT, fontWeight: "bold" as const };

    const balText = new PIXI.Text({ text: "BALANCE", style: labelStyle });
    balText.position.set(45, 40);
    layer.addChild(balText);

    balanceLabelRef.current = new PIXI.Text({ text: "€0.00", style: valueStyle });
    balanceLabelRef.current.position.set(45, 55);
    layer.addChild(balanceLabelRef.current);

    const betText = new PIXI.Text({ text: "BET", style: labelStyle });
    betText.position.set(140, 40);
    layer.addChild(betText);

    betLabelRef.current = new PIXI.Text({ text: "€0.00", style: valueStyle });
    betLabelRef.current.position.set(140, 55);
    layer.addChild(betLabelRef.current);
  };

  const updateGameState = () => {
    if (!gameLayerRef.current) return;
    const layer = gameLayerRef.current;
    layer.removeChildren();

    if (balanceLabelRef.current) balanceLabelRef.current.text = `€${userBalance.toFixed(2)}`;
    if (betLabelRef.current) betLabelRef.current.text = `€${bet.toFixed(2)}`;

    if (!result?.gameData) {
      prevPlayerCardsRef.current = [];
      prevDealerCardsRef.current = [];
      prevFinishedRef.current = false;
      dealerCardsShownRef.current = 0;
      dealerCardRefs.current.clear();
      createButton(layer, "DEAL", GAME_WIDTH / 2, GAME_HEIGHT / 2, 160, COLORS.ACCENT, 0x000000, () => onAction("deal"));
      return;
    }

    const data = result.gameData as any;
    const playerCards = Array.isArray(data.playerHand) ? data.playerHand : [];
    const dealerCards = Array.isArray(data.dealerHand) ? data.dealerHand : [];
    const finished = data.gameFinished === true || result.resultType !== "DRAW" || data.status === "finished";

    if (dealerCards.length > 0) {
      const visibleDealerCards = finished ? dealerCards : dealerCards.filter((c: string) => c !== "HIDDEN");
      const dealerScore = finished 
        ? (data.dealerScore || calculateScore(dealerCards))
        : calculateScore(visibleDealerCards);
      
      drawScoreBadge(layer, dealerScore, GAME_WIDTH / 2, 110);
      
      const totalWidth = dealerCards.length * CARD_SPACING;
      const startX = (GAME_WIDTH - totalWidth) / 2 + CARD_WIDTH / 2;
      const dealerY = 140;
      const midIndex = (dealerCards.length - 1) / 2;
      const deckX = GAME_WIDTH - 90;
      const deckY = 130;
      const justFinished = finished && !prevFinishedRef.current;

      const prevDealerCount = prevDealerCardsRef.current.filter((c: string) => c !== "HIDDEN").length;
      const currentDealerCount = dealerCards.filter((c: string) => c !== "HIDDEN").length;
      const newCardsCount = currentDealerCount - prevDealerCount;
      const shouldShowGradually = finished && newCardsCount > 0 && prevDealerCardsRef.current.length > 0;

      if (justFinished && shouldShowGradually) {
        dealerCardsShownRef.current = prevDealerCount;
      }

      dealerCards.forEach((str: string, i: number) => {
        const wasHidden = prevDealerCardsRef.current[i] === "HIDDEN";
        const isNowVisible = str !== "HIDDEN";
        const shouldFlip = justFinished && wasHidden && isNowVisible;
        
        const cardStr = shouldFlip ? "HIDDEN" : str;
        const card = createCardSprite(parseCard(cardStr));
        const angle = (i - midIndex) * 0.06;
        const finalX = startX + i * CARD_SPACING;
        const finalY = dealerY + Math.abs(i - midIndex) * 2;
        
        const distFromCenter = dealerY - GAME_HEIGHT / 2;
        const baseScale = 1;
        const perspectiveFactor = 0.0006;
        const finalScale = baseScale + distFromCenter * perspectiveFactor;
        
        const isNewCard = i >= prevDealerCardsRef.current.length;
        const isVisibleCard = str !== "HIDDEN";
        const cardIndex = dealerCards.slice(0, i + 1).filter((c: string) => c !== "HIDDEN").length - 1;
        const shouldShowLater = shouldShowGradually && isVisibleCard && cardIndex >= dealerCardsShownRef.current;
        
        if (shouldFlip) {
          card.position.set(finalX, finalY);
          card.rotation = angle;
          card.scale.set(finalScale);
          setTimeout(() => {
            flipCard(card, str, finalX, finalY, angle, finalScale, 500);
          }, 300);
          layer.addChild(card);
        } else if (shouldShowLater) {
          card.alpha = 0;
          card.position.set(deckX, deckY);
          card.rotation = -0.3;
          card.scale.set(0.3);
          layer.addChild(card);
          
          const delay = (cardIndex - dealerCardsShownRef.current) * 1800;
          setTimeout(() => {
            dealerCardsShownRef.current++;
            animateCard(card, deckX, deckY, finalX, finalY, angle, finalScale, 1200);
          }, delay);
        } else if (isNewCard && !finished) {
          animateCard(card, deckX, deckY, finalX, finalY, angle, finalScale, 600);
          layer.addChild(card);
        } else {
          card.position.set(finalX, finalY);
          card.rotation = angle;
          card.scale.set(finalScale);
          layer.addChild(card);
        }
        
        dealerCardRefs.current.set(i, card);
      });
      
      prevDealerCardsRef.current = [...dealerCards];
      prevFinishedRef.current = finished;
      
      if (!shouldShowGradually) {
        const visibleCount = dealerCards.filter((c: string) => c !== "HIDDEN").length;
        dealerCardsShownRef.current = visibleCount;
      }
    } else {
      prevDealerCardsRef.current = [];
      prevFinishedRef.current = false;
      dealerCardsShownRef.current = 0;
    }

    if (playerCards.length > 0) {
      drawScoreBadge(layer, data.playerScore || 0, GAME_WIDTH / 2, 340);

      const totalWidth = playerCards.length * CARD_SPACING;
      const startX = (GAME_WIDTH - totalWidth) / 2 + CARD_WIDTH / 2;
      const playerY = 380;
      const midIndex = (playerCards.length - 1) / 2;
      const deckX = GAME_WIDTH - 90;
      const deckY = 130;

      playerCards.forEach((str: string, i: number) => {
        const card = createCardSprite(parseCard(str));
        const angle = (i - midIndex) * 0.06;
        const finalX = startX + i * CARD_SPACING;
        const finalY = playerY + Math.abs(i - midIndex) * 2;
        
        const distFromCenter = playerY - GAME_HEIGHT / 2;
        const baseScale = 1;
        const perspectiveFactor = 0.0006;
        const finalScale = baseScale + distFromCenter * perspectiveFactor;
        
        const isNewCard = i >= prevPlayerCardsRef.current.length;
        
        if (isNewCard) {
          animateCard(card, deckX, deckY, finalX, finalY, angle, finalScale, 600);
        } else {
          card.position.set(finalX, finalY);
          card.rotation = angle;
          card.scale.set(finalScale);
        }
        
        layer.addChild(card);
      });
      
      prevPlayerCardsRef.current = [...playerCards];
    } else {
      prevPlayerCardsRef.current = [];
    }

    const controlsY = 515;
    
    drawPokerChip(layer, 100, 505, bet);

    if (playerCards.length > 0 && !finished) {
      createButton(layer, "HIT", GAME_WIDTH / 2 - 90, controlsY, 140, 0x3b82f6, 0xffffff, () => onAction("hit"));
      createButton(layer, "STAND", GAME_WIDTH / 2 + 90, controlsY, 140, 0xef4444, 0xffffff, () => onAction("stand"));
    } else if (finished) {
      createButton(layer, "NEW DEAL", GAME_WIDTH - 120, controlsY, 160, COLORS.ACCENT, 0x000000, () => onAction("deal"));
    }

    if (finished && result) {
      drawResultOverlay(layer, result.resultType, result.payout);
    }
  };

  useEffect(() => { updateGameState(); }, [result, isPlaying, bet, userBalance, onAction]);

  const drawPokerChip = (container: PIXI.Container, x: number, y: number, val: number) => {
    const chip = new PIXI.Container();
    chip.position.set(x, y);

    const chipSize = 32;
    const shadow = new PIXI.Graphics()
      .circle(4, 4, chipSize)
      .fill({ color: 0x000000, alpha: 0.6 });
    shadow.filters = [new BlurFilter({ strength: 4 })];
    chip.addChild(shadow);

    const g = new PIXI.Graphics();
    g.circle(0, 0, chipSize).fill(0xef4444)
     .stroke({ width: 4, color: 0xffffff, alpha: 0.8 });
    
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const startAngle = (i * 2 * Math.PI) / segments;
      const endAngle = ((i + 0.5) * 2 * Math.PI) / segments;
      g.arc(0, 0, chipSize, startAngle, endAngle)
       .stroke({ width: 6, color: 0xffffff, alpha: 0.9 });
    }
    
    g.circle(0, 0, 22).stroke({ width: 2, color: 0xffffff, alpha: 0.3 });

    chip.addChild(g);

    const text = new PIXI.Text({
      text: `${val}`,
      style: { fontFamily: "Arial", fontSize: 18, fill: 0xffffff, fontWeight: "bold", dropShadow: { blur: 2 } }
    });
    text.anchor.set(0.5);
    chip.addChild(text);

    container.addChild(chip);
  };

  const createButton = (
    container: PIXI.Container, 
    text: string, x: number, y: number, w: number, 
    bgColor: number, textColor: number, cb: () => void
  ) => {
    const btn = new PIXI.Container();
    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const g = new PIXI.Graphics();
    
    const draw = (pressed = false) => {
      g.clear();
      const offset = pressed ? 2 : 0;
      if (!pressed) g.roundRect(0, 4, w, 50, 16).fill({ color: 0x000000, alpha: 0.4 });
      g.roundRect(0, offset, w, 50, 16).fill(bgColor);
      g.roundRect(2, offset + 2, w - 4, 22, 14).fill({ color: 0xffffff, alpha: 0.15 });
    };

    draw();

    const label = new PIXI.Text({
      text,
      style: { 
        fontFamily: "Arial", fontSize: 20, fill: textColor, fontWeight: "bold",
        dropShadow: { alpha: 0.3, blur: 2, distance: 2 }
      }
    });
    label.anchor.set(0.5);
    label.position.set(w / 2, 25);

    btn.addChild(g, label);

    btn.on("pointerdown", () => { draw(true); label.y += 2; });
    btn.on("pointerup", () => { draw(false); label.y -= 2; cb(); });
    btn.on("pointerupoutside", () => { draw(false); label.y -= 2; });

    btn.pivot.set(w / 2, 25);

    container.addChild(btn);
  };

  const drawScoreBadge = (container: PIXI.Container, score: number, x: number, y: number) => {
    const badge = new PIXI.Container();
    badge.position.set(x, y);

    const g = new PIXI.Graphics()
      .roundRect(-30, -15, 60, 30, 15)
      .fill({ color: 0x000000, alpha: 0.6 })
      .stroke({ width: 1, color: 0xffffff, alpha: 0.2 });
    
    const text = new PIXI.Text({
      text: score.toString(),
      style: { fontFamily: "Arial", fontSize: 18, fill: 0xffffff, fontWeight: "bold" }
    });
    text.anchor.set(0.5);

    badge.addChild(g, text);
    container.addChild(badge);
  };

  const drawResultOverlay = (container: PIXI.Container, type: string, payout: number) => {
    const bg = new PIXI.Graphics()
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill({ color: 0x000000, alpha: 0.6 });
    
    container.addChild(bg);

    const message = type === "WIN" ? "YOU WON!" : type === "DRAW" ? "PUSH" : "DEALER WINS";
    const subMsg = payout > 0 ? `+€${payout.toFixed(2)}` : type === "DRAW" ? "Bet Returned" : "Better luck next time";
    const color = type === "WIN" ? 0x22c55e : type === "DRAW" ? 0xf59e0b : 0xef4444;

    const title = new PIXI.Text({
      text: message,
      style: {
        fontFamily: "Arial", fontSize: 64, fill: color, fontWeight: "900",
        stroke: { color: 0xffffff, width: 4 },
        dropShadow: { color: 0x000000, blur: 20, distance: 0, alpha: 0.8 }
      }
    });
    title.anchor.set(0.5);
    title.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

    const sub = new PIXI.Text({
      text: subMsg,
      style: { fontFamily: "Arial", fontSize: 32, fill: 0xffffff, fontWeight: "bold" }
    });
    sub.anchor.set(0.5);
    sub.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

    container.addChild(title, sub);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const newIsFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement || !!(document as any).mozFullScreenElement || !!(document as any).msFullscreenElement;
      setIsFullscreen(newIsFullscreen);
      
      if (appRef.current && gameContainerRef.current) {
        if (newIsFullscreen) {
          appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
        } else {
          appRef.current.renderer.resize(GAME_WIDTH, GAME_HEIGHT);
        }
      }
    };

    const handleResize = () => {
      if (isFullscreen && appRef.current) {
        appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen]);

  return (
    <div 
      ref={containerRef}
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#0a0a0a"
      }}
    >
      <div
        ref={gameContainerRef}
        style={{
          width: isFullscreen ? "100%" : `${GAME_WIDTH}px`,
          height: isFullscreen ? "100%" : `${GAME_HEIGHT}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: isFullscreen ? 0 : "auto"
        }}
      />
      {!isFullscreen && (
        <div
          style={{
            width: `${PANEL_WIDTH}px`,
            height: `${GAME_HEIGHT}px`,
            backgroundColor: "#0f1a23",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: "20px",
            gap: "20px"
          }}
        >
          <button
            onClick={toggleFullscreen}
            style={{
              width: "50px",
              height: "50px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "24px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            title="Полноэкранный режим"
          >
            ⛶
          </button>
        </div>
      )}
    </div>
  );
};

export default BlackjackPixi;