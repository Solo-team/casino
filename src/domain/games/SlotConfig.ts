/**
 * Slot Configuration System
 * 
 * Central configuration for all slot parameters. Operators can modify these
 * values to tune RTP, volatility, and NFT/shard economics.
 * 
 * TRANSPARENCY:
 * - All probabilities are explicit and documented
 * - No hidden mechanics or player manipulation
 * - Changes affect all players equally (fair system)
 * 
 * RTP CALCULATION:
 * RTP = (Win_EV + Shard_EV + NFT_EV) / Spin_Cost
 * 
 * Where:
 * - Win_EV = Σ(outcome_prob × payout)
 * - Shard_EV = Σ(pattern_freq × shard_drop_prob × shard_value)
 * - NFT_EV = Σ(nft_drop_prob × nft_value)
 */

import { ShardConfig } from "./ShardEconomy";

export interface Mode3x3Config {
  // Outcome probabilities (must sum to ≤ 1.0)
  deadSpin: number;           // No win
  smallWin: number;           // 1.2x - 3x
  mediumWin: number;          // 3x - 10x
  bigWin: number;             // 10x - 50x
  epicWin: number;            // 50x - 100x
  directNftTotal: number;     // Sum of all tier direct drops
  multiplierChance: number;   // Chance of multiplier appearing
  
  // Payout ranges
  smallWinRange: [number, number];
  mediumWinRange: [number, number];
  bigWinRange: [number, number];
  epicWinRange: [number, number];
  
  // Shard mechanics (inherited from ShardConfig)
  shardMechanics: {
    shardsRequired: number;
    estimatedPatternFrequencies: {
      sideCombo: number;      // % of spins
      edgeCombo: number;
      diagonalPair: number;
    };
  };
}

export interface Mode5x5Config {
  deadSpin: number;
  smallWin: number;
  mediumWin: number;
  bigWin: number;
  epicWin: number;
  directNftTotal: number;
  multiplierChance: number;
  
  smallWinRange: [number, number];
  mediumWinRange: [number, number];
  bigWinRange: [number, number];
  epicWinRange: [number, number];
  
  shardMechanics: {
    shardsRequired: number;
    estimatedPatternFrequencies: {
      cluster4: number;
      cluster5: number;
      cluster6Plus: number;
    };
  };
}

export interface NftTierDropRates {
  S: number;  // Ultra rare
  A: number;  // Rare
  B: number;  // Uncommon
  C: number;  // Common
}

export interface PricingConfig {
  model: "fixed" | "fund-based" | "hybrid";
  
  // Fixed model
  basePrice: number;          // Base cost per spin (USDT)
  
  // Fund-based model
  fundFactor: number;         // Multiplier for prize fund
  
  // Fund contribution
  fundContributionPercent: number;  // % of spin cost added to fund
  
  // Currency
  currency: string;
}

export interface SlotSystemConfig {
  // Global RTP target
  targetRTP: number;          // 0.965 = 96.5%
  
  // Volatility affects win distribution
  volatility: "low" | "medium" | "high";
  
  // Mode-specific configurations
  mode3x3: Mode3x3Config;
  mode5x5: Mode5x5Config;
  
  // NFT tier drop rates (direct drops only)
  nftDirectDropRates: {
    mode3x3: NftTierDropRates;
    mode5x5: NftTierDropRates;
  };
  
  // Shard system configuration
  shardConfig: ShardConfig;
  
  // Pricing model
  pricing: PricingConfig;
  
  // Multiplier weights (from /public/*.svg files)
  multiplierWeights: {
    [key: number]: number;  // e.g., 2: 100, 3: 80, etc.
  };
}

/**
 * Default Configuration
 * 
 * TUNING NOTES:
 * - RTP 96.5% is industry standard (fair to players)
 * - Dead spin rates prevent excessive wins (sustainability)
 * - Shard mechanics provide achievable progression
 * - Direct NFT drops remain rare (special events)
 */
