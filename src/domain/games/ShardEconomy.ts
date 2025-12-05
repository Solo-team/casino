/**
 * Shard Economy System
 * 
 * Provides alternative NFT acquisition mechanics to make NFT rewards achievable
 * while keeping direct drops extremely rare. This creates a fair, predictable
 * economy where players can work toward NFT ownership.
 * 
 * DESIGN PHILOSOPHY:
 * - Direct NFT drops: 0.01%-0.6% (jackpot events)
 * - Shard drops: 1%-25% (achievable progress)
 * - Shards required: 10 (configurable)
 * - Expected NFT via shards: ~100-500 spins (depending on tier)
 * 
 * ETHICS:
 * - All probabilities are configurable and transparent
 * - No player-targeted manipulation
 * - Auditable shard balance tracking
 * - Shop prices are fair and predictable
 */

import { NftTier } from "./NftSlotGame";

export interface ShardConfig {
  // Shards required to mint one NFT
  shardsRequired: number;
  
  // Shard drop mechanics for 3x3 mode
  mode3x3: {
    sideComboShardChance: ShardDropRates;      // 2-adjacent + 1 side pattern
    edgeComboShardChance: ShardDropRates;      // Pair on edge + Wild nearby
    diagonalPairShardChance: ShardDropRates;   // 2 diagonal + adjacent Wild
  };
  
  // Shard drop mechanics for 5x5 mode
  mode5x5: {
    cluster4ShardChance: ShardDropRates;       // 4 connected symbols
    cluster5ShardChance: ShardDropRates;       // 5 connected symbols
    cluster6PlusShardChance: ShardDropRates;   // 6+ connected symbols
    cascadeShardChance: ShardDropRates;        // Per cascade chain (optional)
  };
  
  // Shop pricing (tokens per shard)
  shopPrices: {
    S: number;  // Ultra rare
    A: number;  // Rare
    B: number;  // Uncommon
    C: number;  // Common
  };
  
  // Expected value coefficients (for RTP calculation)
  shardValueCoefficients: {
    S: number;  // Monetary value of one Tier S shard
    A: number;
    B: number;
    C: number;
  };
}

export interface ShardDropRates {
  S: number;  // Probability 0-1
  A: number;
  B: number;
  C: number;
}

export interface ShardBalance {
  S: number;
  A: number;
  B: number;
  C: number;
}

export interface ShardAward {
  tier: NftTier;
  count: number;
  source: string;  // "sideCombo" | "cluster4" | "cascade" etc.
}

/**
 * Pattern detection results for shard mechanics
 */
export interface PatternDetection {
  hasSideCombo: boolean;
  sideComboTiers: NftTier[];
  
  hasEdgeCombo: boolean;
  edgeComboTiers: NftTier[];
  
  hasDiagonalPair: boolean;
  diagonalPairTiers: NftTier[];
  
  clusters: Array<{
    size: number;
    tier: NftTier;
    positions: number[];
  }>;
}

/**
 * Default Shard Configuration
 * 
 * REASONING:
 * - 10 shards required = reasonable grind (not too easy, not impossible)
 * - Higher drop rates for patterns = achievable progress every few spins
 * - Tier C easiest to complete (common NFTs for all players)
 * - Tier S requires dedication (rare NFTs remain prestigious)
 * 
 * RTP IMPACT:
 * Each shard has expected value = NFT_value / shardsRequired / avg_spins_to_drop
 * This is factored into total RTP calculation
 */
