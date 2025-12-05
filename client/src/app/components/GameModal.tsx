import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  nearMiss?: boolean;
  nearMissRefund?: number;
  nearMissSymbolUrl?: string | null;
  nearMissSymbolName?: string | null;
  nearMissCount?: number; // Количество near-miss строк
  twoMatch?: boolean;
  twoMatchSymbolUrl?: string | null;
  twoMatchSymbolName?: string | null;
  priceStats?: {
    min?: number;
    max?: number;
    median?: number;
    average?: number;
  };
  freeSpinsTriggered?: boolean;
  freeSpinPositions?: number[];
  shouldTriggerReSpin?: boolean; // Нужен ли автоматический ре-спин
  reSpinColumns?: number[]; // Колонки для ре-спина (0, 1, 2)
  winningLines?: number[][];
  matchedSymbol?: NftSymbolSummary;
  matchedSymbols?: NftSymbolSummary[]; // Все выигранные NFT
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
  
  // Независимые состояния для каждого режима
  const [classicState, setClassicState] = useState<{
    isSpinning: boolean;
    symbols: NftSymbolSummary[] | null;
    settled: boolean;
    result: ApiGameResult | null;
  }>({ isSpinning: false, symbols: null, settled: true, result: null });
  
  const [expandedState, setExpandedState] = useState<{
    isSpinning: boolean;
    symbols: NftSymbolSummary[] | null;
    settled: boolean;
    result: ApiGameResult | null;
  }>({ isSpinning: false, symbols: null, settled: true, result: null });
  
  const spinTimeoutClassicRef = useRef<number | null>(null);
  const spinTimeoutExpandedRef = useRef<number | null>(null);

  const metadata = game?.metadata;
  
  // Статичная цена спина - 3% от средней стоимости NFT
  const spinPrice = useMemo(() => {
    const avg = metadata?.priceStats?.average ?? 0;
    return avg * 0.03;
  }, [metadata?.priceStats?.average]);

  // Отбираем 10 карт: 8 дешёвых + 2 дорогих
  // Бэкенд уже отправляет selectedPool (8 дешевых + 2 дорогих), используем как есть
  const selectedPool = useMemo(() => {
    return metadata?.symbols ?? [];
  }, [metadata?.symbols]);

  const nftData = (result?.gameData ?? null) as NftGameResultData | null;
  
  // Обновляем состояние нужного режима когда приходит результат
  useEffect(() => {
    if (result && nftData?.symbols) {
      const resultMode = (result.gameData as any)?.mode as SlotMode || mode;
      const symbols = nftData.symbols;
      
      if (resultMode === "classic") {
        setClassicState(prev => ({ ...prev, symbols: symbols.slice(0, 3), result }));
      } else {
        setExpandedState(prev => ({ ...prev, symbols: symbols.slice(0, 9), result }));
      }
    }
  }, [result, nftData?.symbols, mode]);
  
  // Таймеры для завершения анимации каждого режима
  useEffect(() => {
    if (classicState.isSpinning && !isPlaying) {
      const BASE_DURATION = 2000;
      const STAGGER = 400;
      const totalWait = BASE_DURATION + 2 * STAGGER + 500;
      
      spinTimeoutClassicRef.current = window.setTimeout(() => {
        setClassicState(prev => ({ ...prev, isSpinning: false, settled: true }));
      }, totalWait);
      
      return () => {
        if (spinTimeoutClassicRef.current) clearTimeout(spinTimeoutClassicRef.current);
      };
    }
  }, [classicState.isSpinning, isPlaying]);
  
  useEffect(() => {
    if (expandedState.isSpinning && !isPlaying) {
      const BASE_DURATION = 2000;
      const STAGGER = 150;
      const totalWait = BASE_DURATION + 8 * STAGGER + 500;
      
      spinTimeoutExpandedRef.current = window.setTimeout(() => {
        setExpandedState(prev => ({ ...prev, isSpinning: false, settled: true }));
      }, totalWait);
      
      return () => {
        if (spinTimeoutExpandedRef.current) clearTimeout(spinTimeoutExpandedRef.current);
      };
    }
  }, [expandedState.isSpinning, isPlaying]);

  // Текущее состояние для активного режима
  const currentState = mode === "classic" ? classicState : expandedState;
  const setCurrentState = mode === "classic" ? setClassicState : setExpandedState;
  
  const matched = Boolean(currentState.result?.gameData && (currentState.result.gameData as any).matched);
  const nearMiss = Boolean(currentState.result?.gameData && (currentState.result.gameData as any).nearMiss);
  const nearMissRefund = (currentState.result?.gameData as any)?.nearMissRefund ?? 0;
  const nearMissCount = (currentState.result?.gameData as any)?.nearMissCount ?? 0; // Количество near-miss строк
  const nearMissSymbolUrl = (currentState.result?.gameData as any)?.nearMissSymbolUrl as string | null | undefined;
  const nearMissSymbolName = (currentState.result?.gameData as any)?.nearMissSymbolName as string | null | undefined;
  const shouldTriggerReSpin = Boolean((currentState.result?.gameData as any)?.shouldTriggerReSpin);
  const reSpinColumns = (currentState.result?.gameData as any)?.reSpinColumns as number[] | undefined;
  const twoMatch = Boolean((currentState.result?.gameData as any)?.twoMatch);
  const twoMatchSymbolUrl = (currentState.result?.gameData as any)?.twoMatchSymbolUrl as string | null | undefined;
  const twoMatchSymbolName = (currentState.result?.gameData as any)?.twoMatchSymbolName as string | null | undefined;
  const lastMultiplier = typeof (currentState.result?.gameData as any)?.multiplier === "number" 
    ? (currentState.result?.gameData as any).multiplier 
    : null;
  const winningLines = (currentState.result?.gameData as any)?.winningLines as number[][] | undefined;
  const matchedSymbol = (currentState.result?.gameData as any)?.matchedSymbol as NftSymbolSummary | undefined;
  const matchedSymbols = (currentState.result?.gameData as any)?.matchedSymbols as NftSymbolSummary[] | undefined;

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

  // Автоматический фри-спин - ждём пока барабаны остановятся
  useEffect(() => {
    if (autoPlayFree && freeSpins.active && freeSpins.remaining > 0 && !isPlaying && currentState.settled) {
      const timer = setTimeout(() => {
        setCurrentState(prev => ({ ...prev, settled: false, isSpinning: true }));
        void onPlay(0, { mode, freeSpinMode: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoPlayFree, freeSpins, isPlaying, mode, onPlay, currentState.settled]);

  // Автоматический ре-спин колонок с FREE wildcard
  useEffect(() => {
    if (shouldTriggerReSpin && reSpinColumns && reSpinColumns.length > 0 && currentState.settled && !isPlaying) {
      // Ждем 1.5 секунды чтобы пользователь увидел FREE символы
      const timer = setTimeout(() => {
        // Запускаем ре-спин (тот же API вызов, но FREE будет работать как wildcard)
        setCurrentState(prev => ({ ...prev, settled: false }));
        const betAmount = freeSpins.active ? 0 : spinPrice;
        void onPlay(betAmount, { mode, freeSpinMode: freeSpins.active }).then(() => {
          setCurrentState(prev => ({ ...prev, isSpinning: true, settled: false }));
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldTriggerReSpin, reSpinColumns, currentState.settled, isPlaying, freeSpins.active, spinPrice, mode, onPlay]);

  if (!game) {
    return null;
  }

  // Блокируем если: играем в текущем режиме, барабаны ещё не остановились, или недостаточно баланса
  const disabled = isPlaying || !currentState.settled || spinPrice > userBalance;

  const handlePlay = () => {
    if (disabled && !freeSpins.active) return;
    
    const betAmount = freeSpins.active ? 0 : spinPrice;
    
    // Сначала получаем результат от API
    void onPlay(betAmount, { mode, freeSpinMode: freeSpins.active }).then(() => {
      // ПОСЛЕ получения ответа запускаем анимацию
      setCurrentState(prev => ({ ...prev, isSpinning: true, settled: false }));
    });
  };

  const handleAllSettled = useCallback((settledMode: SlotMode) => {
    if (settledMode === "classic") {
      setClassicState(prev => ({ ...prev, settled: true, isSpinning: false }));
    } else {
      setExpandedState(prev => ({ ...prev, settled: true, isSpinning: false }));
    }
  }, []);

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

        {/* Mode Toggle - можно переключаться даже во время спина */}
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === "classic" ? "active" : ""} ${classicState.isSpinning ? "spinning" : ""}`}
            onClick={() => setMode("classic")}
            disabled={freeSpins.active}
          >
            Classic 3
          </button>
          <button 
            className={`mode-btn ${mode === "expanded" ? "active" : ""} ${expandedState.isSpinning ? "spinning" : ""}`}
            onClick={() => setMode("expanded")}
            disabled={freeSpins.active}
          >
            Mega 3×3
          </button>
        </div>

        {/* Classic Mode - скрыт когда не активен */}
        <div style={{ display: mode === "classic" ? "block" : "none" }}>
          <NftReelStage
            pool={selectedPool}
            activeSymbols={classicState.symbols}
            isSpinning={classicState.isSpinning}
            highlightWin={Boolean((classicState.result?.gameData as any)?.matched)}
            winningLines={mode === "classic" ? winningLines : undefined}
            mode="classic"
            freeSpinState={freeSpins}
            freeSpinPositions={freeSpinPositions}
            onAllSettled={() => handleAllSettled("classic")}
          />
        </div>
        
        {/* Expanded Mode - скрыт когда не активен */}
        <div style={{ display: mode === "expanded" ? "block" : "none" }}>
          <NftReelStage
            pool={selectedPool}
            activeSymbols={expandedState.symbols}
            isSpinning={expandedState.isSpinning}
            highlightWin={Boolean((expandedState.result?.gameData as any)?.matched)}
            winningLines={mode === "expanded" ? winningLines : undefined}
            mode="expanded"
            freeSpinState={freeSpins}
            freeSpinPositions={freeSpinPositions}
            reSpinColumns={mode === "expanded" ? reSpinColumns : undefined}
            onAllSettled={() => handleAllSettled("expanded")}
          />
        </div>

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
        <section className={`nft-modal__result ${matched ? "win" : nearMiss ? "near-miss" : "pending"}`}>
          <div>
            <span className="pill">{result?.resultType ?? "READY"}</span>
            {matched && matchedSymbols && matchedSymbols.length > 0 ? (
              <div className="win-nft-container">
                {matchedSymbols.length === 1 ? (
                  // Одна победа
                  <div className="win-nft-display">
                    <img 
                      src={`/api/nft/image?url=${encodeURIComponent(matchedSymbols[0].imageUrl)}`} 
                      alt={matchedSymbols[0].name}
                      className="win-nft-image"
                    />
                    <div className="win-nft-info">
                      <p className="win-message">🎉 You won!</p>
                      <p className="win-nft-name">{matchedSymbols[0].name}</p>
                      <p className="win-nft-price">
                        <TonIcon />
                        {formatNumber(matchedSymbols[0].priceValue)} TON
                      </p>
                    </div>
                  </div>
                ) : (
                  // Несколько побед
                  <div className="multi-win-display">
                    <p className="win-message">🎉🎉 MULTI WIN! {matchedSymbols.length} lines! 🎉🎉</p>
                    <div className="multi-win-grid">
                      {matchedSymbols.map((sym, idx) => (
                        <div key={idx} className="mini-win-card">
                          <img 
                            src={`/api/nft/image?url=${encodeURIComponent(sym.imageUrl)}`} 
                            alt={sym.name}
                            className="mini-win-image"
                          />
                          <div className="mini-win-info">
                            <p className="mini-win-name">{sym.name}</p>
                            <p className="mini-win-price">
                              <TonIcon />
                              {formatNumber(sym.priceValue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="total-win">
                      <span>Total:</span>
                      <span className="total-win-amount">
                        <TonIcon />
                        {formatNumber(matchedSymbols.reduce((sum, s) => sum + s.priceValue, 0))} TON
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>
                {shouldTriggerReSpin
                  ? "🎁 FREE wildcard! Re-spinning columns..."
                  : nearMiss
                    ? nearMissCount > 1 
                      ? `🔥 Multiple near-miss! ${nearMissCount}x 2 in a row - ${Math.round(nearMissRefund * 100) / 100} TON refunded!`
                      : `🔥 So close! 2 in a row - ${Math.round(nearMissRefund * 100) / 100} TON refunded!`
                    : freeSpins.active 
                      ? "Free spin mode active!" 
                      : "Match 3 identical NFTs to win!"
                }
              </p>
            )}
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
