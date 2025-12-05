/**
 * Expected Value (EV) Calculator for Slot Spin Pricing
 * 
 * Calculates the theoretical expected return of a spin based on:
 * - Cash payouts (all winning combinations)
 * - Multiplier contributions
 * - Free spin contributions
 * - NFT and shard rewards
 * 
 * Then determines optimal spin price: spinPrice = EV_total / RTP_target
 */

export interface EVBreakdown {
  cashPayouts: number;        // 2-in-row, 3-in-row, patterns, etc.
  multiplierContribution: number;  // Expected value from multiplier stacking
  freeSpinContribution: number;    // Expected value from free spins
  nftRewards: number;              // NFT drops + shards
  totalEV: number;                 // Sum of all components
  spinPrice: number;               // EV_total / RTP_target
  rtpTarget: number;               // Target RTP (0.70-0.88)
  operatorMargin: number;          // 1 - RTP (house edge)
}

export interface SpinPriceConfig {
  mode: "3x3" | "5x5";
  rtpTarget: number;           // 0.70-0.88 (70%-88%)
  averageNftValue: number;     // Average NFT price in collection
  minBet: number;              // Minimum bet amount
  
  // Symbol probabilities
  symbolWeights: {
    common: number;    // 60%
    rare: number;      // 20%
    epic: number;      // 10%
    wild: number;      // 6%
    multiplier: number; // 2%
    nft: number;       // 2%
  };
  
  // Win probabilities (from spec)
  winProbabilities: {
    threeInRow: number;      // 3-in-row standard
    twoInRow: number;        // Two identical adjacent
    brokenThree: number;     // A-Wild-A
    lShape: number;          // L-shape (5x5)
    corner: number;          // 4 corners
    cross: number;           // Cross pattern
    doublePair: number;      // 2 pairs
    advancedPatterns: number; // Geometric patterns
  };
  
  // Multiplier system
  multiplierSpawnRate: number;  // 4% for 3x3, 5% for 5x5
  multiplierAverageValue: number; // Weighted average (x2=2%, x3=1.2%, etc)
  
  // Free spins
  freeSpinTriggerRate: number;  // 1.5% for 3x3, 3% for 5x5
  freeSpinsPerTrigger: number;  // 10
  freeSpinWinBoost: number;     // 1.08 (8% increase)
  persistentMultiplierAverage: number; // Expected multiplier stack in free spins
  
  // NFT system
  nftAttemptRate: number;       // 1% (when 3-in-row happens)
  nftDropRate: number;          // Effective drop rate (attempts × success)
  nftSuccessRate?: number;      // Probability that an attempt grants NFT (default 1%)
  shardsPerNft: number;         // 10 shards = 1 NFT
  averageShardDrop: number;     // Expected shards per spin
}

export class EVCalculator {
  /**
   * Calculate weighted average multiplier value
   * x2(2%), x3(1.2%), x4(0.8%), x5(0.5%), x6(0.3%), x7(0.12%), x8(0.04%), x9(0.01%)
   */
  static calculateAverageMultiplier(): number {
    const multipliers = [
      { value: 2, prob: 0.020 },
      { value: 3, prob: 0.012 },
      { value: 4, prob: 0.008 },
      { value: 5, prob: 0.005 },
      { value: 6, prob: 0.003 },
      { value: 7, prob: 0.0012 },
      { value: 8, prob: 0.0004 },
      { value: 9, prob: 0.0001 }
    ];
    
    const totalProb = multipliers.reduce((sum, m) => sum + m.prob, 0);
    const weightedSum = multipliers.reduce((sum, m) => sum + (m.value * m.prob), 0);
    
    return weightedSum / totalProb; // ~2.4x average
  }
  