export const DEFAULT_SHARD_CONFIG: ShardConfig = {
  shardsRequired: 10,
  
  mode3x3: {
    // 2 adjacent NFT-tier symbols + 1 side symbol
    // Occurs ~5-10% of spins depending on symbol weights
    sideComboShardChance: {
      S: 0.01,   // 1% when pattern detected
      A: 0.03,   // 3%
      B: 0.08,   // 8%
      C: 0.15    // 15%
    },
    
    // Pair on border + Wild nearby
    // Occurs ~2-4% of spins
    edgeComboShardChance: {
      S: 0.005,  // 0.5%
      A: 0.02,   // 2%
      B: 0.05,   // 5%
      C: 0.10    // 10%
    },
    
    // 2 diagonal + adjacent Wild
    // Occurs ~1-3% of spins
    diagonalPairShardChance: {
      S: 0.003,  // 0.3%
      A: 0.01,   // 1%
      B: 0.03,   // 3%
      C: 0.08    // 8%
    }
  },
  
  mode5x5: {
    // 4 orthogonally connected symbols
    // Occurs ~8-12% of spins
    cluster4ShardChance: {
      S: 0.005,  // 0.5%
      A: 0.02,   // 2%
      B: 0.10,   // 10%
      C: 0.25    // 25%
    },
    
    // 5 connected symbols
    // Occurs ~3-5% of spins
    cluster5ShardChance: {
      S: 0.01,   // 1%
      A: 0.05,   // 5%
      B: 0.15,   // 15%
      C: 0.30    // 30%
    },
    
    // 6+ connected symbols
    // Occurs ~1-2% of spins
    cluster6PlusShardChance: {
      S: 0.02,   // 2%
      A: 0.08,   // 8%
      B: 0.20,   // 20%
      C: 0.40    // 40%
    },
    
    // Per cascade chain reaction (optional feature)
    cascadeShardChance: {
      S: 0.001,  // 0.1% per cascade
      A: 0.005,  // 0.5%
      B: 0.01,   // 1%
      C: 0.03    // 3%
    }
  },
  
  // Shop prices (USDT per shard)
  // Priced so full NFT purchase > expected grind value
  shopPrices: {
    S: 50,   // $500 to buy full NFT
    A: 20,   // $200
    B: 10,   // $100
    C: 5     // $50
  },
  
  // Expected monetary value per shard (for RTP calculation)
  shardValueCoefficients: {
    S: 10,   // $10 value per Tier S shard
    A: 5,    // $5
    B: 2,    // $2
    C: 1     // $1
  }
};

/**
 * Shard Economy Manager
 */
export class ShardEconomy {
  private config: ShardConfig;

  constructor(config: ShardConfig = DEFAULT_SHARD_CONFIG) {
    this.config = config;
  }

  /**
   * Detect shard-earning patterns in 3x3 grid
   * 
   * PATTERNS:
   * 1. Side combo: [A][A][X] or [X][A][A] (horizontal/vertical)
   * 2. Edge combo: Pair on border + Wild within 1 cell
   * 3. Diagonal pair: 2 on diagonal + Wild adjacent
   * 
   * @param symbols - Flat array of 9 symbols (3x3 grid)
   * @param nftTierSymbols - Map of symbol ID to NFT tier
   * @param wildSymbolId - ID of Wild/FREE symbol
   */
  detectPatterns3x3(
    symbols: Array<{ id: string; imageUrl: string }>,
    nftTierSymbols: Map<string, NftTier>,
    wildSymbolId: string = "free-spin"
  ): PatternDetection {
    const result: PatternDetection = {
      hasSideCombo: false,
      sideComboTiers: [],
      hasEdgeCombo: false,
      edgeComboTiers: [],
      hasDiagonalPair: false,
      diagonalPairTiers: [],
      clusters: []
    };

    if (symbols.length !== 9) return result;

    const isNftTier = (idx: number) => nftTierSymbols.has(symbols[idx]?.id);
    const getTier = (idx: number) => nftTierSymbols.get(symbols[idx]?.id);
    const isWild = (idx: number) => symbols[idx]?.id === wildSymbolId || symbols[idx]?.imageUrl === "/free.jpg";
    const matches = (a: number, b: number) => 
      symbols[a]?.id === symbols[b]?.id || isWild(a) || isWild(b);

    // 1. Side combo detection
    // Horizontal patterns: [A][A][X] or [X][A][A]
    const horizontalRows = [[0,1,2], [3,4,5], [6,7,8]];
    for (const row of horizontalRows) {
      // Pattern: [A][A][X]
      if (isNftTier(row[0]) && matches(row[0], row[1])) {
        result.hasSideCombo = true;
        const tier = getTier(row[0]);
        if (tier) result.sideComboTiers.push(tier);
      }
      // Pattern: [X][A][A]
      if (isNftTier(row[1]) && matches(row[1], row[2])) {
        result.hasSideCombo = true;
        const tier = getTier(row[1]);
        if (tier) result.sideComboTiers.push(tier);
      }
    }

    // Vertical patterns
    const verticalCols = [[0,3,6], [1,4,7], [2,5,8]];
    for (const col of verticalCols) {
      if (isNftTier(col[0]) && matches(col[0], col[1])) {
        result.hasSideCombo = true;
        const tier = getTier(col[0]);
        if (tier) result.sideComboTiers.push(tier);
      }
      if (isNftTier(col[1]) && matches(col[1], col[2])) {
        result.hasSideCombo = true;
        const tier = getTier(col[1]);
        if (tier) result.sideComboTiers.push(tier);
      }
    }

    // 2. Edge combo detection (pair on border + Wild nearby)
    const edges = [0, 1, 2, 3, 5, 6, 7, 8]; // Border positions
    const neighbors = (pos: number): number[] => {
      const row = Math.floor(pos / 3);
      const col = pos % 3;
      const n: number[] = [];
      if (row > 0) n.push(pos - 3);
      if (row < 2) n.push(pos + 3);
      if (col > 0) n.push(pos - 1);
      if (col < 2) n.push(pos + 1);
      return n;
    };

    for (let i = 0; i < edges.length - 1; i++) {
      const pos1 = edges[i];
      for (let j = i + 1; j < edges.length; j++) {
        const pos2 = edges[j];
        
        if (isNftTier(pos1) && matches(pos1, pos2)) {
          // Check if Wild is nearby
          const near1 = neighbors(pos1);
          const near2 = neighbors(pos2);
          const allNear = [...near1, ...near2];
          
          if (allNear.some(n => isWild(n))) {
            result.hasEdgeCombo = true;
            const tier = getTier(pos1);
            if (tier) result.edgeComboTiers.push(tier);
          }
        }
      }
    }

    // 3. Diagonal pair detection
    const diag1 = [0, 4, 8];
    const diag2 = [2, 4, 6];
    
    for (const diag of [diag1, diag2]) {
      for (let i = 0; i < diag.length - 1; i++) {
        const pos1 = diag[i];
        const pos2 = diag[i + 1];
        
        if (isNftTier(pos1) && matches(pos1, pos2)) {
          const near = [...neighbors(pos1), ...neighbors(pos2)];
          if (near.some(n => isWild(n))) {
            result.hasDiagonalPair = true;
            const tier = getTier(pos1);
            if (tier) result.diagonalPairTiers.push(tier);
          }
        }
      }
    }

    return result;
  }

