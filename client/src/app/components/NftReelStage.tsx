import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { NftSymbolSummary } from "../../types/api";

export type SlotMode = "expanded" | "mode5";

export interface FreeSpinState {
  active: boolean;
  remaining: number;
  total: number;
}

interface Props {
  pool: NftSymbolSummary[];
  displaySymbols: NftSymbolSummary[] | null;
  nextSymbols: NftSymbolSummary[] | null;
  isSpinning: boolean;
  spinId: number;
  highlightWin?: boolean;
  winningLines?: number[][]; // Массив выигрышных линий [6,7,8] etc
  mode?: SlotMode;
  freeSpinState?: FreeSpinState;
  freeSpinPositions?: number[];
  stickyWildPositions?: number[];
  reSpinColumns?: number[]; // Колонки для ре-спина (0, 1, 2) - для визуального выделения
  onAllSettled?: () => void; // вызывается когда все барабаны остановились
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const EXPANDED_CELLS = 9;
const MODE5_CELLS = 25;
const SYMBOLS_IN_STRIP = 25;
const ITEM_HEIGHT = 140;

const buildProxyUrl = (url?: string): string => {
  if (!url) return "";
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

const generateStrip = (
  pool: NftSymbolSummary[],
  startSymbol: NftSymbolSummary,
  finalSymbol: NftSymbolSummary
): NftSymbolSummary[] => {
  const strip: NftSymbolSummary[] = [];
  for (let i = 0; i < SYMBOLS_IN_STRIP; i++) {
    if (i === 0) {
      strip.push(startSymbol);
    } else if (i === SYMBOLS_IN_STRIP - 1) {
      strip.push(finalSymbol);
    } else {
      strip.push(pickRandom(pool));
    }
  }
  return strip;
};

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
      if (data[i + 3] > 128) {
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
  displaySymbol: NftSymbolSummary;
  finalSymbol: NftSymbolSummary;
  isSpinning: boolean;
  spinId: number;
  highlight: boolean;
  reelIndex: number;
  totalReels: number;
  isFreeSpinSymbol?: boolean;
  inFreeSpinMode?: boolean;
  onReelReady?: (index: number) => void;
}

const Reel: React.FC<ReelProps> = ({ 
  pool, 
  displaySymbol,
  finalSymbol, 
  isSpinning, 
  spinId,
  highlight, 
  reelIndex, 
  totalReels,
  isFreeSpinSymbol,
  inFreeSpinMode,
  onReelReady
}) => {
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [strip, setStrip] = useState<NftSymbolSummary[]>(() => generateStrip(pool, displaySymbol, displaySymbol));
  const [translateY, setTranslateY] = useState(0);
  const [borderColor, setBorderColor] = useState("rgba(61, 67, 99, 0.5)");
  const [colorLoaded, setColorLoaded] = useState(false);
  const animationRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const colorSource = (phase === "spinning" || phase === "settled" || isSpinning) ? finalSymbol : displaySymbol;
  // Detect multiplier symbols (2.svg - 9.svg or id/label hints)
  const isMultiplierSymbol = Boolean(
    /\/[2-9]\.(svg|txt)$/i.test(colorSource.imageUrl || "") ||
    colorSource.id?.startsWith("multiplier-") ||
    colorSource.priceLabel?.toLowerCase().startsWith("x")
  );
  // Treat both forced scatter positions and natural wilds as bonus symbols
  const isFreeSpinLike = Boolean(isFreeSpinSymbol || colorSource.imageUrl === "/free.jpg");
  
  const BASE_DURATION = 2000;
  const STAGGER = totalReels > 3 ? 200 : 400; // Increased from 150 to 200 for 5x5
  const tailTaper = totalReels > 9
    ? 0.45 + 0.55 * (1 - reelIndex / Math.max(totalReels - 1, 1)) // later rows finish quicker on big grids
    : 1;
  const totalDuration = BASE_DURATION + reelIndex * STAGGER * tailTaper;
  const targetOffset = (SYMBOLS_IN_STRIP - 1) * ITEM_HEIGHT;

  useEffect(() => {
    setColorLoaded(false);
    if (isMultiplierSymbol) {
      // Multipliers get orange/fire color
      setBorderColor("rgba(255, 140, 0, 0.9)");
      setColorLoaded(true);
    } else if (colorSource.imageUrl && !isFreeSpinLike) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const color = extractDominantColor(img);
        setBorderColor(color);
        setColorLoaded(true);
      };
      img.onerror = () => {
        setBorderColor("rgba(61, 67, 99, 0.5)");
        setColorLoaded(true);
      };
      img.src = buildProxyUrl(colorSource.imageUrl);
    } else if (isFreeSpinLike) {
      setBorderColor("rgba(50, 205, 50, 0.8)");
      setColorLoaded(true);
    } else {
      setBorderColor("rgba(61, 67, 99, 0.5)");
      setColorLoaded(true);
    }
  }, [colorSource.imageUrl, isFreeSpinSymbol, isMultiplierSymbol]);

