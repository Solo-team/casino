import React, { useEffect, useState } from "react";
import type { ApiGameResult } from "../../types/api";
import type { GameContext } from "../types";

interface Props {
  game: GameContext | null;
  result: ApiGameResult | null;
  isPlaying: boolean;
  onClose: () => void;
  onPlay: (betAmount: number, gameData?: Record<string, unknown>) => Promise<void>;
}

const INTERACTIVE_GAMES = ["neon-trails", "vault-heist"];

const CASCADE_GAMES = ["aether-bonanza"];

const LANE_OPTIONS: Array<{ value: "left" | "center" | "right"; label: string; helper: string }> = [
  { value: "left", label: "Glitch lane", helper: "Tighter turns, safer boosts" },
  { value: "center", label: "Neon lane", helper: "Balanced run, clean exits" },
  { value: "right", label: "Overdrive", helper: "Fastest lane, spicy swings" }
];

const VOLATILITY_OPTIONS: Array<{ value: "steady" | "balanced" | "berserk"; label: string; helper: string }> = [
  { value: "steady", label: "Steady", helper: "Lower risk, smoother ride" },
  { value: "balanced", label: "Balanced", helper: "Mix of safety and spikes" },
  { value: "berserk", label: "Berserk", helper: "High heat, big jackpots" }
];

const AETHER_MODES: Array<{ value: "calm" | "standard" | "fever"; label: string; helper: string }> = [
  { value: "calm", label: "Calm sky", helper: "1-2 tumbles, steadier bombs" },
  { value: "standard", label: "Standard", helper: "Balanced bombs and tumbles" },
  { value: "fever", label: "Fever", helper: "Extra bombs, spicy swings" }
];

const AETHER_SYMBOL_META: Record<string, { label: string; tone: string }> = {
  crown: { label: "Banana", tone: "banana" },
  mask: { label: "Grape", tone: "grape" },
  fruit: { label: "Apple", tone: "apple" },
  gem: { label: "Plum", tone: "plum" },
  idol: { label: "Watermelon", tone: "melon" },
  bolt: { label: "Bomb", tone: "bomb" },
  orb: { label: "Star", tone: "star" },
  scatter: { label: "Lollipop", tone: "scatter" }
};

const REEL_SYMBOLS = ["BAR", "SEVEN", "WILD", "BONUS", "SCAT", "STAR", "CASH"];
const ROYAL_SYMBOLS = ["BAR", "SEVEN", "WILD", "BONUS", "SCAT", "STAR", "CASH"];