export const DEFAULT_SLOT_CONFIG: SlotSystemConfig = {
  targetRTP: 0.965,
  volatility: "medium",
  
  mode3x3: {
    // Outcome distribution
    deadSpin: 0.541,       // 54.1%
    smallWin: 0.26,        // 26%
    mediumWin: 0.11,       // 11%
    bigWin: 0.035,         // 3.5%
    epicWin: 0.005,        // 0.5%
    directNftTotal: 0.009, // 0.9% (distributed across tiers)
    multiplierChance: 0.04,// 4%
    
    // Payout ranges (multipliers of bet)
    smallWinRange: [0.42, 1.05],  // avg 0.735x
    mediumWinRange: [1.05, 4.0],  // avg 2.525x
    bigWinRange: [4.0, 12.5],     // avg 8.25x
    epicWinRange: [12.5, 43],     // avg 27.75x
    
    shardMechanics: {
      shardsRequired: 10,
      estimatedPatternFrequencies: {
        sideCombo: 0.08,    // 8% of spins
        edgeCombo: 0.03,    // 3%
        diagonalPair: 0.02  // 2%
      }
    }
  },
  
  mode5x5: {
    deadSpin: 0.599,       // 59.9%
    smallWin: 0.22,        // 22%
    mediumWin: 0.095,      // 9.5%
    bigWin: 0.045,         // 4.5%
    epicWin: 0.005,        // 0.5%
    directNftTotal: 0.006, // 0.6%
    multiplierChance: 0.03,// 3%
    
    smallWinRange: [0.42, 1.05],
    mediumWinRange: [1.05, 4.0],
    bigWinRange: [4.0, 12.5],
    epicWinRange: [12.5, 43],
    
    shardMechanics: {
      shardsRequired: 10,
      estimatedPatternFrequencies: {
        cluster4: 0.10,     // 10% of spins
        cluster5: 0.04,     // 4%
        cluster6Plus: 0.015 // 1.5%
      }
    }
  },
  
  // Direct NFT drop rates by tier
  nftDirectDropRates: {
    mode3x3: {
      S: 0.0001,  // 0.01% (1 in 10,000 spins)
      A: 0.0005,  // 0.05% (1 in 2,000 spins)
      B: 0.002,   // 0.2%  (1 in 500 spins)
      C: 0.006    // 0.6%  (1 in 167 spins)
    },
    mode5x5: {
      S: 0.00005, // 0.005% (1 in 20,000 spins)
      A: 0.0002,  // 0.02%  (1 in 5,000 spins)
      B: 0.001,   // 0.1%   (1 in 1,000 spins)
      C: 0.004    // 0.4%   (1 in 250 spins)
    }
  },
  
  // Shard configuration (imported from ShardEconomy)
  shardConfig: {
    shardsRequired: 10,
    
    mode3x3: {
      sideComboShardChance: { S: 0.01, A: 0.03, B: 0.08, C: 0.15 },
      edgeComboShardChance: { S: 0.005, A: 0.02, B: 0.05, C: 0.10 },
      diagonalPairShardChance: { S: 0.003, A: 0.01, B: 0.03, C: 0.08 }
    },
    
    mode5x5: {
      cluster4ShardChance: { S: 0.005, A: 0.02, B: 0.10, C: 0.25 },
      cluster5ShardChance: { S: 0.01, A: 0.05, B: 0.15, C: 0.30 },
      cluster6PlusShardChance: { S: 0.02, A: 0.08, B: 0.20, C: 0.40 },
      cascadeShardChance: { S: 0.001, A: 0.005, B: 0.01, C: 0.03 }
    },
    
    shopPrices: { S: 50, A: 20, B: 10, C: 5 },
    shardValueCoefficients: { S: 10, A: 5, B: 2, C: 1 }
  },
  
  pricing: {
    model: "hybrid",
    basePrice: 0.5,
    fundFactor: 0.003,
    fundContributionPercent: 0.03,
    currency: "USDT"
  },
  
  // Multiplier symbol weights (from /public/2.txt - 9.txt)
  multiplierWeights: {
    2: 100,  // Most common
    3: 80,
    4: 50,
    5: 35,
    6: 20,
    7: 10,
    8: 5,
    9: 2     // Rarest
  }
};

/**
 * Configuration Validator
 * Ensures probabilities are valid and RTP is achievable
 */
export class ConfigValidator {
  /**
   * Validate probability distribution sums to ≤ 1.0
   */
  static validateProbabilities(config: Mode3x3Config | Mode5x5Config): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const sum = config.deadSpin + config.smallWin + config.mediumWin + 
                config.bigWin + config.epicWin + config.directNftTotal + 
                config.multiplierChance;
    
    if (sum > 1.0) {
      errors.push(`Probability sum ${sum.toFixed(4)} exceeds 1.0`);
    }
    
