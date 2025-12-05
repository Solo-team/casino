/**
 * Tokenomics & Pricing System
 * 
 * Provides flexible spin pricing models:
 * - Fixed: Static price per spin
 * - Dynamic: Based on prize fund size
 * - Hybrid: Combination of fixed + dynamic
 * 
 * FORMULAS:
 * 
 * Fixed Model:
 *   C_spin = static_price
 *   Example: 0.5 USDT per spin
 * 
 * Dynamic Model (Fund-based):
 *   C_spin = F_prize × rate
 *   Where:
 *   - F_prize = Current prize fund balance
 *   - rate = 0.003-0.01 (0.3%-1% of fund)
 *   Example: Fund = $10,000 → Spin = $10,000 × 0.005 = $50
 * 
 * Hybrid Model:
 *   C_spin = base_price + (F_prize × rate)
 *   Example: $5 base + ($10,000 × 0.0025) = $5 + $25 = $30
 * 
 * Expected Value (Player perspective):
 *   EV = Σ(Win_amount × P(win)) - C_spin
 *   For fair game: EV should be slightly negative (house edge)
 * 
 * House Edge:
 *   Edge = (1 - RTP) × 100%
 *   Example: RTP 96.5% → Edge = 3.5%
 */

export type PricingModel = "fixed" | "dynamic" | "hybrid";

export interface PricingConfig {
  model: PricingModel;
  
  // Fixed model parameters
  fixedPrice?: number;        // Static price per spin
  
  // Dynamic model parameters
  dynamicRate?: number;       // % of prize fund (0.003-0.01)
  minDynamicPrice?: number;   // Floor price
  maxDynamicPrice?: number;   // Ceiling price
  
  // Hybrid model parameters
  basePrice?: number;         // Fixed component
  fundRate?: number;          // Dynamic component rate
  
  // Optional modifiers
  betMultiplierBonus?: number; // Discount for higher bets
  vipDiscount?: number;       // VIP player discount %
  
  // Currency
  currency: string;           // USDT, TON, etc.
}

export interface PricingMetadata {
  model: PricingModel;
  spinPrice: number;
  breakdown?: {
    baseFee?: number;
    fundFee?: number;
    discount?: number;
  };
  prizeFund?: number;
  currency: string;
  expectedValue: number;      // Player EV for this spin
  houseEdge: number;          // House edge %
}

/**
 * Pricing Calculator
 */
export class PricingSystem {
  /**
   * Calculate spin price based on pricing model
   * 
   * @param config - Pricing configuration
   * @param prizeFund - Current prize fund balance (for dynamic/hybrid)
   * @param betAmount - Player's bet amount
   * @param isVip - Whether player has VIP status
   * @returns Calculated spin price and metadata
   */
  static calculateSpinPrice(
    config: PricingConfig,
    prizeFund: number = 0,
    betAmount: number = 0,
    isVip: boolean = false
  ): PricingMetadata {
    let spinPrice = 0;
    let breakdown: { baseFee?: number; fundFee?: number; discount?: number } = {};

    switch (config.model) {
      case "fixed":
        spinPrice = config.fixedPrice || 0;
        breakdown.baseFee = spinPrice;
        break;

      case "dynamic":
        {
          const rate = config.dynamicRate || 0.005;
          const calculated = prizeFund * rate;
          
          // Apply min/max bounds
          spinPrice = Math.max(
            config.minDynamicPrice || 0,
            Math.min(calculated, config.maxDynamicPrice || Infinity)
          );
          
          breakdown.fundFee = spinPrice;
        }
        break;

      case "hybrid":
        {
          const base = config.basePrice || 0;
          const rate = config.fundRate || 0.0025;
          const fundComponent = prizeFund * rate;
          
          spinPrice = base + fundComponent;
          breakdown.baseFee = base;
          breakdown.fundFee = fundComponent;
        }
        break;
    }

    // Apply bet multiplier bonus (higher bets = lower relative cost)
    if (config.betMultiplierBonus && betAmount > 0) {
      const bonus = betAmount * config.betMultiplierBonus;
      spinPrice = Math.max(0, spinPrice - bonus);
      breakdown.discount = (breakdown.discount || 0) + bonus;
    }

    // Apply VIP discount
    if (isVip && config.vipDiscount) {
      const vipSavings = spinPrice * config.vipDiscount;
      spinPrice = Math.max(0, spinPrice - vipSavings);
      breakdown.discount = (breakdown.discount || 0) + vipSavings;
    }

    // Calculate expected value and house edge
    // Assumes typical RTP of 96.5%
    const rtp = 0.965;
    const expectedReturn = betAmount * rtp;
    const expectedValue = expectedReturn - spinPrice;
    const houseEdge = (1 - rtp) * 100;

    return {
      model: config.model,
      spinPrice: Number(spinPrice.toFixed(4)),
      breakdown,
      prizeFund,
      currency: config.currency,
      expectedValue: Number(expectedValue.toFixed(4)),
      houseEdge: Number(houseEdge.toFixed(2))
    };
  }

  /**
   * Create fixed pricing configuration
   * Simple static price per spin
   */
  static createFixedPricing(price: number, currency: string = "USDT"): PricingConfig {
    return {
      model: "fixed",
      fixedPrice: price,
      currency
    };
  }

  /**
   * Create dynamic pricing configuration
   * Price scales with prize fund
   * 
   * @param rate - Percentage of fund (0.003-0.01 recommended)
   * @param min - Minimum price floor
   * @param max - Maximum price ceiling
   */
  static createDynamicPricing(
    rate: number = 0.005,
    min: number = 1,
    max: number = 1000,
    currency: string = "USDT"
  ): PricingConfig {
    return {
      model: "dynamic",
      dynamicRate: rate,
      minDynamicPrice: min,
      maxDynamicPrice: max,
      currency
    };
  }

