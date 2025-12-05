/**
 * RTP Simulator
 * 
 * Runs millions of simulated spins to verify actual RTP matches theoretical targets.
 * Provides detailed statistics on win distribution, shard economy, and NFT drops.
 * 
 * USAGE:
 * ```typescript
 * const simulator = new RTPSimulator(config);
 * const results = simulator.simulate(1_000_000); // 1 million spins
 * console.log(`Actual RTP: ${results.actualRTP.toFixed(4)}`);
 * ```
 * 
 * VALIDATION:
 * - Actual RTP should converge to target RTP (±0.5% acceptable)
 * - Hit frequencies should match configuration probabilities
 * - Shard drop rates should align with expected pattern frequencies
 * - NFT issuance rates should match tier drop rates
 */

import { SlotSystemConfig } from "./SlotConfig";

export interface SpinOutcome {
  type: "dead" | "small" | "medium" | "big" | "epic" | "nft";
  payout: number;          // In bet units (e.g., 2.5 = 2.5x bet)
  shards: { tier: string; count: number }[];
  nftDrop?: { tier: string; value: number };
  multiplier?: number;
}

export interface SimulationResult {
  // Basic statistics
  totalSpins: number;
  totalWagered: number;
  totalReturned: number;
  actualRTP: number;
  
  // Win distribution
  outcomeFrequencies: {
    dead: number;
    small: number;
    medium: number;
    big: number;
    epic: number;
    nft: number;
  };
  
  // RTP breakdown
  rtpBreakdown: {
    winRTP: number;       // RTP from regular wins
    shardRTP: number;     // RTP from shard economy
    nftRTP: number;       // RTP from direct NFT drops
  };
  
  // Shard economy stats
  shardStatistics: {
    totalShardsDropped: { S: number; A: number; B: number; C: number };
    shardDropRate: number; // % of spins with shard drop
    nftsFromShards: number; // NFTs redeemed from shards
  };
  
  // NFT drop stats
  nftStatistics: {
    directDrops: { S: number; A: number; B: number; C: number };
    totalNFTs: number;
    avgSpinsBetweenNFTs: number;
  };
  
  // Volatility metrics
  volatility: {
    maxWin: number;
    maxLoss: number;
    winStreak: number;
    lossStreak: number;
    standardDeviation: number;
  };
  
  // Balance progression (sampled every N spins)
  balanceSamples: { spin: number; balance: number }[];
}

export class RTPSimulator {
  private config: SlotSystemConfig;
  private mode: "3x3" | "5x5";
  
  constructor(config: SlotSystemConfig, mode: "3x3" | "5x5" = "3x3") {
    this.config = config;
    this.mode = mode;
    // Note: ShardEconomy will be integrated when pattern detection is added to simulation
  }