    if (config.deadSpin < 0 || config.deadSpin > 1) {
      errors.push(`Dead spin probability ${config.deadSpin} out of range [0,1]`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Estimate theoretical RTP for configuration
   * 
   * FORMULA:
   * RTP = (Avg_Win × Hit_Rate + Shard_EV + NFT_EV) / Spin_Cost
   * 
   * This is a simplified calculation. Full RTP requires simulation.
   */
  static estimateRTP(
    config: SlotSystemConfig,
    mode: "3x3" | "5x5"
  ): { estimatedRTP: number; breakdown: Record<string, number> } {
    const modeConfig = mode === "3x3" ? config.mode3x3 : config.mode5x5;
    const spinCost = config.pricing.basePrice;
    
    // Calculate average win payout
    const avgSmallWin = (modeConfig.smallWinRange[0] + modeConfig.smallWinRange[1]) / 2;
    const avgMediumWin = (modeConfig.mediumWinRange[0] + modeConfig.mediumWinRange[1]) / 2;
    const avgBigWin = (modeConfig.bigWinRange[0] + modeConfig.bigWinRange[1]) / 2;
    const avgEpicWin = (modeConfig.epicWinRange[0] + modeConfig.epicWinRange[1]) / 2;
    
    const winEV = (
      modeConfig.smallWin * avgSmallWin +
      modeConfig.mediumWin * avgMediumWin +
      modeConfig.bigWin * avgBigWin +
      modeConfig.epicWin * avgEpicWin
    ) * spinCost;
    
    // Estimate shard EV (simplified)
    let shardEV = 0;
    if (mode === "3x3") {
      const freq3x3 = modeConfig.shardMechanics.estimatedPatternFrequencies as {
        sideCombo: number;
        edgeCombo: number;
        diagonalPair: number;
      };
      shardEV = (freq3x3.sideCombo * 0.1 + freq3x3.edgeCombo * 0.05 + freq3x3.diagonalPair * 0.03) * 2;
    } else {
      const freq5x5 = modeConfig.shardMechanics.estimatedPatternFrequencies as {
        cluster4: number;
        cluster5: number;
        cluster6Plus: number;
      };
      shardEV = (freq5x5.cluster4 * 0.15 + freq5x5.cluster5 * 0.2 + freq5x5.cluster6Plus * 0.3) * 2.5;
    }
    
    // Estimate NFT EV (simplified, assuming avg NFT value $100)
    const nftDropRates = mode === "3x3" ? config.nftDirectDropRates.mode3x3 : config.nftDirectDropRates.mode5x5;
    const avgNFTValue = 100; // Placeholder
    const nftEV = (nftDropRates.S + nftDropRates.A + nftDropRates.B + nftDropRates.C) * avgNFTValue;
    
    const totalReturn = winEV + shardEV + nftEV;
    const estimatedRTP = totalReturn / spinCost;
    
    return {
      estimatedRTP,
      breakdown: {
        winEV: Number(winEV.toFixed(4)),
        shardEV: Number(shardEV.toFixed(4)),
        nftEV: Number(nftEV.toFixed(4)),
        totalReturn: Number(totalReturn.toFixed(4)),
        spinCost
      }
    };
  }

  /**
   * Validate full configuration
   */
  static validate(config: SlotSystemConfig): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate mode probabilities
    const mode3x3Check = this.validateProbabilities(config.mode3x3);
    errors.push(...mode3x3Check.errors.map(e => `3x3: ${e}`));
    
    const mode5x5Check = this.validateProbabilities(config.mode5x5);
    errors.push(...mode5x5Check.errors.map(e => `5x5: ${e}`));
    
    // Check RTP targets
    const rtp3x3 = this.estimateRTP(config, "3x3");
    const rtp5x5 = this.estimateRTP(config, "5x5");
    
    if (Math.abs(rtp3x3.estimatedRTP - config.targetRTP) > 0.05) {
      warnings.push(`3x3 estimated RTP ${(rtp3x3.estimatedRTP * 100).toFixed(2)}% differs from target ${(config.targetRTP * 100).toFixed(2)}%`);
    }
    
    if (Math.abs(rtp5x5.estimatedRTP - config.targetRTP) > 0.05) {
      warnings.push(`5x5 estimated RTP ${(rtp5x5.estimatedRTP * 100).toFixed(2)}% differs from target ${(config.targetRTP * 100).toFixed(2)}%`);
    }
    
    // Validate pricing
    if (config.pricing.basePrice <= 0) {
      errors.push("Base price must be positive");
    }
    
    if (config.pricing.fundContributionPercent < 0 || config.pricing.fundContributionPercent > 1) {
      errors.push("Fund contribution % must be between 0 and 1");
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
}

/**
 * Configuration Manager
 * Provides singleton access to configuration with hot-reload support
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: SlotSystemConfig;
  
  private constructor(config: SlotSystemConfig = DEFAULT_SLOT_CONFIG) {
    this.config = config;
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  getConfig(): SlotSystemConfig {
    return { ...this.config };
  }
  
  updateConfig(newConfig: Partial<SlotSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Validate new configuration
    const validation = ConfigValidator.validate(this.config);
    if (!validation.valid) {
      console.error("Configuration validation errors:", validation.errors);
      throw new Error("Invalid configuration");
    }
    
    if (validation.warnings.length > 0) {
      console.warn("Configuration warnings:", validation.warnings);
    }
  }
  
  getModeConfig(mode: "3x3" | "5x5"): Mode3x3Config | Mode5x5Config {
    return mode === "3x3" ? this.config.mode3x3 : this.config.mode5x5;
  }
  
  getShardConfig(): ShardConfig {
    return this.config.shardConfig;
  }
  
  getPricingConfig(): PricingConfig {
    return this.config.pricing;
  }
}