  // Сохраняем предыдущее значение isSpinning для отслеживания перехода
  const wasSpinningRef = useRef(false);
  const prevSpinIdRef = useRef(spinId);
  
  // Сохраняем финальный символ для использования в конце анимации
  const finalSymbolRef = useRef(finalSymbol);
  useEffect(() => {
    finalSymbolRef.current = finalSymbol;
  }, [finalSymbol]);

  // Запускаем анимацию ТОЛЬКО при переходе isSpinning: false -> true
  useEffect(() => {
    const wasSpinning = wasSpinningRef.current;
    const spinChanged = spinId !== prevSpinIdRef.current;
    wasSpinningRef.current = isSpinning;
    prevSpinIdRef.current = spinId;
    
    if (isSpinning && (!wasSpinning || spinChanged)) {
      // Принудительно останавливаем предыдущую анимацию
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Сбрасываем состояние и запускаем новую анимацию
      // Используем текущий отображаемый символ для начальной полосы
      const newStrip = generateStrip(pool, displaySymbol, finalSymbolRef.current);
      setStrip(newStrip);
      setTranslateY(0);
      setPhase("spinning");
      setColorLoaded(false);
    }
  }, [isSpinning, pool, spinId, displaySymbol]);

  // Обновляем финальный символ в strip когда он меняется (результат API пришёл)
  useEffect(() => {
    if (phase === "spinning" || phase === "settled") {
      // Обновляем последний элемент strip на новый финальный символ
      setStrip(prev => {
        const newStrip = [...prev];
        newStrip[newStrip.length - 1] = finalSymbol;
        return newStrip;
      });
    }
  }, [finalSymbol, phase]);

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
    if (!isSpinning && phase === "settled" && colorLoaded) {
      const timeout = setTimeout(() => {
        setPhase("idle");
        // Сообщаем родителю что эта ячейка полностью готова
        onReelReady?.(reelIndex);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isSpinning, phase, colorLoaded, reelIndex, onReelReady]);

  // Когда не крутимся, держим полосу на отображаемом символе
  useEffect(() => {
    if (!isSpinning && phase === "idle") {
      setStrip(generateStrip(pool, displaySymbol, displaySymbol));
      setTranslateY(0);
    }
  }, [displaySymbol, pool, isSpinning, phase]);

  const isSettled = phase === "settled" || (phase === "idle" && !isSpinning);
  const showHighlight = highlight && isSettled;
  const showFreeSpinGlow = isFreeSpinLike && isSettled;
  const showMultiplierGlow = isMultiplierSymbol && isSettled;

  const reelStyle: React.CSSProperties = {
    borderColor: showMultiplierGlow
      ? "rgba(255, 140, 0, 0.9)"
      : showFreeSpinGlow 
        ? "rgba(50, 205, 50, 0.9)" 
        : isSettled 
          ? borderColor 
          : "rgba(61, 67, 99, 0.3)",
    boxShadow: showMultiplierGlow
      ? "0 0 35px rgba(255, 140, 0, 0.7), 0 0 70px rgba(255, 100, 0, 0.4), inset 0 0 25px rgba(255, 140, 0, 0.3)"
      : showFreeSpinGlow
        ? "0 0 30px rgba(50, 205, 50, 0.6), 0 0 60px rgba(50, 205, 50, 0.3), inset 0 0 20px rgba(50, 205, 50, 0.2)"
        : showHighlight
          ? `0 0 25px ${borderColor}, 0 0 50px ${borderColor.replace("0.7", "0.3")}`
          : phase === "spinning"
            ? "0 0 15px rgba(100, 100, 255, 0.3)"
            : "none"
  };

  return (
    <div
      className={`slot-reel ${phase === "spinning" ? "spinning" : ""} ${showHighlight ? "winner" : ""} ${showMultiplierGlow ? "multiplier-cell" : ""} ${showFreeSpinGlow ? "free-spin-cell" : ""} ${inFreeSpinMode ? "free-mode" : ""}`}
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
  displaySymbols, 
  nextSymbols,
  isSpinning, 
  spinId,
  highlightWin,
  winningLines,
  mode = "expanded",
  freeSpinState,
  freeSpinPositions = [],
  stickyWildPositions = [],
  reSpinColumns = [],
  onAllSettled
}) => {
  const cellCount = mode === "expanded" ? EXPANDED_CELLS : MODE5_CELLS;
  const stickyWildSet = useMemo(() => new Set(stickyWildPositions), [stickyWildPositions]);
  
  // Определяем какие индексы выиграли
  const winningIndices = new Set<number>();
  if (highlightWin && winningLines && winningLines.length > 0) {
    winningLines.forEach(line => line.forEach(idx => winningIndices.add(idx)));
  }
  const prevSpinningRef = useRef<boolean>(false);
  const settledTimeoutRef = useRef<number | null>(null);
  const onAllSettledRef = useRef(onAllSettled);
  const [readyReels, setReadyReels] = useState<Set<number>>(new Set());
  const allSettledCalledRef = useRef<boolean>(false);
  
  // Обновляем ref при изменении callback
  useEffect(() => {
    onAllSettledRef.current = onAllSettled;
  }, [onAllSettled]);
  
  // Callback когда одна ячейка готова
  const handleReelReady = useCallback((index: number) => {
    setReadyReels(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  }, []);
  
  // Проверяем когда ВСЕ ячейки готовы
  useEffect(() => {
    if (readyReels.size === cellCount && !isSpinning && !allSettledCalledRef.current) {
      allSettledCalledRef.current = true;
      onAllSettledRef.current?.();
    }
  }, [readyReels.size, cellCount, isSpinning]);
  
  const reelSymbols = displaySymbols && displaySymbols.length === cellCount
    ? displaySymbols
    : Array.from({ length: cellCount }, (_, i) => pool[i % pool.length] || fallbackSymbol(i));



  // Вычисляем когда последний барабан остановится
  useEffect(() => {
    const wasSpinning = prevSpinningRef.current;
    prevSpinningRef.current = isSpinning;
    
    if (isSpinning && !wasSpinning) {
      // Сбрасываем трекинг готовности при новом спине
      setReadyReels(new Set());
      allSettledCalledRef.current = false;
      
      // Очищаем предыдущий таймаут (fallback)
      if (settledTimeoutRef.current) {
        clearTimeout(settledTimeoutRef.current);
        settledTimeoutRef.current = null;
      }
      
      // Fallback таймер на случай если что-то пошло не так
      const BASE_DURATION = 2000;
      const STAGGER = cellCount > 3 ? 200 : 400;
      const lastIndex = cellCount - 1;
      const tailTaper = cellCount > 9
        ? 0.45 + 0.55 * (1 - lastIndex / Math.max(lastIndex, 1))
        : 1;
      const lastReelDuration = BASE_DURATION + lastIndex * STAGGER * tailTaper;
      const fallbackWait = lastReelDuration + 3000; // +3 секунды fallback
      
      settledTimeoutRef.current = window.setTimeout(() => {
        settledTimeoutRef.current = null;
        if (!allSettledCalledRef.current) {
          allSettledCalledRef.current = true;
          onAllSettledRef.current?.();
        }
      }, fallbackWait);
    }
  }, [isSpinning, cellCount]);

  // Показываем баннер если есть FREE символы (не триггер free spins)
  const showReSpinBanner = freeSpinPositions.length > 0 && freeSpinPositions.length < 3 && !freeSpinState?.active;

  const modeClass = mode === "expanded" ? "expanded" : mode === "mode5" ? "mode5" : "";
  const stageClass = `nft-reel-stage ${modeClass} ${freeSpinState?.active ? "free-spin-active" : ""}`;

  return (
    <div className={stageClass}>
      {freeSpinState?.active && (
        <div className="free-spin-banner">
          <span className="free-spin-icon">🎰</span>
          FREE SPINS: {freeSpinState.remaining} / {freeSpinState.total}
          <span className="free-spin-icon">🎰</span>
        </div>
      )}
      
      {showReSpinBanner && (
        <div className="respin-banner">
          <span className="respin-icon">🎁</span>
          FREE WILDCARD!
          <span className="respin-icon">🎁</span>
        </div>
      )}
      
      {Array.from({ length: cellCount }).map((_, index) => {
        const displaySymbol = reelSymbols[index] || fallbackSymbol(index);
        const finalSymbol = nextSymbols?.[index] || displaySymbol;
        const isStickyWild = stickyWildSet.has(index);
        const isFreeSpinSymbol = isStickyWild
          || freeSpinPositions.includes(index)
          || finalSymbol?.imageUrl === "/free.jpg"
          || displaySymbol?.imageUrl === "/free.jpg";
        const isWinningSymbol = winningIndices.has(index);
        
        return (
          <Reel
            key={`${spinId}-${index}`}
            pool={pool}
            displaySymbol={displaySymbol}
            finalSymbol={finalSymbol}
            isSpinning={isSpinning}
            spinId={spinId}
            highlight={isWinningSymbol}
            reelIndex={index}
            totalReels={cellCount}
            isFreeSpinSymbol={isFreeSpinSymbol}
            inFreeSpinMode={freeSpinState?.active}
            onReelReady={handleReelReady}
          />
        );
      })}
    </div>
  );
};

export default NftReelStage;