  /**
   * Award shards based on detected patterns
   * 
   * LOGIC:
   * - For each detected pattern type, roll probability for each tier
   * - Multiple patterns can award multiple shards in one spin
   * - Returns array of shard awards for transaction logging
   * 
   * @param patterns - Detected patterns from grid
   * @param mode - "3x3" or "5x5"
   * @returns Array of shard awards
   */
  awardShards(patterns: PatternDetection, mode: "3x3" | "5x5"): ShardAward[] {
    const awards: ShardAward[] = [];

    if (mode === "3x3") {
      // Side combo shards
      if (patterns.hasSideCombo) {
        for (const tier of patterns.sideComboTiers) {
          const chance = this.config.mode3x3.sideComboShardChance[tier];
          if (Math.random() < chance) {
            awards.push({ tier, count: 1, source: "sideCombo" });
          }
        }
      }

      // Edge combo shards
      if (patterns.hasEdgeCombo) {
        for (const tier of patterns.edgeComboTiers) {
          const chance = this.config.mode3x3.edgeComboShardChance[tier];
          if (Math.random() < chance) {
            awards.push({ tier, count: 1, source: "edgeCombo" });
          }
        }
      }

      // Diagonal pair shards
      if (patterns.hasDiagonalPair) {
        for (const tier of patterns.diagonalPairTiers) {
          const chance = this.config.mode3x3.diagonalPairShardChance[tier];
          if (Math.random() < chance) {
            awards.push({ tier, count: 1, source: "diagonalPair" });
          }
        }
      }
    } else if (mode === "5x5") {
      // Cluster-based shards
      for (const cluster of patterns.clusters) {
        let chances: ShardDropRates;
        let source: string;

        if (cluster.size >= 6) {
          chances = this.config.mode5x5.cluster6PlusShardChance;
          source = "cluster6Plus";
        } else if (cluster.size === 5) {
          chances = this.config.mode5x5.cluster5ShardChance;
          source = "cluster5";
        } else if (cluster.size === 4) {
          chances = this.config.mode5x5.cluster4ShardChance;
          source = "cluster4";
        } else {
          continue;
        }

        const chance = chances[cluster.tier];
        if (Math.random() < chance) {
          // Larger clusters award more shards
          const count = cluster.size >= 6 ? 2 : 1;
          awards.push({ tier: cluster.tier, count, source });
        }
      }
    }

    return awards;
  }

