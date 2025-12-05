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
  appliedMultiplier?: {
    value: number;
    rarity: string;
  };
  winBreakdown?: Record<string, number>;
  mode?: SlotMode;
  stickyWildPositions?: number[] | null;
  newStickyWildPositions?: number[] | null;
  freeSpinsAwarded?: number;
}

const SLOT_SESSION_VERSION = 1;
const SLOT_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

interface PersistedSlotSession {
  version: number;
  timestamp: number;
  mode: SlotMode;
  freeSpins: FreeSpinState;
  stickyWildPositions: number[];
  displaySymbols?: {
    expanded?: NftSymbolSummary[];
    mode5?: NftSymbolSummary[];
  };
}

const getSessionKey = (gameId: string) => `slot-session:${gameId}`;

const loadSlotSession = (gameId: string): PersistedSlotSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getSessionKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSlotSession;
    if (parsed.version !== SLOT_SESSION_VERSION) return null;
    if (Date.now() - parsed.timestamp > SLOT_SESSION_TTL_MS) {
      window.localStorage.removeItem(getSessionKey(gameId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveSlotSession = (gameId: string, payload: PersistedSlotSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getSessionKey(gameId), JSON.stringify(payload));
};

const clearSlotSession = (gameId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getSessionKey(gameId));
};

// TON icon SVG
const TonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 4, verticalAlign: "middle" }}>
    <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0098EA"/>
    <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L26.2644 42.9409C27.0345 44.2765 28.9644 44.2765 29.7345 42.9409L41.5765 22.4861C43.3045 19.4202 41.0761 15.6277 37.5765 15.6277H37.5603ZM26.2053 36.5765L23.6049 31.6938L17.4189 21.4036C16.9405 20.5765 17.5356 19.5765 18.4386 19.5765H26.1891V36.5765H26.2053ZM38.5765 21.4036L32.3905 31.6938L29.7901 36.5765V19.5765H37.5765C38.4796 19.5765 39.0746 20.5765 38.5603 21.4036H38.5765Z" fill="white"/>
  </svg>
);

const formatNumber = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

const INITIAL_FREE_SPIN_STATE: FreeSpinState = { active: false, remaining: 0, total: 0 };

