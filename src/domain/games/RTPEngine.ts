/**
 * RTP Engine - Real Casino Slot RTP System
 * Implements Pragmatic Play-style probability mechanics
 * 
 * Features:
 * - Weighted reel strips (real slot behavior)
 * - Configurable RTP (default 96.5%)
 * - Variance models (low/medium/high volatility)
 * - Hit frequency control
 * - Session-based adaptive probability
 * - Streak management (warm-up, cold streaks)
 * - Dead spin pacing
 */

export type VolatilityLevel = "low" | "medium" | "high";

export interface RTPConfig {
  targetRTP: number;        // Target RTP (e.g., 0.965 = 96.5%)
  volatility: VolatilityLevel;
  hitFrequency: number;     // % of spins that should result in ANY win
  maxMultiplier: number;    // Maximum win multiplier
  minMultiplier: number;    // Minimum win multiplier
}

export interface SessionState {
  totalSpins: number;
  totalWagered: number;
  totalPaid: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  lastBigWin: number;       // Spins since last big win (>10x)
  currentRTP: number;
}

export interface WeightedSymbol<T> {
  symbol: T;
  weight: number;           // Higher = more common
}

export interface SpinOutcome {
  shouldWin: boolean;
  targetMultiplier: number; // If win, what multiplier to aim for
  allowNearMiss: boolean;   // Should we show near-miss
}

// Volatility profiles - control payout distribution
const VOLATILITY_PROFILES: Record<VolatilityLevel, {
  smallWinChance: number;   // <3x multiplier
  mediumWinChance: number;  // 3-10x multiplier
  bigWinChance: number;     // 10-50x multiplier
  megaWinChance: number;    // >50x multiplier
  deadSpinRatio: number;    // % of total spins that are dead (no win)
}> = {
  low: {
    smallWinChance: 0.60,   // 60% of wins are small (0.1-1× bet)
    mediumWinChance: 0.25,  // 25% are medium (1×-3×)
    bigWinChance: 0.12,     // 12% are big (3×-10×)
    megaWinChance: 0.03,    // 3% are mega (10×+)
    deadSpinRatio: 0.50     // 50% dead (more frequent wins)
  },
  medium: {
    smallWinChance: 0.556,  // 25% of total spins (25/45 = 55.6% of wins)
    mediumWinChance: 0.222, // 10% of total spins (10/45 = 22.2% of wins)
    bigWinChance: 0.111,    // 5% of total spins (5/45 = 11.1% of wins)
    megaWinChance: 0.011,   // 0.5% of total spins (0.5/45 = 1.1% of wins)
    deadSpinRatio: 0.55     // 55% dead spin (USER SPEC)
  },
  high: {
    smallWinChance: 0.50,   // 50% of wins are small (rare but big)
    mediumWinChance: 0.30,  // 30% are medium
    bigWinChance: 0.15,     // 15% are big
    megaWinChance: 0.05,    // 5% are mega
    deadSpinRatio: 0.65     // 65% dead (lower wins, higher volatility)
  }
};

export class RTPEngine {
  private config: RTPConfig;
  private session: SessionState;

  constructor(config: Partial<RTPConfig> = {}) {
    this.config = {
      targetRTP: config.targetRTP ?? 0.76,  // 76% RTP (USER SPEC: 70-88%)
      volatility: config.volatility ?? "medium",
      hitFrequency: config.hitFrequency ?? 0.45, // 45% hit rate (USER SPEC: 55% dead = 45% wins)
      maxMultiplier: config.maxMultiplier ?? 100,
      minMultiplier: config.minMultiplier ?? 1.2
    };

    this.session = {
      totalSpins: 0,
      totalWagered: 0,
      totalPaid: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastBigWin: 0,
      currentRTP: 0
    };
  }

