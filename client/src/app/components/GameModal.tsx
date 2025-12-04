import React, { useEffect, useMemo, useState, useCallback } from "react";
import type { ApiGameResult, NftSymbolSummary } from "../../types/api";
import type { GameContext } from "../types";
import NftReelStage, { type SlotMode, type FreeSpinState } from "./NftReelStage";

interface Props {
  game: GameContext | null;
  result: ApiGameResult | null;
  isPlaying: boolean;
  onClose: () => void;
  onPlay: (betAmount: number, gameData?: Record<string, unknown>) => Promise<void>;
  userBalance?: number;
}

interface NftGameResultData {
  symbols?: NftSymbolSummary[];
  matched?: boolean;
  multiplier?: number;
  chance?: number;
  collectionName?: string;
  priceStats?: {
    min?: number;
    max?: number;
    median?: number;
    average?: number;
  };
  freeSpinsTriggered?: boolean;
  freeSpinPositions?: number[];
}

// TON icon SVG
const TonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 4, verticalAlign: "middle" }}>
    <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0098EA"/>
    <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L26.2644 42.9409C27.0345 44.2765 28.9644 44.2765 29.7345 42.9409L41.5765 22.4861C43.3045 19.4202 41.0761 15.6277 37.5765 15.6277H37.5603ZM26.2053 36.5765L23.6049 31.6938L17.4189 21.4036C16.9405 20.5765 17.5356 19.5765 18.4386 19.5765H26.1891V36.5765H26.2053ZM38.5765 21.4036L32.3905 31.6938L29.7901 36.5765V19.5765H37.5765C38.4796 19.5765 39.0746 20.5765 38.5603 21.4036H38.5765Z" fill="white"/>
  </svg>
);

const formatNumber = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