  /**
   * Create hybrid pricing configuration
   * Combines fixed base + dynamic fund component
   * 
   * @param basePrice - Fixed component
   * @param fundRate - Fund percentage (0.0025 recommended)
   */
  static createHybridPricing(
    basePrice: number = 5,
    fundRate: number = 0.0025,
    currency: string = "USDT"
  ): PricingConfig {
    return {
      model: "hybrid",
      basePrice,
      fundRate,
      currency
    };
  }

  /**
   * Calculate optimal pricing to achieve target RTP
   * 
   * Formula:
   * Given target_RTP and avg_payout:
   * optimal_price = avg_payout / target_RTP - avg_bet
   * 
   * Example:
   * - Average payout: $100
   * - Target RTP: 96.5%
   * - Average bet: $10
   * - Optimal price: $100 / 0.965 - $10 = $93.62
   */
  static calculateOptimalPrice(
    averagePayout: number,
    averageBet: number,
    targetRTP: number = 0.965
  ): number {
    const totalReturn = averagePayout / targetRTP;
    const optimalPrice = totalReturn - averageBet;
    return Math.max(0, optimalPrice);
  }

  /**
   * Calculate break-even point for prize fund
   * 
   * Formula:
   * Break_even = Total_collected / (1 - target_RTP)
   * 
   * Example:
   * - Collected $10,000 from spins
   * - Target RTP: 96.5%
   * - Break-even fund: $10,000 / (1 - 0.965) = $285,714
   */
  static calculateBreakEven(totalCollected: number, targetRTP: number = 0.965): number {
    const houseEdge = 1 - targetRTP;
    return totalCollected / houseEdge;
  }

  /**
   * Estimate prize fund growth rate
   * 
   * Formula:
   * Growth_rate = (Spins_per_hour × Avg_price × (1 - RTP)) - Avg_payout_per_hour
   * 
   * Positive = fund growing
   * Negative = fund shrinking
   */
  static estimateFundGrowth(
    spinsPerHour: number,
    averagePrice: number,
    averagePayout: number,
    rtp: number = 0.965
  ): { hourlyGrowth: number; dailyGrowth: number; weeklyGrowth: number } {
    const houseEdge = 1 - rtp;
    const income = spinsPerHour * averagePrice;
    const expenses = averagePayout;
    const netHouseProfit = income * houseEdge;
    
    const hourlyGrowth = netHouseProfit - expenses;
    const dailyGrowth = hourlyGrowth * 24;
    const weeklyGrowth = dailyGrowth * 7;

    return {
      hourlyGrowth: Number(hourlyGrowth.toFixed(2)),
      dailyGrowth: Number(dailyGrowth.toFixed(2)),
      weeklyGrowth: Number(weeklyGrowth.toFixed(2))
    };
  }

  /**
   * Calculate player lifetime value (LTV)
   * 
   * Formula:
   * LTV = Avg_bet × Sessions × Spins_per_session × House_edge
   * 
   * Example:
   * - $10 average bet
   * - 50 sessions expected
   * - 100 spins per session
   * - 3.5% house edge
   * - LTV = $10 × 50 × 100 × 0.035 = $1,750
   */
  static calculatePlayerLTV(
    averageBet: number,
    expectedSessions: number,
    spinsPerSession: number,
    rtp: number = 0.965
  ): number {
    const houseEdge = 1 - rtp;
    const totalWagered = averageBet * expectedSessions * spinsPerSession;
    return Number((totalWagered * houseEdge).toFixed(2));
  }

  /**
   * Simulate pricing impact on player behavior
   * Returns estimated player retention and revenue
   * 
   * Based on elasticity: higher prices reduce player activity
   */
  static simulatePricingImpact(
    currentPrice: number,
    newPrice: number,
    currentPlayers: number,
    priceElasticity: number = -1.5 // Typical for gaming
  ): {
    estimatedPlayers: number;
    playerChange: number;
    revenueChange: number;
  } {
    const priceChangePercent = (newPrice - currentPrice) / currentPrice;
    const playerChangePercent = priceChangePercent * priceElasticity;
    
    const estimatedPlayers = Math.max(0, currentPlayers * (1 + playerChangePercent));
    const playerChange = estimatedPlayers - currentPlayers;
    
    const oldRevenue = currentPlayers * currentPrice;
    const newRevenue = estimatedPlayers * newPrice;
    const revenueChange = newRevenue - oldRevenue;

    return {
      estimatedPlayers: Math.round(estimatedPlayers),
      playerChange: Math.round(playerChange),
      revenueChange: Number(revenueChange.toFixed(2))
    };
  }
}

/**
 * Pre-configured pricing presets for common scenarios
 */
export const PRICING_PRESETS = {
  // Low stakes - casual players
  CASUAL: PricingSystem.createFixedPricing(0.5, "USDT"),
  
  // Medium stakes - regular players
  REGULAR: PricingSystem.createHybridPricing(5, 0.0025, "USDT"),
  
  // High stakes - whale players
  HIGH_ROLLER: PricingSystem.createDynamicPricing(0.01, 50, 5000, "USDT"),
  
  // Tournament mode - fixed entry
  TOURNAMENT: PricingSystem.createFixedPricing(25, "USDT"),
  
  // Progressive jackpot - fund-based
  PROGRESSIVE: PricingSystem.createDynamicPricing(0.008, 10, 2000, "USDT")
};