  /**
   * Simulate N spins and collect statistics
   */
  simulate(
    numSpins: number,
    betAmount: number = this.config.pricing.basePrice,
    sampleInterval: number = 1000
  ): SimulationResult {
    console.log(`Starting simulation: ${numSpins.toLocaleString()} spins @ $${betAmount}`);
    
    const startTime = Date.now();
    
    // Statistics accumulators
    let totalWagered = 0;
    let totalReturned = 0;
    
    const outcomeFrequencies = { dead: 0, small: 0, medium: 0, big: 0, epic: 0, nft: 0 };
    
    const shardBalances = { S: 0, A: 0, B: 0, C: 0 };
    let shardDropCount = 0;
    let nftsFromShards = 0;
    
    const nftDirectDrops = { S: 0, A: 0, B: 0, C: 0 };
    
    let balance = 0;
    const balanceSamples: { spin: number; balance: number }[] = [];
    
    let maxWin = 0;
    let maxLoss = 0;
    let currentStreak = 0;
    let winStreak = 0;
    let lossStreak = 0;
    
    const payouts: number[] = [];
    
    // Run simulation
    for (let i = 1; i <= numSpins; i++) {
      totalWagered += betAmount;
      balance -= betAmount;
      
      const outcome = this.simulateSpin(betAmount);
      
      // Record outcome
      outcomeFrequencies[outcome.type]++;
      
      // Apply payout
      const payout = outcome.payout * betAmount;
      totalReturned += payout;
      balance += payout;
      payouts.push(payout - betAmount); // Net win/loss
      
      // Track max win/loss
      if (payout > maxWin) maxWin = payout;
      const netResult = payout - betAmount;
      if (netResult < maxLoss) maxLoss = netResult;
      
      // Track streaks
      if (payout > betAmount) {
        currentStreak = Math.max(0, currentStreak) + 1;
        winStreak = Math.max(winStreak, currentStreak);
      } else {
        currentStreak = Math.min(0, currentStreak) - 1;
        lossStreak = Math.max(lossStreak, Math.abs(currentStreak));
      }
      
      // Apply multiplier if present
      if (outcome.multiplier && outcome.multiplier > 1) {
        const bonusPayout = payout * (outcome.multiplier - 1);
        totalReturned += bonusPayout;
        balance += bonusPayout;
      }
      
      // Handle shards
      if (outcome.shards.length > 0) {
        shardDropCount++;
        for (const shard of outcome.shards) {
          shardBalances[shard.tier as keyof typeof shardBalances] += shard.count;
        }
      }
      
      // Check shard redemption (every 10 shards)
      // Note: Shards don't contribute to coin RTP, only track redemptions
      for (const tier of ["S", "A", "B", "C"] as const) {
        while (shardBalances[tier] >= this.config.shardConfig.shardsRequired) {
          shardBalances[tier] -= this.config.shardConfig.shardsRequired;
          nftsFromShards++;
          
          // Don't add to totalReturned - NFTs have market value separate from RTP
        }
      }
      
      // Handle direct NFT drops
      // Note: Direct drops are rare events, don't add value to coin RTP
      if (outcome.nftDrop) {
        nftDirectDrops[outcome.nftDrop.tier as keyof typeof nftDirectDrops]++;
        // Don't add to totalReturned - NFTs have market value separate from RTP
      }
      
      // Sample balance progression
      if (i % sampleInterval === 0) {
        balanceSamples.push({ spin: i, balance });
      }
      
      // Progress indicator
      if (i % 100000 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const progress = ((i / numSpins) * 100).toFixed(1);
        const currentRTP = totalReturned / totalWagered;
        console.log(`  ${progress}% (${i.toLocaleString()}/${numSpins.toLocaleString()}) | RTP: ${(currentRTP * 100).toFixed(2)}% | ${elapsed}s`);
      }
    }
    
    // Calculate final RTP
    const actualRTP = totalReturned / totalWagered;
    
    // RTP breakdown: Only coin payouts contribute to RTP
    // NFTs and shards have separate market value
    const winRTP = actualRTP;
    const shardRTP = 0; // Shards tracked separately, not part of coin RTP
    const nftRTP = 0;   // NFTs tracked separately, not part of coin RTP
    
    // Calculate volatility (standard deviation)
    const mean = payouts.reduce((sum, p) => sum + p, 0) / payouts.length;
    const variance = payouts.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / payouts.length;
    const stdDev = Math.sqrt(variance);
    
    const totalNFTs = nftsFromShards + Object.values(nftDirectDrops).reduce((sum, count) => sum + count, 0);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Simulation complete in ${elapsed}s`);
    
    return {
      totalSpins: numSpins,
      totalWagered,
      totalReturned,
      actualRTP,
      
      outcomeFrequencies: {
        dead: outcomeFrequencies.dead / numSpins,
        small: outcomeFrequencies.small / numSpins,
        medium: outcomeFrequencies.medium / numSpins,
        big: outcomeFrequencies.big / numSpins,
        epic: outcomeFrequencies.epic / numSpins,
        nft: outcomeFrequencies.nft / numSpins
      },
      
      rtpBreakdown: {
        winRTP,
        shardRTP,
        nftRTP
      },
      
      shardStatistics: {
        totalShardsDropped: shardBalances,
        shardDropRate: shardDropCount / numSpins,
        nftsFromShards
      },
      
      nftStatistics: {
        directDrops: nftDirectDrops,
        totalNFTs,
        avgSpinsBetweenNFTs: totalNFTs > 0 ? numSpins / totalNFTs : Infinity
      },
      
      volatility: {
        maxWin,
        maxLoss,
        winStreak,
        lossStreak,
        standardDeviation: stdDev
      },
      
      balanceSamples
    };
  }

  /**
   * Simulate a single spin outcome
   * In production, betAmount affects multiplier spawn rate
   */
  private simulateSpin(_betAmount: number): SpinOutcome {
    const modeConfig = this.mode === "3x3" ? this.config.mode3x3 : this.config.mode5x5;
    const nftDropRates = this.mode === "3x3" 
      ? this.config.nftDirectDropRates.mode3x3 
      : this.config.nftDirectDropRates.mode5x5;
    
    const rand = Math.random();
    let cumulative = 0;
    
    // Check direct NFT drop first (rarest)
    cumulative += modeConfig.directNftTotal;
    if (rand < cumulative) {
      const tier = this.selectNFTTier(nftDropRates);
      return {
        type: "nft",
        payout: 0, // NFT drop doesn't include coin payout
        shards: [],
        nftDrop: {
          tier,
          value: this.estimateNFTValue(tier)
        }
      };
    }
    
    // Check epic win
    cumulative += modeConfig.epicWin;
    if (rand < cumulative) {
      return {
        type: "epic",
        payout: this.randomInRange(modeConfig.epicWinRange),
        shards: this.simulateShardDrop("epic"),
        multiplier: this.shouldApplyMultiplier(modeConfig.multiplierChance) 
          ? this.selectMultiplier() 
          : undefined
      };
    }
    
    // Check big win
    cumulative += modeConfig.bigWin;
    if (rand < cumulative) {
      return {
        type: "big",
        payout: this.randomInRange(modeConfig.bigWinRange),
        shards: this.simulateShardDrop("big"),
        multiplier: this.shouldApplyMultiplier(modeConfig.multiplierChance) 
          ? this.selectMultiplier() 
          : undefined
      };
    }
    
    // Check medium win
    cumulative += modeConfig.mediumWin;
    if (rand < cumulative) {
      return {
        type: "medium",
        payout: this.randomInRange(modeConfig.mediumWinRange),
        shards: this.simulateShardDrop("medium")
      };
    }
    
    // Check small win
    cumulative += modeConfig.smallWin;
    if (rand < cumulative) {
      return {
        type: "small",
        payout: this.randomInRange(modeConfig.smallWinRange),
        shards: this.simulateShardDrop("small")
      };
    }
    
    // Dead spin
    return {
      type: "dead",
      payout: 0,
      shards: this.simulateShardDrop("dead")
    };
  }

  /**
   * Simulate shard drop based on outcome type
   * This is simplified - actual game uses pattern detection
   */
  private simulateShardDrop(outcomeType: string): { tier: string; count: number }[] {
    const shards: { tier: string; count: number }[] = [];
    
    // Simplified shard drop logic
    // In reality, this depends on patterns detected in grid
    const dropChance = outcomeType === "dead" ? 0.05 : 
                       outcomeType === "small" ? 0.15 :
                       outcomeType === "medium" ? 0.25 :
                       outcomeType === "big" ? 0.35 : 0.40;
    
    if (Math.random() < dropChance) {
      // Select tier based on outcome quality
      const tierWeights = outcomeType === "epic" || outcomeType === "big"
        ? [0.02, 0.08, 0.30, 0.60] // [S, A, B, C]
        : outcomeType === "medium"
        ? [0.01, 0.04, 0.20, 0.75]
        : [0.003, 0.02, 0.10, 0.877];
      
      const tier = this.weightedRandomSelect(["S", "A", "B", "C"], tierWeights);
      shards.push({ tier, count: 1 });
    }
    
    return shards;
  }

  /**
   * Select NFT tier based on drop rates
   */
  private selectNFTTier(rates: { S: number; A: number; B: number; C: number }): string {
    const total = rates.S + rates.A + rates.B + rates.C;
    const rand = Math.random() * total;
    
    let cumulative = 0;
    cumulative += rates.S;
    if (rand < cumulative) return "S";
    
    cumulative += rates.A;
    if (rand < cumulative) return "A";
    
    cumulative += rates.B;
    if (rand < cumulative) return "B";
    
    return "C";
  }

  /**
   * Estimate NFT value based on tier
   * This is placeholder - actual values from market
   */
  private estimateNFTValue(tier: string): number {
    const values = { S: 500, A: 200, B: 80, C: 30 };
    return values[tier as keyof typeof values] || 0;
  }

  /**
   * Check if multiplier should be applied
   */
  private shouldApplyMultiplier(chance: number): boolean {
    return Math.random() < chance;
  }

  /**
   * Select multiplier value based on weights
   */
  private selectMultiplier(): number {
    const weights = this.config.multiplierWeights;
    const values = Object.keys(weights).map(Number);
    const weightArray = values.map(v => weights[v]);
    
    return this.weightedRandomSelect(values, weightArray);
  }

  /**
   * Weighted random selection
   */
  private weightedRandomSelect<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return items[i];
    }
    
    return items[items.length - 1];
  }

  /**
   * Random number in range [min, max]
   */
  private randomInRange([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Generate human-readable report
   */
  static generateReport(result: SimulationResult): string {
    const report: string[] = [];
    
    report.push("=".repeat(60));
    report.push("RTP SIMULATION REPORT");
    report.push("=".repeat(60));
    report.push("");
    
    report.push("BASIC STATISTICS:");
    report.push(`  Total Spins: ${result.totalSpins.toLocaleString()}`);
    report.push(`  Total Wagered: $${result.totalWagered.toLocaleString()}`);
    report.push(`  Total Returned: $${result.totalReturned.toLocaleString()}`);
    report.push(`  Actual RTP: ${(result.actualRTP * 100).toFixed(4)}%`);
    report.push("");
    
    report.push("RTP BREAKDOWN:");
    report.push(`  Win RTP: ${(result.rtpBreakdown.winRTP * 100).toFixed(2)}%`);
    report.push(`  Shard RTP: ${(result.rtpBreakdown.shardRTP * 100).toFixed(2)}%`);
    report.push(`  NFT RTP: ${(result.rtpBreakdown.nftRTP * 100).toFixed(2)}%`);
    report.push("");
    
    report.push("OUTCOME FREQUENCIES:");
    report.push(`  Dead Spin: ${(result.outcomeFrequencies.dead * 100).toFixed(2)}%`);
    report.push(`  Small Win: ${(result.outcomeFrequencies.small * 100).toFixed(2)}%`);
    report.push(`  Medium Win: ${(result.outcomeFrequencies.medium * 100).toFixed(2)}%`);
    report.push(`  Big Win: ${(result.outcomeFrequencies.big * 100).toFixed(2)}%`);
    report.push(`  Epic Win: ${(result.outcomeFrequencies.epic * 100).toFixed(2)}%`);
    report.push(`  NFT Drop: ${(result.outcomeFrequencies.nft * 100).toFixed(4)}%`);
    report.push("");
    
    report.push("SHARD ECONOMY:");
    report.push(`  Total Shards Dropped:`);
    report.push(`    S: ${result.shardStatistics.totalShardsDropped.S}`);
    report.push(`    A: ${result.shardStatistics.totalShardsDropped.A}`);
    report.push(`    B: ${result.shardStatistics.totalShardsDropped.B}`);
    report.push(`    C: ${result.shardStatistics.totalShardsDropped.C}`);
    report.push(`  Shard Drop Rate: ${(result.shardStatistics.shardDropRate * 100).toFixed(2)}%`);
    report.push(`  NFTs Redeemed from Shards: ${result.shardStatistics.nftsFromShards}`);
    report.push("");
    
    report.push("NFT STATISTICS:");
    report.push(`  Direct NFT Drops:`);
    report.push(`    S: ${result.nftStatistics.directDrops.S}`);
    report.push(`    A: ${result.nftStatistics.directDrops.A}`);
    report.push(`    B: ${result.nftStatistics.directDrops.B}`);
    report.push(`    C: ${result.nftStatistics.directDrops.C}`);
    report.push(`  Total NFTs: ${result.nftStatistics.totalNFTs}`);
    report.push(`  Avg Spins Between NFTs: ${result.nftStatistics.avgSpinsBetweenNFTs.toFixed(0)}`);
    report.push("");
    
    report.push("VOLATILITY METRICS:");
    report.push(`  Max Win: $${result.volatility.maxWin.toFixed(2)}`);
    report.push(`  Max Loss: $${result.volatility.maxLoss.toFixed(2)}`);
    report.push(`  Win Streak: ${result.volatility.winStreak} spins`);
    report.push(`  Loss Streak: ${result.volatility.lossStreak} spins`);
    report.push(`  Standard Deviation: $${result.volatility.standardDeviation.toFixed(2)}`);
    report.push("");
    
    report.push("=".repeat(60));
    
    return report.join("\n");
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { DEFAULT_SLOT_CONFIG } from "./SlotConfig";
 * import { RTPSimulator } from "./RTPSimulator";
 * 
 * const simulator = new RTPSimulator(DEFAULT_SLOT_CONFIG, "3x3");
 * const results = simulator.simulate(1_000_000);
 * 
 * console.log(RTPSimulator.generateReport(results));
 * ```
 */