const GameModal: React.FC<Props> = ({ game, result, isPlaying, onClose, onPlay, userBalance = 0 }) => {
  const [mode, setMode] = useState<SlotMode>("expanded");
  const [freeSpins, setFreeSpins] = useState<FreeSpinState>(INITIAL_FREE_SPIN_STATE);
  const [freeSpinPositions, setFreeSpinPositions] = useState<number[]>([]);
  const [stickyWildPositionsState, setStickyWildPositionsState] = useState<number[]>([]);
  const [autoPlayFree, setAutoPlayFree] = useState(false);
  const [spinId, setSpinId] = useState(0);
  const sessionGameIdRef = useRef<string | null>(null);
  const prevFreeSpinActiveRef = useRef(freeSpins.active);
  
  // Независимые состояния для каждого режима
  const [expandedState, setExpandedState] = useState<{
    isSpinning: boolean;
    displaySymbols: NftSymbolSummary[] | null;
    nextSymbols: NftSymbolSummary[] | null;
    settled: boolean;
    result: ApiGameResult | null;
  }>({ isSpinning: false, displaySymbols: null, nextSymbols: null, settled: true, result: null });
  
  const [mode5State, setMode5State] = useState<{
    isSpinning: boolean;
    displaySymbols: NftSymbolSummary[] | null;
    nextSymbols: NftSymbolSummary[] | null;
    settled: boolean;
    result: ApiGameResult | null;
  }>({ isSpinning: false, displaySymbols: null, nextSymbols: null, settled: true, result: null });
  
  const spinTimeoutExpandedRef = useRef<number | null>(null);
  const spinTimeoutMode5Ref = useRef<number | null>(null);

  const metadata = game?.metadata;

  useEffect(() => {
    if (!game) {
      sessionGameIdRef.current = null;
      setFreeSpins(INITIAL_FREE_SPIN_STATE);
      setAutoPlayFree(false);
      setStickyWildPositionsState([]);
      return;
    }

    if (sessionGameIdRef.current === game.id) {
      return;
    }

    sessionGameIdRef.current = game.id;
    const savedSession = loadSlotSession(game.id);
    if (!savedSession) {
      return;
    }

    const hasActiveFreeSpins = savedSession.freeSpins?.active && savedSession.freeSpins.remaining > 0;
    if (!hasActiveFreeSpins) {
      clearSlotSession(game.id);
      return;
    }

    setMode(savedSession.mode);
    setFreeSpins(savedSession.freeSpins);
    setAutoPlayFree(true);
    setStickyWildPositionsState(savedSession.stickyWildPositions ?? []);
    if (savedSession.displaySymbols?.expanded?.length) {
      setExpandedState(prev => ({ ...prev, displaySymbols: savedSession.displaySymbols?.expanded ?? prev.displaySymbols }));
    }
    if (savedSession.displaySymbols?.mode5?.length) {
      setMode5State(prev => ({ ...prev, displaySymbols: savedSession.displaySymbols?.mode5 ?? prev.displaySymbols }));
    }
  }, [game]);
  
  // Динамическая цена спина: 3% (3x3) или 5% (5x5) от средней стоимости NFT
  const spinPrice = useMemo(() => {
    const avg = metadata?.priceStats?.average ?? 0;
    const percentage = mode === "mode5" ? 0.05 : 0.03;
    return avg * percentage;
  }, [metadata?.priceStats?.average, mode]);

  // Отбираем 10 карт: 8 дешёвых + 2 дорогих
  // Бэкенд уже отправляет selectedPool (8 дешевых + 2 дорогих), используем как есть
  const selectedPool = useMemo(() => {
    return metadata?.symbols ?? [];
  }, [metadata?.symbols]);

  // Инициализация отображаемых символов при загрузке пула
  useEffect(() => {
    if (selectedPool.length > 0) {
      setExpandedState(prev => prev.displaySymbols ? prev : { ...prev, displaySymbols: selectedPool.slice(0, 9) });
      setMode5State(prev => prev.displaySymbols ? prev : { ...prev, displaySymbols: selectedPool.slice(0, 25) });
    }
  }, [selectedPool]);

  const persistSlotSession = useCallback((overrideFreeSpins?: FreeSpinState, overrideStickyWilds?: number[]) => {
    if (!game) return;
    const snapshotFreeSpins = overrideFreeSpins ?? freeSpins;
    if (!snapshotFreeSpins.active || snapshotFreeSpins.remaining <= 0) {
      clearSlotSession(game.id);
      return;
    }
    const snapshotStickyWilds = overrideStickyWilds ?? stickyWildPositionsState;
    saveSlotSession(game.id, {
      version: SLOT_SESSION_VERSION,
      timestamp: Date.now(),
      mode,
      freeSpins: snapshotFreeSpins,
      stickyWildPositions: snapshotStickyWilds,
      displaySymbols: {
        expanded: expandedState.displaySymbols ?? undefined,
        mode5: mode5State.displaySymbols ?? undefined
      }
    });
  }, [game, freeSpins, stickyWildPositionsState, mode, expandedState.displaySymbols, mode5State.displaySymbols]);

  useEffect(() => {
    if (!game) return;
    if (!freeSpins.active || freeSpins.remaining <= 0) return;
    persistSlotSession();
  }, [game, freeSpins, stickyWildPositionsState, persistSlotSession]);

  // Обновляем состояние нужного режима когда приходит результат
  useEffect(() => {
    const nftData = (result?.gameData ?? null) as NftGameResultData | null;
    if (result && nftData?.symbols) {
      const resultMode = nftData?.mode || mode;
      const symbols = nftData.symbols;
      
      if (resultMode === "expanded") {
        setExpandedState(prev => ({ ...prev, nextSymbols: symbols.slice(0, 9), result }));
      } else if (resultMode === "mode5") {
        setMode5State(prev => ({ ...prev, nextSymbols: symbols.slice(0, 25), result }));
      }
    }
  }, [result, mode]);
  
  // Таймеры для завершения анимации каждого режима
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
  
  useEffect(() => {
    if (mode5State.isSpinning && !isPlaying) {
      const BASE_DURATION = 2000;
      const STAGGER = 100;
      const totalWait = BASE_DURATION + 24 * STAGGER + 500;
      
      spinTimeoutMode5Ref.current = window.setTimeout(() => {
        setMode5State(prev => ({ ...prev, isSpinning: false, settled: true }));
      }, totalWait);
      
      return () => {
        if (spinTimeoutMode5Ref.current) clearTimeout(spinTimeoutMode5Ref.current);
      };
    }
  }, [mode5State.isSpinning, isPlaying]);

  // Текущее состояние для активного режима
  const currentState = mode === "expanded" ? expandedState : mode5State;
  const setCurrentState = mode === "expanded" ? setExpandedState : setMode5State;
  
  // Cast gameData to proper type
  const nftData = currentState.result?.gameData as NftGameResultData | undefined;
  const matched = Boolean(nftData?.matched);
  const nearMiss = Boolean(nftData?.nearMiss);
  const nearMissRefund = nftData?.nearMissRefund ?? 0;
  const nearMissCount = nftData?.nearMissCount ?? 0;
  const nearMissSymbolUrl = nftData?.nearMissSymbolUrl;
  const nearMissSymbolName = nftData?.nearMissSymbolName;
  const shouldTriggerReSpin = Boolean(nftData?.shouldTriggerReSpin);
  const reSpinColumns = nftData?.reSpinColumns;
  const twoMatch = Boolean(nftData?.twoMatch);
  const twoMatchSymbolUrl = nftData?.twoMatchSymbolUrl;
  const twoMatchSymbolName = nftData?.twoMatchSymbolName;
  const lastMultiplier = typeof nftData?.multiplier === "number" ? nftData.multiplier : null;
  const winningLines = nftData?.winningLines;
  const matchedSymbol = nftData?.matchedSymbol;
  const matchedSymbols = nftData?.matchedSymbols;

  useEffect(() => {
    const stickyPositions = nftData?.stickyWildPositions;
    if (Array.isArray(stickyPositions)) {
      setStickyWildPositionsState(stickyPositions);
      return;
    }
    const newSticky = nftData?.newStickyWildPositions;
    if (Array.isArray(newSticky) && newSticky.length > 0) {
      setStickyWildPositionsState(prev => {
        const merged = new Set(prev);
        newSticky.forEach(idx => merged.add(idx));
        return Array.from(merged).sort((a, b) => a - b);
      });
    }
  }, [nftData?.stickyWildPositions, nftData?.newStickyWildPositions]);

  // Обработка фри-спинов
  useEffect(() => {
    if (!nftData?.freeSpinsTriggered) return;
    const award = Math.max(1, nftData.freeSpinsAwarded ?? 10);
    setFreeSpinPositions(nftData.freeSpinPositions ?? []);
    setAutoPlayFree(true);
    if (!freeSpins.active) {
      setFreeSpins({ active: true, remaining: award, total: award });
    } else {
      setFreeSpins(prev => ({
        ...prev,
        remaining: prev.remaining + award,
        total: prev.total + award
      }));
    }
  }, [freeSpins.active, nftData?.freeSpinsTriggered, nftData?.freeSpinsAwarded, nftData?.freeSpinPositions]);

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

  useEffect(() => {
    if (!game) return;
    const wasActive = prevFreeSpinActiveRef.current;
    if (wasActive && !freeSpins.active) {
      clearSlotSession(game.id);
      setStickyWildPositionsState([]);
    }
    prevFreeSpinActiveRef.current = freeSpins.active;
  }, [freeSpins.active, game]);

  // Автоматический фри-спин - ждём пока барабаны остановятся
  useEffect(() => {
    if (autoPlayFree && freeSpins.active && freeSpins.remaining > 0 && !isPlaying && currentState.settled) {
      const timer = setTimeout(() => {
        // СНАЧАЛА запускаем анимацию
        setSpinId(prev => prev + 1);
        setCurrentState(prev => ({ ...prev, settled: false, isSpinning: true }));
        // ПОТОМ вызываем API
        void onPlay(0, { mode, freeSpinMode: true, stickyWildPositions: stickyWildPositionsState });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoPlayFree, freeSpins, isPlaying, mode, onPlay, currentState.settled, stickyWildPositionsState]);

  // Автоматический ре-спин колонок с FREE wildcard
  useEffect(() => {
    if (shouldTriggerReSpin && reSpinColumns && reSpinColumns.length > 0 && currentState.settled && !isPlaying) {
      // Ждем 1.5 секунды чтобы пользователь увидел FREE символы
      const timer = setTimeout(() => {
        const betAmount = freeSpins.active ? 0 : spinPrice;
        // СНАЧАЛА запускаем анимацию
        setSpinId(prev => prev + 1);
        setCurrentState(prev => ({ ...prev, isSpinning: true, settled: false }));
        // ПОТОМ вызываем API
        void onPlay(betAmount, { mode, freeSpinMode: freeSpins.active, stickyWildPositions: stickyWildPositionsState });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldTriggerReSpin, reSpinColumns, currentState.settled, isPlaying, freeSpins.active, spinPrice, mode, onPlay, stickyWildPositionsState]);

  if (!game) {
    return null;
  }

  // Блокируем если: играем в текущем режиме, барабаны ещё не остановились, или недостаточно баланса
  const disabled = isPlaying || !currentState.settled || spinPrice > userBalance;

  const handlePlay = () => {
    if (disabled && !freeSpins.active) return;
    
    const betAmount = freeSpins.active ? 0 : spinPrice;
    
    // СНАЧАЛА запускаем анимацию, ПОТОМ вызываем API
    setSpinId(prev => prev + 1);
    setCurrentState(prev => ({ ...prev, isSpinning: true, settled: false }));
    
    // Вызываем API (результат придёт позже и обновит symbols)
    void onPlay(betAmount, { mode, freeSpinMode: freeSpins.active, stickyWildPositions: stickyWildPositionsState });
  };

  const handleAllSettled = useCallback((settledMode: SlotMode) => {
    if (settledMode === "expanded") {
      setExpandedState(prev => ({
        ...prev,
        displaySymbols: prev.nextSymbols ?? prev.displaySymbols,
        nextSymbols: null,
        settled: true,
        isSpinning: false
      }));
    } else if (settledMode === "mode5") {
      setMode5State(prev => ({
        ...prev,
        displaySymbols: prev.nextSymbols ?? prev.displaySymbols,
        nextSymbols: null,
        settled: true,
        isSpinning: false
      }));
    }
  }, []);

  const toggleMode = () => {
    setMode(prev => prev === "expanded" ? "mode5" : "expanded");
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
            className={`mode-btn ${mode === "expanded" ? "active" : ""} ${expandedState.isSpinning ? "spinning" : ""}`}
            onClick={() => setMode("expanded")}
            disabled={freeSpins.active}
          >
            Mega 3×3
          </button>
          <button 
            className={`mode-btn ${mode === "mode5" ? "active" : ""} ${mode5State.isSpinning ? "spinning" : ""}`}
            onClick={() => setMode("mode5")}
            disabled={freeSpins.active}
          >
            Ultra 5×5
          </button>
        </div>

        {/* Expanded Mode - скрыт когда не активен */}
        <div style={{ display: mode === "expanded" ? "block" : "none" }}>
          <NftReelStage
            pool={selectedPool}
            displaySymbols={expandedState.displaySymbols}
            nextSymbols={expandedState.nextSymbols}
            isSpinning={expandedState.isSpinning}
            spinId={spinId}
            highlightWin={Boolean((expandedState.result?.gameData as any)?.matched)}
            winningLines={mode === "expanded" ? winningLines : undefined}
            mode="expanded"
            freeSpinState={freeSpins}
            freeSpinPositions={freeSpinPositions}
            stickyWildPositions={stickyWildPositionsState}
            reSpinColumns={mode === "expanded" ? reSpinColumns : undefined}
            onAllSettled={() => handleAllSettled("expanded")}
          />
        </div>
        
        {/* Mode5 (5x5) - скрыт когда не активен */}
        <div style={{ display: mode === "mode5" ? "block" : "none" }}>
          <NftReelStage
            pool={selectedPool}
            displaySymbols={mode5State.displaySymbols}
            nextSymbols={mode5State.nextSymbols}
            isSpinning={mode5State.isSpinning}
            spinId={spinId}
            highlightWin={Boolean((mode5State.result?.gameData as any)?.matched)}
            winningLines={mode === "mode5" ? winningLines : undefined}
            mode="mode5"
            freeSpinState={freeSpins}
            freeSpinPositions={freeSpinPositions}
            stickyWildPositions={stickyWildPositionsState}
            reSpinColumns={mode === "mode5" ? reSpinColumns : undefined}
            onAllSettled={() => handleAllSettled("mode5")}
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
                    <p className="win-message">🎉🎉 MULTI WIN! {winningLines?.length ?? matchedSymbols.length} lines! 🎉🎉</p>
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
              {nftData?.appliedMultiplier && (
                <span className="multiplier-symbol" style={{ 
                  background: nftData.appliedMultiplier.rarity === 'epic' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : nftData.appliedMultiplier.rarity === 'rare'
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '1.1em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  🎰 x{nftData.appliedMultiplier.value}
                </span>
              )}
            </div>
          )}
          
          {/* Win Breakdown */}
          {nftData?.winBreakdown && (
            <div className="win-breakdown" style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '0.9em', color: '#aaa', marginBottom: '8px' }}>💰 Win Details:</div>
              {Object.entries(nftData.winBreakdown).map(([type, amount]) => (
                <div key={type} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontSize: '0.85em',
                  color: '#fff'
                }}>
                  <span>{type}:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    <TonIcon />{formatNumber(amount)}
                  </span>
                </div>
              ))}
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