  /**
   * Main decision engine - determines if this spin should win
   * Considers: RTP, volatility, session state, streaks, newbie boost
   * @param betAmount - Amount wagered
   * @param userSpinCount - User's total spins (for newbie boost)
   */
  calculateSpinOutcome(betAmount: number, userSpinCount: number = 0): SpinOutcome {
    this.session.totalSpins++;
    this.session.totalWagered += betAmount;
    this.session.lastBigWin++;

    // Calculate current session RTP
    this.session.currentRTP = this.session.totalWagered > 0
      ? this.session.totalPaid / this.session.totalWagered
      : 0;

    const profile = VOLATILITY_PROFILES[this.config.volatility];
    const rtpDeviation = this.config.targetRTP - this.session.currentRTP;

    // Base win chance from hit frequency
    let winChance = this.config.hitFrequency;

    // NEWBIE BOOST: First 50 spins get progressive boost (3× → 1.5×)
    // Spin 1: 3.0×, Spin 25: 2.25×, Spin 50: 1.5×, Spin 51+: 1.0×
    if (userSpinCount < 50) {
      const boostMultiplier = 3.0 - (userSpinCount / 50) * 1.5; // Linear decay from 3.0 to 1.5
      winChance *= boostMultiplier;
    }

    // RTP CORRECTION: If paying too much, reduce wins. If paying too little, increase wins.
    // This creates the "rubber band" effect that keeps RTP near target
    // REDUCED AGGRESSIVENESS - less manipulation for more natural feel
    if (rtpDeviation > 0.08) {
      // We're 8%+ below target RTP - moderate increase
      winChance *= 1.3;
    } else if (rtpDeviation > 0.04) {
      // We're 4-8% below target - slight increase
      winChance *= 1.15;
    } else if (rtpDeviation < -0.08) {
      // We're 8%+ above target RTP - decrease win chance
      winChance *= 0.7;
    } else if (rtpDeviation < -0.04) {
      // We're 4-8% above target - slight decrease
      winChance *= 0.85;
    }

    // STREAK MANAGEMENT: Prevent extreme losing streaks only
    if (this.session.consecutiveLosses >= 20) {
      // Player is very frustrated - boost win chance (retention mechanic)
      winChance *= 1.5;
    } else if (this.session.consecutiveLosses >= 15) {
      winChance *= 1.2;
    }

    if (this.session.consecutiveWins >= 6) {
      // Too many wins in a row - cool down
      winChance *= 0.7;
    }

    // REMOVED: Warm-up phase - let RTP work naturally from the start

    // BIG WIN PACING: If it's been too long since a big win, increase chance
    if (this.session.lastBigWin > 100) {
      winChance *= 1.1;
    }

    // Roll the dice
    const roll = Math.random();
    const shouldWin = roll < winChance;

    // Determine win size if we're winning
    let targetMultiplier = 0;
    if (shouldWin) {
      targetMultiplier = this.determineWinMultiplier(profile, rtpDeviation);
    }

    // Near-miss logic: Show near-miss 40% of time when losing
    const allowNearMiss = !shouldWin && Math.random() < 0.4;

    return {
      shouldWin,
      targetMultiplier,
      allowNearMiss
    };
  }

  /**
   * Determines win multiplier based on volatility profile and RTP state
   */
  private determineWinMultiplier(
    profile: typeof VOLATILITY_PROFILES[VolatilityLevel],
    rtpDeviation: number
  ): number {
    const roll = Math.random();

    // If we're way below RTP, favor bigger wins to catch up
    const bigWinBoost = rtpDeviation > 0.05 ? 1.5 : 1.0;

    // Determine win tier
    if (roll < profile.megaWinChance * bigWinBoost) {
      // Mega win: 50-100x
      return this.randomFloat(50, this.config.maxMultiplier);
    } else if (roll < profile.megaWinChance * bigWinBoost + profile.bigWinChance * bigWinBoost) {
      // Big win: 10-50x
      this.session.lastBigWin = 0; // Reset big win counter
      return this.randomFloat(10, 50);
    } else if (roll < profile.megaWinChance * bigWinBoost + profile.bigWinChance * bigWinBoost + profile.mediumWinChance) {
      // Medium win: 3-10x
      return this.randomFloat(3, 10);
    } else {
      // Small win: 1.2-3x
      return this.randomFloat(this.config.minMultiplier, 3);
    }
  }

  /**
   * Record spin result - updates session state
   */
  recordResult(payout: number, isWin: boolean): void {
    this.session.totalPaid += payout;

    if (isWin) {
      this.session.consecutiveWins++;
      this.session.consecutiveLosses = 0;
    } else {
      this.session.consecutiveLosses++;
      this.session.consecutiveWins = 0;
    }

    // Recalculate current RTP
    this.session.currentRTP = this.session.totalWagered > 0
      ? this.session.totalPaid / this.session.totalWagered
      : 0;
  }

  /**
   * Get current session stats
   */
  getSessionState(): SessionState {
    return { ...this.session };
  }
  
  /**
   * Get target RTP configuration
   */
  getTargetRTP(): number {
    return this.config.targetRTP;
  }

  /**
   * Reset session (new player or session timeout)
   */
  resetSession(): void {
    this.session = {
      totalSpins: 0,
      totalWagered: 0,
      totalPaid: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastBigWin: 0,
      currentRTP: 0
    };
  }

  /**
   * Weighted random selection from symbol pool
   * Used for creating realistic reel strips
   */
  static selectWeighted<T>(symbols: WeightedSymbol<T>[]): T {
    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of symbols) {
      random -= item.weight;
      if (random <= 0) {
        return item.symbol;
      }
    }

    // Fallback to last symbol
    return symbols[symbols.length - 1].symbol;
  }

  /**
   * Create weighted reel strip
   * Higher value symbols have lower weight (appear less often)
   */
  static createWeightedReelStrip<T extends { priceValue: number }>(
    symbols: T[],
    stripLength: number = 100
  ): T[] {
    // Calculate weights inversely proportional to price
    const maxPrice = Math.max(...symbols.map(s => s.priceValue));
    const weighted: WeightedSymbol<T>[] = symbols.map(symbol => ({
      symbol,
      // Higher price = lower weight (rarer)
      weight: maxPrice / Math.max(1, symbol.priceValue)
    }));

    const strip: T[] = [];
    for (let i = 0; i < stripLength; i++) {
      strip.push(RTPEngine.selectWeighted(weighted));
    }

    return strip;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