  /**
   * Calculate expected value of cash payouts per spin
   */
  static calculateCashPayoutEV(config: SpinPriceConfig, betAmount: number): number {
    let ev = 0;
    
    // 3-in-row: Average 5× bet (varies by symbol rarity)
    ev += config.winProbabilities.threeInRow * betAmount * 5;
    
    // 2-in-row (two adjacent): 15% of bet average
    ev += config.winProbabilities.twoInRow * betAmount * 0.15;
    
    // Broken 3-in-row (A-Wild-A): 2.25× bet average
    ev += config.winProbabilities.brokenThree * betAmount * 2.25;
    
    // L-shape (5x5 only): 3× bet average
    if (config.mode === "5x5") {
      ev += config.winProbabilities.lShape * betAmount * 3;
    }
    
    // Corner match: 5× bet
    ev += config.winProbabilities.corner * betAmount * 5;
    
    // Cross pattern: 10× bet average
    ev += config.winProbabilities.cross * betAmount * 10;
    
    // Double pair: 1.2× bet
    ev += config.winProbabilities.doublePair * betAmount * 1.2;
    
    // Advanced patterns (Diamond, Plus, X, etc): 4× bet average
    ev += config.winProbabilities.advancedPatterns * betAmount * 4;
    
    return ev;
  }
  
  /**
   * Calculate expected value from multiplier system
   */
  static calculateMultiplierEV(config: SpinPriceConfig, cashEV: number): number {
    // Multipliers only apply to wins (clamp to 100% to avoid overestimation)
    const winRate = Math.min(1, Object.values(config.winProbabilities).reduce((sum, p) => sum + p, 0));

    // Expected multiplier contribution:
    // P(multiplier | spin) × (avg_multiplier - 1) × cashEV × winRate
    const multiplierBoost = config.multiplierSpawnRate * (config.multiplierAverageValue - 1);

    return cashEV * multiplierBoost * winRate;
  }
  
  /**
   * Calculate expected value from free spins
   */
  static calculateFreeSpinEV(config: SpinPriceConfig, baseCashEV: number, baseMultiplierEV: number): number {
    // Free spin trigger rate × spins per trigger × enhanced payouts
    const freeSpinTriggers = config.freeSpinTriggerRate;
    const spinsPerTrigger = config.freeSpinsPerTrigger;
    
    // In free spins:
    // - Win rate boosted by 8%
    // - Multipliers 1.5× more frequent
    // - Persistent multipliers stack
    const enhancedCashEV = baseCashEV * config.freeSpinWinBoost;
    // Multipliers are 1.5× more frequent during free spins and persist multiplicatively
    const enhancedMultiplierEV = baseMultiplierEV * 1.5 * config.persistentMultiplierAverage;

    return freeSpinTriggers * spinsPerTrigger * (enhancedCashEV + enhancedMultiplierEV);
  }
  
  /**
   * Calculate expected value from NFT rewards
   */
  static calculateNFTEV(config: SpinPriceConfig): number {
    // Structural attempt probability × success rate (1%) × average NFT value
    const successRate = config.nftSuccessRate ?? 0.01;
    const effectiveDropRate = (config.nftDropRate || (config.nftAttemptRate * successRate));
    const directNftEV = effectiveDropRate * config.averageNftValue;

    // Shard EV: average shards per spin / shardsPerNft × average NFT value
    const shardEV = (config.averageShardDrop / config.shardsPerNft) * config.averageNftValue;

    return directNftEV + shardEV;
  }
  
  /**
   * Calculate complete EV breakdown and optimal spin price
   */
  static calculateSpinPrice(config: SpinPriceConfig, betAmount: number = 1): EVBreakdown {
    // 1. Cash payouts (all winning combinations)
    const cashPayouts = this.calculateCashPayoutEV(config, betAmount);
    
    // 2. Multiplier contributions
    const multiplierContribution = this.calculateMultiplierEV(config, cashPayouts);
    
    // 3. Free spin contributions
    const freeSpinContribution = this.calculateFreeSpinEV(config, cashPayouts, multiplierContribution);
    
    // 4. NFT rewards (independent of bet)
    const nftRewards = this.calculateNFTEV(config);
    
    // 5. Total EV
    const totalEV = cashPayouts + multiplierContribution + freeSpinContribution + nftRewards;
    
    // 6. Spin price = EV / RTP_target
    // If RTP = 85%, spinPrice = EV / 0.85
    // This ensures operator gets (1 - RTP) = 15% margin
    const spinPrice = totalEV / config.rtpTarget;
    
    // 7. Operator margin
    const operatorMargin = 1 - config.rtpTarget;
    
    return {
      cashPayouts,
      multiplierContribution,
      freeSpinContribution,
      nftRewards,
      totalEV,
      spinPrice,
      rtpTarget: config.rtpTarget,
      operatorMargin
    };
  }
  