const GameModal: React.FC<Props> = ({ game, result, isPlaying, onClose, onPlay }) => {
  const [bet, setBet] = useState<number>(game?.minBet ?? 1);
  const [lane, setLane] = useState<"left" | "center" | "right">("center");
  const [volatility, setVolatility] = useState<"steady" | "balanced" | "berserk">("balanced");
  const [reels, setReels] = useState<string[][]>([]);
  const [cascadeMode, setCascadeMode] = useState<"calm" | "standard" | "fever">("standard");
  const [aetherGrid, setAetherGrid] = useState<string[][]>([]);

  useEffect(() => {
    if (game) {
      setBet(game.minBet);
      setLane("center");
      setVolatility("balanced");
      setCascadeMode("standard");
      setReels(generateReels());
      if (CASCADE_GAMES.includes(game.id)) {
        setAetherGrid(generateAetherGrid());
      } else {
        setAetherGrid([]);
      }
    }
  }, [game]);

  useEffect(() => {
    if (isPlaying) {
      setReels(generateReels());
      if (game && CASCADE_GAMES.includes(game.id)) {
        setAetherGrid(generateAetherGrid());
      }
    }
  }, [game, isPlaying]);

  if (!game) {
    return null;
  }

  const isInteractive = INTERACTIVE_GAMES.includes(game.id);
  const isCascade = CASCADE_GAMES.includes(game.id);
  const cascadeData = isCascade
    ? (result?.gameData as {
        cascades?: Array<Record<string, unknown>>;
        finalMultiplier?: number;
        bonusTriggered?: boolean;
        summary?: string;
      } | null)
    : null;
  const cascades = Array.isArray((cascadeData as { cascades?: unknown[] } | null)?.cascades)
    ? (cascadeData as { cascades: Array<Record<string, unknown>> }).cascades
    : [];
  const latestCascade = cascades[cascades.length - 1] as
    | (Record<string, unknown> & { grid?: string[][]; bombMultipliers?: number[]; scatterCount?: number })
    | undefined;
  const cascadeMultiplier =
    isCascade && typeof (cascadeData as { finalMultiplier?: number } | null)?.finalMultiplier === "number"
      ? (cascadeData as { finalMultiplier: number }).finalMultiplier
      : result && result.betAmount > 0
        ? Number((result.payout / result.betAmount).toFixed(2))
        : 0;
  const payoutMultiplier =
    result && result.betAmount > 0 ? Number((result.payout / result.betAmount).toFixed(2)) : 0;
  const hasJackpot = isCascade
    ? Boolean(latestCascade?.bombMultipliers?.some(multiplier => multiplier >= 15))
    : result &&
      Array.isArray((result.gameData as { segments?: Array<{ event?: string }> } | undefined)?.segments) &&
      Boolean(
        (result.gameData as { segments?: Array<{ event?: string }> }).segments?.some(seg => seg.event === "jackpot")
      );
  const bonusReady = isCascade
    ? Boolean((cascadeData as { bonusTriggered?: boolean } | null)?.bonusTriggered || cascadeMultiplier >= 6)
    : payoutMultiplier >= 5 || Boolean(hasJackpot);
  const bonusFill = isCascade
    ? Math.min(100, Math.max(12, Math.round((cascadeMultiplier || 0.6) * 14)))
    : Math.min(100, Math.max(8, Math.round((payoutMultiplier || 0.8) * 12)));
  const heatLevel = isCascade
    ? Math.min(96, Math.max(24, Math.round((cascadeMultiplier || 0.4) * 10)))
    : volatility === "steady"
      ? 22
      : volatility === "balanced"
        ? 58
        : 88;
  const slotFrameClass = isPlaying ? "slot-frame spinning" : "slot-frame";
  const aetherGridToRender =
    isCascade && latestCascade && Array.isArray((latestCascade as { grid?: unknown }).grid)
      ? ((latestCascade as { grid?: string[][] }).grid ?? [])
      : aetherGrid;
  const cascadeBombTotal = isCascade
    ? (latestCascade?.bombMultipliers ?? []).reduce((sum, value) => sum + value, 0)
    : 0;
  const cascadeScatterCount = isCascade ? (latestCascade?.scatterCount ?? 0) : 0;

  const handlePlay = () => {
    if (bet < game.minBet || bet > game.maxBet) {
      return;
    }
    const gameData = isInteractive
      ? { lane, volatility }
      : isCascade
        ? { mode: cascadeMode }
        : undefined;
    void onPlay(bet, gameData);
  };

  const reelStrip = [...REEL_SYMBOLS, ...REEL_SYMBOLS.slice(0, 4)];
  const generateReels = () =>
    Array.from({ length: 6 }, () =>
      Array.from({ length: 5 }, () => ROYAL_SYMBOLS[Math.floor(Math.random() * ROYAL_SYMBOLS.length)])
    );
  const generateAetherGrid = () => {
    const keys = Object.keys(AETHER_SYMBOL_META);
    return Array.from({ length: 5 }, () =>
      Array.from({ length: 6 }, () => keys[Math.floor(Math.random() * keys.length)])
    );
  };

  const renderInteractiveTrack = (data: Record<string, unknown>) => {
    const segments = (data as { segments?: Array<Record<string, unknown>> }).segments;
    if (!Array.isArray(segments)) return null;
    const summary = (data as { summary?: string }).summary;
    const laneLabel = (data as { laneLabel?: string }).laneLabel ?? (data as { lane?: string }).lane;
    const volatilityLabel = (data as { volatility?: string }).volatility;
    const finalMultiplier = (data as { finalMultiplier?: number }).finalMultiplier;

    return (
      <div className="trail-result">
        <div className="pill-row">
          {laneLabel && <span className="pill">{laneLabel}</span>}
          {volatilityLabel && <span className="pill">{String(volatilityLabel)} mode</span>}
          {typeof finalMultiplier === "number" && (
            <span className="pill pill-accent">{finalMultiplier.toFixed(2)}x</span>
          )}
        </div>
        <div className="segments-grid">
          {segments.map((segment, index) => {
            const totalMultiplier = typeof (segment as { totalMultiplier?: unknown }).totalMultiplier === "number"
              ? (segment as { totalMultiplier: number }).totalMultiplier
              : undefined;
            const deltaMultiplier = typeof (segment as { deltaMultiplier?: unknown }).deltaMultiplier === "number"
              ? (segment as { deltaMultiplier: number }).deltaMultiplier
              : undefined;
            const percentChange = deltaMultiplier !== undefined
              ? `${deltaMultiplier >= 0 ? "+" : ""}${Math.round(deltaMultiplier * 100)}% swing`
              : null;
            const event = (segment as { event?: string }).event ?? "boost";
            const step = (segment as { step?: number }).step ?? index + 1;
            return (
              <div key={`${step}-${event}`} className={`segment-card ${event}`}>
                <div className="segment-meta">
                  <span className="label">Step {step}</span>
                  <strong>{event.charAt(0).toUpperCase() + event.slice(1)}</strong>
                </div>
                {totalMultiplier !== undefined && (
                  <div className="segment-multiplier">{totalMultiplier.toFixed(2)}x total</div>
                )}
                {percentChange && <small className="muted">{percentChange}</small>}
              </div>
            );
          })}
        </div>
        {summary ? <p className="muted">{summary}</p> : null}
      </div>
    );
  };

  const renderCascadeSummary = (data: Record<string, unknown>) => {
    const cascadeSteps = (data as { cascades?: Array<Record<string, unknown>> }).cascades;
    if (!Array.isArray(cascadeSteps)) return null;

    return (
      <div className="cascade-result">
        <div className="cascade-steps">
          {cascadeSteps.map((cascade, index) => {
            const step = (cascade as { step?: number }).step ?? index + 1;
            const payout = typeof (cascade as { payout?: number }).payout === "number"
              ? (cascade as { payout: number }).payout
              : 0;
            const bombMultipliers =
              (cascade as { bombMultipliers?: number[] }).bombMultipliers ?? [];
            const scatterCount = (cascade as { scatterCount?: number }).scatterCount ?? 0;
            const hits = Array.isArray((cascade as { hits?: Array<Record<string, unknown>> }).hits)
              ? (cascade as { hits: Array<Record<string, unknown>> }).hits
              : [];
            const totalMultiplier = typeof (cascade as { multiplierTotal?: number }).multiplierTotal === "number"
              ? (cascade as { multiplierTotal: number }).multiplierTotal
              : null;

            return (
              <div key={`${step}-${payout}`} className="cascade-card">
                <div className="segment-meta">
                  <span className="label">Tumble {step}</span>
                  <strong>{payout > 0 ? `+${payout.toFixed(2)}` : "Dead spin"}</strong>
                </div>
                <div className="pill-row">
                  {totalMultiplier ? <span className="pill">x{totalMultiplier.toFixed(2)}</span> : <span className="pill ghost">x1</span>}
                  <span className={`pill ${bombMultipliers.length ? "pill-accent" : ""}`}>
                    {bombMultipliers.length
                      ? `Bombs x${bombMultipliers.reduce((sum, value) => sum + value, 0)}`
                      : "No bombs"}
                  </span>
                  <span className="pill">{scatterCount} lanterns</span>
                </div>
                {hits.length ? (
                  <ul className="cascade-hits">
                    {hits.map((hit, hitIndex) => {
                      const symbol = (hit as { symbol?: string }).symbol ?? `hit-${hitIndex}`;
                      const meta = AETHER_SYMBOL_META[symbol] ?? { label: symbol, tone: "rose" };
                      const count = (hit as { count?: number }).count ?? 0;
                      const win = typeof (hit as { win?: number }).win === "number"
                        ? (hit as { win: number }).win
                        : 0;
                      return (
                        <li key={`${symbol}-${hitIndex}`}>
                          <span className={`dot ${meta.tone}`} />
                          {meta.label} x{count} {"->"} {win.toFixed(2)}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted">No clusters connected.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResultSummary = () => {
    if (!result) {
      return <div className="slot-placeholder">Ready to make your move?</div>;
    }
    const data = result.gameData ?? {};
    const hasCascades = Array.isArray((data as { cascades?: unknown[] }).cascades);
    const isSlotsLike = hasCascades || Array.isArray((data as { segments?: unknown[] }).segments);
    const computedMultiplier =
      typeof (data as { finalMultiplier?: number }).finalMultiplier === "number"
        ? (data as { finalMultiplier: number }).finalMultiplier
        : result.payout > 0
          ? result.payout / result.betAmount
          : 0;

    return (
      <div className="result-panel">
        <div className="result-meta">
          <span className={`pill ${result.resultType.toLowerCase()}`}>{result.resultType}</span>
          <span className="pill">Bet {result.betAmount}</span>
          <span className="pill pill-accent">Payout {result.payout}</span>
          {computedMultiplier ? <span className="pill">x{computedMultiplier.toFixed(2)}</span> : null}
        </div>
        {hasCascades ? renderCascadeSummary(data) : null}
        {!hasCascades && isSlotsLike ? renderInteractiveTrack(data) : null}
        {!isSlotsLike && (
          <div className="result-text">
            <p>{result.resultType === "WIN" ? "You crushed it." : result.resultType === "DRAW" ? "Push." : "Try again."}</p>
            {Array.isArray((data as { playerHand?: unknown }).playerHand) && (
              <div className="muted">
                <p>Player: {(data as { playerHand: string[] }).playerHand.join(", ")}</p>
                <p>Dealer: {(data as { dealerHand?: string[] }).dealerHand?.join(", ")}</p>
              </div>
            )}
            {typeof (data as { winningNumber?: number }).winningNumber === "number" && (
              <p className="muted">Winning number {(data as { winningNumber: number }).winningNumber}</p>
            )}
          </div>
        )}
        {bonusReady && (
          <div className="bonus-ribbon">
            <span className="glow-dot" />
            <strong>Bonus unlocked</strong>
            <small>{hasJackpot ? "Jackpot segment triggered" : "High multiplier hit"}</small>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal modal-full">
      <div className="modal__content modal__content--wide">
        <div className="modal__glow" />
        <div className="immersive-bg">
          <div className="ambient-lines" />
          <div className="ambient-pulse" />
        </div>
        <header className="game-header">
          <div>
            <p className="eyebrow">{game.providerName ?? "Premium table"}</p>
            <h2>{game.name}</h2>
            <p className="muted">
              Bets {game.minBet} - {game.maxBet}
            </p>
          </div>
          <button className="close-btn" aria-label="Close" onClick={onClose}>
            X
          </button>
        </header>

        <div className="meta-ribbon">
          <div className="meta-chip">
            <span className="dot live" /> Live bonus pool
            <strong> 1 250 000</strong>
          </div>
          <div className="meta-chip ghost">
            {isCascade ? "Mode" : "Volatility"}: <strong>{isCascade ? cascadeMode : volatility}</strong>
          </div>
          <div className="meta-chip ghost">
            {isCascade ? "Lanterns" : "Lane"}: <strong>{isCascade ? `${cascadeScatterCount}/4` : lane}</strong>
          </div>
        </div>

        <div className="game-grid">
          <section className="control-panel">
            {isInteractive && (
              <div className="control-group">
                <div className="control-row">
                  <div>
                    <p className="label">Choose your lane</p>
                    <p className="muted">Lane modifies stability and speed of boosts.</p>
                  </div>
                  <div className="pill-row options">
                    {LANE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`pill-button ${lane === option.value ? "active" : ""}`}
                        onClick={() => setLane(option.value)}
                      >
                        <span>{option.label}</span>
                        <small>{option.helper}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="control-row">
                  <div>
                    <p className="label">Volatility</p>
                    <p className="muted">Set the heat before you ride.</p>
                  </div>
                  <div className="pill-row options">
                    {VOLATILITY_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`pill-button ${volatility === option.value ? "active" : ""}`}
                        onClick={() => setVolatility(option.value)}
                      >
                        <span>{option.label}</span>
                        <small>{option.helper}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {isCascade && (
              <div className="control-group">
                <div className="control-row">
                  <div>
                    <p className="label">Aether mode</p>
                    <p className="muted">Controls tumble length and bomb density.</p>
                  </div>
                  <div className="pill-row options">
                    {AETHER_MODES.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`pill-button ${cascadeMode === option.value ? "active" : ""}`}
                        onClick={() => setCascadeMode(option.value)}
                      >
                        <span>{option.label}</span>
                        <small>{option.helper}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="control-row">
                  <div>
                    <p className="label">Bonus meter</p>
                    <p className="muted">{cascadeScatterCount}/4 lanterns for free spins.</p>
                  </div>
                  <div className="pill-row">
                    <span className="pill">{cascadeMode} mode</span>
                    {cascadeMultiplier ? <span className="pill pill-accent">x{cascadeMultiplier.toFixed(2)}</span> : null}
                    {cascadeBombTotal ? <span className="pill">Bombs x{cascadeBombTotal}</span> : <span className="pill ghost">No bombs yet</span>}
                  </div>
                </div>
              </div>
            )}
            {!isInteractive && !isCascade && (
              <div className="control-group">
                <p className="muted">Classic table flow. Place your stake and play.</p>
              </div>
            )}
            <div className="stake-card">
              <label className="label">Stake</label>
              <div className="stake-row">
                <input
                  className="input"
                  type="number"
                  min={game.minBet}
                  max={game.maxBet}
                  value={bet}
                  onChange={event => setBet(Number(event.target.value))}
                />
                <button className="button button-primary play-btn" onClick={handlePlay} disabled={isPlaying}>
                  {isPlaying ? "Spinning..." : "Play"}
                </button>
              </div>
              <p className="muted">Min {game.minBet} / Max {game.maxBet}</p>
            </div>
          </section>

          <section className={`slot-stage ${isPlaying ? "spinning" : ""} ${result ? result.resultType.toLowerCase() : ""}`}>
            <div className="grid-overlay" />
            <div className="particles">
              {Array.from({ length: 12 }).map((_, idx) => (
                <span key={idx} style={{ animationDelay: `${idx * 0.12}s` }} />
              ))}
            </div>
            {isInteractive ? (
              <div className="olympus-shell">
                <div className="olympus-bg" />
                <div className="olympus-left">
                  <div className="olympus-card accent">
                    <p className="label">Buy bonus</p>
                    <h3>2000</h3>
                    <p className="muted">Free spins entry.</p>
                    <button className="button button-secondary" type="button">Buy</button>
                  </div>
                  <div className="olympus-card">
                    <p className="label">Bet</p>
                    <div className="value-row">
                      <button type="button" className="chip" onClick={() => setBet(Math.max(game.minBet, bet - 1))}>-</button>
                      <strong>{bet}</strong>
                      <button type="button" className="chip" onClick={() => setBet(Math.min(game.maxBet, bet + 1))}>+</button>
                    </div>
                    <p className="muted">Boost your bonus odds.</p>
                  </div>
                  <div className="olympus-card dark">
                    <p className="label">Bonus chance</p>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${bonusFill}%` }} />
                    </div>
                    <p className="muted">Fill the bar to trigger free spins.</p>
                  </div>
                </div>
                <div className="olympus-main">
                  <div className="olympus-banner">WIN UP TO 5000x YOUR BET</div>
                  <div className="olympus-reels">
                    {reels.map((col, columnIndex) => (
                      <div key={columnIndex} className="olympus-reel">
                        {col.map((symbol, rowIndex) => (
                          <div key={`${columnIndex}-${rowIndex}`} className="olympus-symbol">
                            <span>{symbol}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                    <div className="olympus-footer">
                      <div className="pill-row">
                        <span className="pill">Bet {bet}</span>
                        <span className="pill">{volatility} mode</span>
                        {result ? <span className="pill pill-accent">Payout {result.payout}</span> : null}
                      </div>
                      <div className="spin-controls">
                        <button type="button" className="spin-btn" onClick={handlePlay} disabled={isPlaying}>
                          <span className="spin-arrow">{">>"}</span>
                          <small>{isPlaying ? "Spinning..." : "Spin"}</small>
                        </button>
                        <button type="button" className="chip ghost">Auto</button>
                      </div>
                    </div>
                  </div>
                <div className="olympus-figure">
                  <div className="figure-glow" />
                  <div className="figure-placeholder">*</div>
                </div>
              </div>
            ) : isCascade ? (
              <div className="bonanza-shell">
                <div className="bonanza-bg" />
                <div className="bonanza-left">
                  <div className="bonanza-card buy-card">
                    <p className="label">BUY FEATURE</p>
                    <h3>$200</h3>
                  </div>
                  <div className="bonanza-card bet-card">
                    <p className="label">BET</p>
                    <div className="pill-row">
                      <button className="chip" onClick={() => setBet(Math.max(game.minBet, bet - 0.5))}>-</button>
                      <strong>{bet.toFixed(2)}</strong>
                      <button className="chip" onClick={() => setBet(Math.min(game.maxBet, bet + 0.5))}>+</button>
                    </div>
                    <p className="muted">DOUBLE CHANCE</p>
                    <button className="toggle-button">ON</button>
                  </div>
                  <div className="bonanza-card small-card">
                    <p className="muted">Tap to change between money and coin view</p>
                    <p className="label">Credit</p>
                    <strong>99,998.00</strong>
                  </div>
                </div>
                <div className="bonanza-main">
                  <div className="bonanza-top">
                    <div className="bonanza-logo">Sweet Bonanza</div>
                    <div className="bonanza-info">
                      <span>Bet {bet.toFixed(2)}</span>
                      {cascadeMultiplier ? <span>x{cascadeMultiplier.toFixed(2)}</span> : null}
                    </div>
                  </div>
                  <div className="bonanza-grid">
                    {aetherGridToRender.map((row, rowIndex) => (
                      <div key={`bonanza-row-${rowIndex}`} className="bonanza-row">
                        {row.map((symbol, cellIndex) => {
                          const meta = AETHER_SYMBOL_META[symbol] ?? { label: symbol, tone: "rose" };
                          return (
                            <div key={`${rowIndex}-${cellIndex}`} className={`bonanza-tile tone-${meta.tone}`}>
                              <span>{meta.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="bonanza-footer">
                    <div className="spin-banner">SPIN TO WIN!</div>
                    <div className="spin-controls">
                      <button type="button" className="spin-btn" onClick={handlePlay} disabled={isPlaying}>
                        <span className="spin-arrow">{">>"}</span>
                        <small>{isPlaying ? "Spinning..." : "Spin"}</small>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="jackpot-marquee">
                  <div className="ticker">Mega Jackpot climbing...</div>
                  <div className="ticker-value">$1 250 000</div>
                </div>
                <div className="bonus-meter">
                  <div className="bonus-meter__label">
                    <span className="pill pill-accent">Bonus</span>
                    <small>Fill the gauge to trigger a feature.</small>
                  </div>
                  <div className="bonus-meter__bar">
                    <div className="bonus-meter__fill" style={{ width: `${bonusFill}%` }} />
                  </div>
                  <div className="heat-indicator">
                    <span>Heat</span>
                    <div className="heat-track">
                      <div className="heat-fill" style={{ width: `${heatLevel}%` }} />
                    </div>
                  </div>
                </div>
                  <div className={slotFrameClass}>
                    <div className="slot-hud">
                      <div>
                        <p className="eyebrow">Now playing</p>
                        <h3 className="slot-name">{game.name}</h3>
                      </div>
                      <div className="pill-row">
                        <span className="pill">Bet {bet}</span>
                        <span className="pill ghost">{game.minBet} - {game.maxBet}</span>
                        <span className="pill ghost">Lines 20</span>
                      </div>
                    </div>
                    <div className="slot-lights" />
                    <div className="reels">
                      {[0, 1, 2].map(reelIndex => (
                        <div key={reelIndex} className="reel">
                          <div className="reel-strip">
                          {reelStrip.map((symbol, index) => (
                            <div key={`${reelIndex}-${index}`} className="symbol">
                              {symbol}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="slot-overlay">
                    {result ? (
                      <div className={`result-badge ${result.resultType.toLowerCase()}`}>
                        {result.resultType} {result.payout ? `+${result.payout}` : ""}
                      </div>
                    ) : (
                      <div className="result-badge waiting">Ready to make your move?</div>
                    )}
                    {bonusReady && <div className="burst" />}
                  </div>
                </div>
                {renderResultSummary()}
              </>
            )}
            {isInteractive || isCascade ? renderResultSummary() : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default GameModal;