  /**
   * Calculate expected value of shards for RTP
   * 
   * FORMULA:
   * EV_shard = shard_value × drop_probability × pattern_frequency
   * 
   * This contributes to total RTP alongside regular wins
   * 
   * @param mode - "3x3" or "5x5"
   * @param patternFrequencies - Estimated % of spins with each pattern
   * @returns Expected value per spin from shards
   */
  calculateShardExpectedValue(
    mode: "3x3" | "5x5",
    patternFrequencies: {
      sideCombo?: number;
      edgeCombo?: number;
      diagonalPair?: number;
      cluster4?: number;
      cluster5?: number;
      cluster6Plus?: number;
    }
  ): number {
    let totalEV = 0;

    if (mode === "3x3") {
      // Side combo EV
      if (patternFrequencies.sideCombo) {
        for (const tier of ["S", "A", "B", "C"] as NftTier[]) {
          const dropChance = this.config.mode3x3.sideComboShardChance[tier];
          const shardValue = this.config.shardValueCoefficients[tier];
          totalEV += patternFrequencies.sideCombo * dropChance * shardValue;
        }
      }

      // Edge combo EV
      if (patternFrequencies.edgeCombo) {
        for (const tier of ["S", "A", "B", "C"] as NftTier[]) {
          const dropChance = this.config.mode3x3.edgeComboShardChance[tier];
          const shardValue = this.config.shardValueCoefficients[tier];
          totalEV += patternFrequencies.edgeCombo * dropChance * shardValue;
        }
      }

      // Diagonal pair EV
      if (patternFrequencies.diagonalPair) {
        for (const tier of ["S", "A", "B", "C"] as NftTier[]) {
          const dropChance = this.config.mode3x3.diagonalPairShardChance[tier];
          const shardValue = this.config.shardValueCoefficients[tier];
          totalEV += patternFrequencies.diagonalPair * dropChance * shardValue;
        }
      }
    } else if (mode === "5x5") {
      // Cluster EV calculations
      const clusterTypes = [
        { freq: patternFrequencies.cluster4, chances: this.config.mode5x5.cluster4ShardChance, mult: 1 },
        { freq: patternFrequencies.cluster5, chances: this.config.mode5x5.cluster5ShardChance, mult: 1 },
        { freq: patternFrequencies.cluster6Plus, chances: this.config.mode5x5.cluster6PlusShardChance, mult: 2 }
      ];

      for (const { freq, chances, mult } of clusterTypes) {
        if (freq) {
          for (const tier of ["S", "A", "B", "C"] as NftTier[]) {
            const dropChance = chances[tier];
            const shardValue = this.config.shardValueCoefficients[tier];
            totalEV += freq * dropChance * shardValue * mult;
          }
        }
      }
    }

    return totalEV;
  }

  /**
   * Check if player can redeem shards for NFT
   * 
   * @param balance - Player's current shard balance
   * @param tier - NFT tier to mint
   * @returns True if player has enough shards
   */
  canRedeemNFT(balance: ShardBalance, tier: NftTier): boolean {
    return balance[tier] >= this.config.shardsRequired;
  }

  /**
   * Redeem shards to mint NFT
   * 
   * IMPORTANT: This returns the new balance but does NOT perform
   * the actual NFT minting. Caller must handle NFT creation separately.
   * 
   * @param balance - Current shard balance
   * @param tier - Tier to redeem
   * @returns New balance after redemption, or null if insufficient shards
   */
  redeemShards(balance: ShardBalance, tier: NftTier): ShardBalance | null {
    if (!this.canRedeemNFT(balance, tier)) {
      return null;
    }

    return {
      ...balance,
      [tier]: balance[tier] - this.config.shardsRequired
    };
  }

  /**
   * Get shop price for one shard
   * 
   * @param tier - Shard tier
   * @returns Price in tokens (e.g., USDT)
   */
  getShopPrice(tier: NftTier): number {
    return this.config.shopPrices[tier];
  }

  /**
   * Get shards required to mint NFT
   */
  getShardsRequired(): number {
    return this.config.shardsRequired;
  }

  /**
   * Get configuration (for transparency/debugging)
   */
  getConfig(): ShardConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (operator control)
   */
  updateConfig(newConfig: Partial<ShardConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