  /**
   * Create default config for 3x3 mode
   */
  static createDefault3x3Config(averageNftValue: number, minBet: number, rtpTarget: number = 0.76): SpinPriceConfig {
    return {
      mode: "3x3",
      rtpTarget,
      averageNftValue,
      minBet,
      symbolWeights: {
        common: 0.60,
        rare: 0.20,
        epic: 0.10,
        wild: 0.06,
        multiplier: 0.02,
        nft: 0.02
      },
      winProbabilities: {
        threeInRow: 0.10,      // 10% chance (3-in-row, no NFT)
        twoInRow: 0.15,        // 15% (frequent small wins)
        brokenThree: 0.05,     // 5%
        lShape: 0,             // Not available in 3x3
        corner: 0.02,          // 2%
        cross: 0.01,           // 1%
        doublePair: 0.08,      // 8%
        advancedPatterns: 0.04 // 4%
      },
      multiplierSpawnRate: 0.04,              // 4% for 3x3
      multiplierAverageValue: this.calculateAverageMultiplier(),
      freeSpinTriggerRate: 0.015,             // 1.5%
      freeSpinsPerTrigger: 10,
      freeSpinWinBoost: 1.08,                 // 8% increase
      persistentMultiplierAverage: 3.5,       // Expected stack (x2 × x3 avg)
      nftAttemptRate: 0.00075,                // 0.05%-0.1% attempts on 3-in-row
      nftDropRate: 0.0000075,                 // 1% of attempts
      nftSuccessRate: 0.01,
      shardsPerNft: 10,
      averageShardDrop: 0.02                  // ~1 shard every 50 spins baseline
    };
  }
  
  /**
   * Create default config for 5x5 mode
   */
  static createDefault5x5Config(averageNftValue: number, minBet: number, rtpTarget: number = 0.76): SpinPriceConfig {
    return {
      mode: "5x5",
      rtpTarget,
      averageNftValue,
      minBet,
      symbolWeights: {
        common: 0.60,
        rare: 0.20,
        epic: 0.10,
        wild: 0.06,
        multiplier: 0.02,
        nft: 0.02
      },
      winProbabilities: {
        threeInRow: 0.12,      // 12% (3-in-row, no NFT)
        twoInRow: 0.18,        // 18% (more adjacency)
        brokenThree: 0.06,     // 6%
        lShape: 0.04,          // 4% (5x5 exclusive)
        corner: 0.025,         // 2.5%
        cross: 0.015,          // 1.5%
        doublePair: 0.10,      // 10%
        advancedPatterns: 0.06 // 6%
      },
      multiplierSpawnRate: 0.05,              // 5% for 5x5
      multiplierAverageValue: this.calculateAverageMultiplier(),
      freeSpinTriggerRate: 0.03,              // 3%
      freeSpinsPerTrigger: 10,
      freeSpinWinBoost: 1.08,
      persistentMultiplierAverage: 4.2,       // Slightly higher due to more spins
      nftAttemptRate: 0.0009,                 // 0.09% attempts on 5-in-row NFT
      nftDropRate: 0.000009,                  // 1% success on attempts
      nftSuccessRate: 0.01,
      shardsPerNft: 10,
      averageShardDrop: 0.03                  // Slightly more shards in 5x5
    };
  }
  
  /**
   * Get recommended spin price for mode
   */
  static getRecommendedSpinPrice(
    mode: "3x3" | "5x5",
    averageNftValue: number,
    minBet: number,
    rtpTarget: number = 0.76
  ): EVBreakdown {
    const config = mode === "5x5" 
      ? this.createDefault5x5Config(averageNftValue, minBet, rtpTarget)
      : this.createDefault3x3Config(averageNftValue, minBet, rtpTarget);
    
    return this.calculateSpinPrice(config, minBet);
  }
}
