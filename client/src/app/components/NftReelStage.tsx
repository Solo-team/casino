import React, { useEffect, useRef, useState, useCallback } from "react";
import type { NftSymbolSummary } from "../../types/api";

export type SlotMode = "classic" | "expanded";

export interface FreeSpinState {
  active: boolean;
  remaining: number;
  total: number;
}

interface Props {
  pool: NftSymbolSummary[];
  activeSymbols: NftSymbolSummary[] | null;
  isSpinning: boolean;
  highlightWin?: boolean;
  mode?: SlotMode;
  freeSpinState?: FreeSpinState;
  freeSpinPositions?: number[]; // индексы ячеек где выпал free spin
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const CLASSIC_CELLS = 3;
const EXPANDED_CELLS = 9;
const SYMBOLS_IN_STRIP = 25;
const ITEM_HEIGHT = 140;

// Don't proxy local files (starting with /)
const buildProxyUrl = (url?: string): string => {
  if (!url) return "";
  // Local files don't need proxy
  if (url.startsWith("/")) return url;
  return `${API_BASE}/nft/image?url=${encodeURIComponent(url)}`;
};

const fallbackSymbol = (index: number): NftSymbolSummary => ({
  id: `placeholder-${index}`,
  name: "???",
  imageUrl: "",
  priceLabel: "",
  priceValue: 0,
  rarity: "common"
});

const pickRandom = (pool: NftSymbolSummary[]): NftSymbolSummary =>
  pool.length ? pool[Math.floor(Math.random() * pool.length)] : fallbackSymbol(0);

const generateStrip = (pool: NftSymbolSummary[], finalSymbol: NftSymbolSummary): NftSymbolSummary[] => {
  const strip: NftSymbolSummary[] = [];
  for (let i = 0; i < SYMBOLS_IN_STRIP; i++) {
    strip.push(pickRandom(pool));
  }
  strip[strip.length - 1] = finalSymbol;
  return strip;
};

// Извлечь доминирующий цвет из картинки
const extractDominantColor = (img: HTMLImageElement): string => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "rgba(61, 67, 99, 0.5)";
    
    canvas.width = 10;
    canvas.height = 10;
    ctx.drawImage(img, 0, 0, 10, 10);
    
    const data = ctx.getImageData(0, 0, 10, 10).data;
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) { // достаточно непрозрачный
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    
    if (count === 0) return "rgba(61, 67, 99, 0.5)";
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  } catch {
    return "rgba(61, 67, 99, 0.5)";
  }
};

type SpinPhase = "idle" | "spinning" | "settled";

interface ReelProps {
  pool: NftSymbolSummary[];
  finalSymbol: NftSymbolSummary;
  isSpinning: boolean;
  highlight: boolean;
  reelIndex: number;
  totalReels: number;
  isFreeSpinSymbol?: boolean;
  inFreeSpinMode?: boolean;
}