const GameModal: React.FC<Props> = ({ game, result, isPlaying, onClose, onPlay, userBalance = 0 }) => {
  const [mode, setMode] = useState<SlotMode>("classic");
  const [freeSpins, setFreeSpins] = useState<FreeSpinState>({ active: false, remaining: 0, total: 0 });
  const [freeSpinPositions, setFreeSpinPositions] = useState<number[]>([]);
  const [autoPlayFree, setAutoPlayFree] = useState(false);

  const metadata = game?.metadata;
  
  // Статичная цена спина - 3% от средней стоимости NFT
  const spinPrice = useMemo(() => {
    const avg = metadata?.priceStats?.average ?? 0;
    return avg * 0.03;
  }, [metadata?.priceStats?.average]);

  // Отбираем 10 карт: 8 дешёвых + 2 дорогих
  const selectedPool = useMemo(() => {
    const symbols = metadata?.symbols ?? [];
    if (symbols.length <= 10) return symbols;
    
    // Сортируем по цене
    const sorted = [...symbols].sort((a, b) => a.priceValue - b.priceValue);
    
    // 8 дешёвых (первые) + 2 дорогих (последние)
    const cheap = sorted.slice(0, 8);
    const expensive = sorted.slice(-2);
    
    return [...cheap, ...expensive];
  }, [metadata?.symbols]);

  const nftData = (result?.gameData ?? null) as NftGameResultData | null;
  
  const cellCount = mode === "expanded" ? 9 : 3;
  const spinSymbols = useMemo(() => {
    if (!nftData?.symbols || !Array.isArray(nftData.symbols)) {
      return null;
    }
    return nftData.symbols.slice(0, cellCount);
  }, [nftData, cellCount]);

  const matched = Boolean(nftData?.matched);
  const lastMultiplier = typeof nftData?.multiplier === "number" ? nftData.multiplier : null;

  // Обработка фри-спинов
  useEffect(() => {
    if (nftData?.freeSpinsTriggered && !freeSpins.active) {
      setFreeSpins({ active: true, remaining: 10, total: 10 });
      setFreeSpinPositions(nftData.freeSpinPositions ?? []);
      setAutoPlayFree(true);
    } else if (freeSpins.active && nftData?.freeSpinsTriggered) {
      // Дополнительные фри-спины во время фри-спинов
      setFreeSpins(prev => ({
        ...prev,
        remaining: prev.remaining + 3,
        total: prev.total + 3
      }));
      setFreeSpinPositions(nftData.freeSpinPositions ?? []);
    }
  }, [nftData?.freeSpinsTriggered]);

  // Уменьшаем счётчик фри-спинов после каждого спина
  useEffect(() => {
    if (freeSpins.active && !isPlaying && result && freeSpins.remaining > 0) {
      const newRemaining = freeSpins.remaining - 1;
      if (newRemaining <= 0) {
        setFreeSpins({ active: false, remaining: 0, total: 0 });
        setAutoPlayFree(false);
      } else {
        setFreeSpins(prev => ({ ...prev, remaining: newRemaining }));
      }
    }
  }, [result, isPlaying]);

  // Автоматический фри-спин
  useEffect(() => {
    if (autoPlayFree && freeSpins.active && freeSpins.remaining > 0 && !isPlaying) {
      const timer = setTimeout(() => {
        void onPlay(0, { mode, freeSpinMode: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoPlayFree, freeSpins, isPlaying, mode, onPlay]);

  if (!game) {
    return null;
  }

  const disabled = isPlaying || spinPrice > userBalance;

  const handlePlay = () => {
    if (disabled && !freeSpins.active) return;
    const betAmount = freeSpins.active ? 0 : spinPrice;
    void onPlay(betAmount, { mode, freeSpinMode: freeSpins.active });
  };

  const toggleMode = () => {
    setMode(prev => prev === "classic" ? "expanded" : "classic");
  };

  return (
    <div className="modal modal-full nft-modal">
      <div className="modal__content nft-modal__content">
        <div className="immersive-bg">
          <div className="ambient-lines" />
          <div className="ambient-pulse" />
          {freeSpins.active && <div className="free-spin-bg-effect" />}
        </div>
        
        <header className="nft-modal__header">
          <div>
            <p className="eyebrow">{metadata?.name ?? "NFT Slot"}</p>
            <h2>{game.name}</h2>
          </div>
          <button className="close-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === "classic" ? "active" : ""}`}
            onClick={() => setMode("classic")}
            disabled={freeSpins.active}
          >
            Classic 3
          </button>
          <button 
            className={`mode-btn ${mode === "expanded" ? "active" : ""}`}
            onClick={() => setMode("expanded")}
            disabled={freeSpins.active}
          >
            Mega 3×3
          </button>
        </div>

        <NftReelStage
          pool={selectedPool}
          activeSymbols={spinSymbols}
          isSpinning={isPlaying}
          highlightWin={matched}
          mode={mode}
          freeSpinState={freeSpins}
          freeSpinPositions={freeSpinPositions}
        />

        {/* Spin Price Display */}
        <div className="spin-price-display">
          <span className="spin-price-label">Spin Cost:</span>
          <span className="spin-price-value">
            <TonIcon />
            {formatNumber(spinPrice)} TON
          </span>
        </div>

        {/* Stats - без rarity надписей */}
        <section className="nft-modal__stats">
          <div>
            <span>Pool Size</span>
            <strong>{selectedPool.length}</strong>
          </div>
          <div>
            <span>Avg Price</span>
            <strong><TonIcon />{formatNumber(metadata?.priceStats?.average ?? 0)}</strong>
          </div>
          <div>
            <span>Max Win</span>
            <strong><TonIcon />{formatNumber(metadata?.priceStats?.max ?? 0)}</strong>
          </div>
        </section>

        <div className="nft-modal__actions">
          <button 
            className={`button button-primary ${freeSpins.active ? "free-spin-btn" : ""}`} 
            type="button" 
            disabled={disabled && !freeSpins.active} 
            onClick={handlePlay}
          >
            {isPlaying ? "Spinning..." : freeSpins.active 
              ? `🎰 Free Spin (${freeSpins.remaining} left)` 
              : <>Spin for <TonIcon />{formatNumber(spinPrice)}</>
            }
          </button>
          <button className="button button-secondary" type="button" onClick={onClose}>
            Back to lobby
          </button>
        </div>

        {/* Result section */}
        <section className={`nft-modal__result ${matched ? "win" : "pending"}`}>
          <div>
            <span className="pill">{result?.resultType ?? "READY"}</span>
            <p>
              {matched 
                ? "🎉 Matched! You won an NFT!" 
                : freeSpins.active 
                  ? "Free spin mode active!" 
                  : "Match 3 identical NFTs to win!"
              }
            </p>
          </div>
          {result && (
            <div className="result-chips">
              <span>Payout: <TonIcon />{formatNumber(result.payout)}</span>
              {lastMultiplier ? <span>x{lastMultiplier.toFixed(2)}</span> : null}
            </div>
          )}
        </section>

        {/* Balance */}
        <div className="balance-display">
          <span>Balance: <TonIcon />{formatNumber(userBalance)}</span>
        </div>
      </div>
    </div>
  );
};

export default GameModal;