const Reel: React.FC<ReelProps> = ({ 
  pool, 
  finalSymbol, 
  isSpinning, 
  highlight, 
  reelIndex, 
  totalReels,
  isFreeSpinSymbol,
  inFreeSpinMode 
}) => {
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [strip, setStrip] = useState<NftSymbolSummary[]>(() => generateStrip(pool, finalSymbol));
  const [translateY, setTranslateY] = useState(0);
  const [borderColor, setBorderColor] = useState("rgba(61, 67, 99, 0.5)");
  const animationRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Stagger для каскадной остановки
  const BASE_DURATION = 1600;
  const STAGGER = totalReels > 3 ? 150 : 400;
  const totalDuration = BASE_DURATION + reelIndex * STAGGER;
  const targetOffset = (SYMBOLS_IN_STRIP - 1) * ITEM_HEIGHT;

  // Извлекаем цвет из финального изображения
  useEffect(() => {
    if (finalSymbol.imageUrl && !isFreeSpinSymbol) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const color = extractDominantColor(img);
        setBorderColor(color);
      };
      img.src = buildProxyUrl(finalSymbol.imageUrl);
    } else if (isFreeSpinSymbol) {
      setBorderColor("rgba(50, 205, 50, 0.8)");
    }
  }, [finalSymbol.imageUrl, isFreeSpinSymbol]);

  useEffect(() => {
    if (isSpinning && phase === "idle") {
      const newStrip = generateStrip(pool, finalSymbol);
      setStrip(newStrip);
      setTranslateY(0);
      setPhase("spinning");
    }
  }, [isSpinning]);

  useEffect(() => {
    if (phase !== "spinning") return;

    const startTime = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      setTranslateY(easeProgress * targetOffset);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTranslateY(targetOffset);
        setPhase("settled");
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, totalDuration, targetOffset]);

  useEffect(() => {
    if (!isSpinning && phase === "settled") {
      const timeout = setTimeout(() => setPhase("idle"), 100);
      return () => clearTimeout(timeout);
    }
  }, [isSpinning, phase]);

  const isSettled = phase === "settled" || (phase === "idle" && !isSpinning);
  const showHighlight = highlight && isSettled;
  const showFreeSpinGlow = isFreeSpinSymbol && isSettled;

  const reelStyle: React.CSSProperties = {
    borderColor: showFreeSpinGlow 
      ? "rgba(50, 205, 50, 0.9)" 
      : isSettled 
        ? borderColor 
        : "rgba(61, 67, 99, 0.3)",
    boxShadow: showFreeSpinGlow
      ? "0 0 30px rgba(50, 205, 50, 0.6), 0 0 60px rgba(50, 205, 50, 0.3), inset 0 0 20px rgba(50, 205, 50, 0.2)"
      : showHighlight
        ? `0 0 25px ${borderColor}, 0 0 50px ${borderColor.replace("0.7", "0.3")}`
        : phase === "spinning"
          ? "0 0 15px rgba(100, 100, 255, 0.3)"
          : "none"
  };

  return (
    <div
      className={`slot-reel ${phase === "spinning" ? "spinning" : ""} ${showHighlight ? "winner" : ""} ${showFreeSpinGlow ? "free-spin-cell" : ""} ${inFreeSpinMode ? "free-mode" : ""}`}
      style={reelStyle}
    >
      <div className="slot-reel-mask">
        <div
          className="slot-strip-vertical"
          style={{ transform: `translateY(-${translateY}px)` }}
        >
          {strip.map((sym, idx) => (
            <div 
              key={`${sym.id}-${idx}`} 
              className={`slot-item-v ${idx === strip.length - 1 && showHighlight ? "highlight" : ""}`}
              style={{ height: ITEM_HEIGHT }}
            >
              {sym.imageUrl ? (
                <img
                  ref={idx === strip.length - 1 ? imgRef : undefined}
                  src={buildProxyUrl(sym.imageUrl)}
                  alt={sym.name}
                  crossOrigin="anonymous"
                  loading="eager"
                  draggable={false}
                />
              ) : (
                <div className="slot-placeholder" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NftReelStage: React.FC<Props> = ({ 
  pool, 
  activeSymbols, 
  isSpinning, 
  highlightWin,
  mode = "classic",
  freeSpinState,
  freeSpinPositions = []
}) => {
  const cellCount = mode === "expanded" ? EXPANDED_CELLS : CLASSIC_CELLS;
  
  const reelSymbols = activeSymbols && activeSymbols.length === cellCount
    ? activeSymbols
    : Array.from({ length: cellCount }, (_, i) => pool[i % pool.length] || fallbackSymbol(i));

  const gridClass = mode === "expanded" ? "nft-reel-stage expanded" : "nft-reel-stage";
  const inFreeMode = freeSpinState?.active || false;

  return (
    <div className={`${gridClass} ${inFreeMode ? "free-spin-active" : ""}`}>
      {/* Free Spin Counter */}
      {inFreeMode && freeSpinState && (
        <div className="free-spin-counter">
          <span className="free-spin-badge">🎰 FREE SPINS</span>
          <span className="free-spin-count">{freeSpinState.remaining} / {freeSpinState.total}</span>
        </div>
      )}
      
      {Array.from({ length: cellCount }).map((_, index) => (
        <Reel
          key={index}
          pool={pool}
          finalSymbol={reelSymbols[index] || fallbackSymbol(index)}
          isSpinning={isSpinning}
          highlight={Boolean(highlightWin)}
          reelIndex={index}
          totalReels={cellCount}
          isFreeSpinSymbol={freeSpinPositions.includes(index)}
          inFreeSpinMode={inFreeMode}
        />
      ))}
      
      {/* Free Spin Overlay Effect */}
      {inFreeMode && (
        <div className="free-spin-overlay">
          <div className="sparkle sparkle-1" />
          <div className="sparkle sparkle-2" />
          <div className="sparkle sparkle-3" />
          <div className="sparkle sparkle-4" />
          <div className="sparkle sparkle-5" />
        </div>
      )}
    </div>
  );
};

export default NftReelStage;
