/**
 * Paytable System - Theme-based symbol configuration
 * 
 * Provides configurable symbol sets, weights, and payout tables
 * Supports multiple themes with different symbol distributions
 * 
 * FORMULAS:
 * - RTP = Σ(P(combination) × Payout(combination)) / Cost_per_spin
 * - Volatility = Variance in win distribution (std deviation / mean)
 * - Hit Frequency = % of spins resulting in ANY win
 * - Expected Value = Σ(Win_amount × Probability) - Bet_amount
 */

export interface SymbolDefinition {
  id: string;
  name: string;
  weight: number;           // Higher = more common on reels
  payoutMultiplier: number; // Multiplier for matched lines
  rarity: "common" | "rare" | "epic" | "legendary";
  imageUrl?: string;
  isWild?: boolean;         // Can substitute for other symbols
  isScatter?: boolean;      // Pays anywhere, not just on paylines
}

export interface PaylineDefinition {
  id: string;
  positions: number[];      // Grid positions that form this line
  label: string;
}

export interface ThemePaytable {
  themeId: string;
  themeName: string;
  description: string;
  
  // Symbol configuration
  symbols: SymbolDefinition[];
  
  // Payline configuration (depends on grid size)
  paylines3x3: PaylineDefinition[];
  paylines5x5: PaylineDefinition[];
  
  // RTP configuration
  targetRTP: number;        // 0.965 = 96.5%
  volatility: "low" | "medium" | "high";
  hitFrequency: number;     // 0.28 = 28% of spins win
  
  // Special features
  wildSubstitutes: boolean; // Wild replaces other symbols
  wildMultiplier?: number;  // Multiplier when Wild is part of win
  scatterPays: boolean;     // Scatters pay in any position
  
  // Free spin trigger
  freeSpinSymbol?: string;  // Symbol ID that triggers free spins
  freeSpinCount: number;    // Number of free spins awarded
  freeSpinMinSymbols: number; // Min symbols needed to trigger
}

/**
 * CLASSIC THEME - Traditional fruit slot
 */
export const CLASSIC_THEME: ThemePaytable = {
  themeId: "classic",
  themeName: "Classic Fruits",
  description: "Traditional fruit machine with cherries, bars, and sevens",
  
  symbols: [
    { id: "cherry", name: "Cherry", weight: 100, payoutMultiplier: 2, rarity: "common" },
    { id: "lemon", name: "Lemon", weight: 80, payoutMultiplier: 3, rarity: "common" },
    { id: "orange", name: "Orange", weight: 60, payoutMultiplier: 4, rarity: "rare" },
    { id: "plum", name: "Plum", weight: 50, payoutMultiplier: 5, rarity: "rare" },
    { id: "bell", name: "Bell", weight: 30, payoutMultiplier: 8, rarity: "epic" },
    { id: "bar", name: "Bar", weight: 20, payoutMultiplier: 12, rarity: "epic" },
    { id: "seven", name: "Lucky 7", weight: 10, payoutMultiplier: 25, rarity: "legendary" },
    { id: "wild", name: "Wild", weight: 5, payoutMultiplier: 50, rarity: "legendary", isWild: true }
  ],
  
  paylines3x3: [
    { id: "row1", positions: [0, 1, 2], label: "Top Row" },
    { id: "row2", positions: [3, 4, 5], label: "Middle Row" },
    { id: "row3", positions: [6, 7, 8], label: "Bottom Row" }
  ],
  
  paylines5x5: [
    // 5 rows
    { id: "row1", positions: [0, 1, 2, 3, 4], label: "Row 1" },
    { id: "row2", positions: [5, 6, 7, 8, 9], label: "Row 2" },
    { id: "row3", positions: [10, 11, 12, 13, 14], label: "Row 3" },
    { id: "row4", positions: [15, 16, 17, 18, 19], label: "Row 4" },
    { id: "row5", positions: [20, 21, 22, 23, 24], label: "Row 5" },
    // 5 columns
    { id: "col1", positions: [0, 5, 10, 15, 20], label: "Column 1" },
    { id: "col2", positions: [1, 6, 11, 16, 21], label: "Column 2" },
    { id: "col3", positions: [2, 7, 12, 17, 22], label: "Column 3" },
    { id: "col4", positions: [3, 8, 13, 18, 23], label: "Column 4" },
    { id: "col5", positions: [4, 9, 14, 19, 24], label: "Column 5" },
    // 2 diagonals
    { id: "diag1", positions: [0, 6, 12, 18, 24], label: "Diagonal \\" },
    { id: "diag2", positions: [4, 8, 12, 16, 20], label: "Diagonal /" }
  ],
  
  targetRTP: 0.965,
  volatility: "medium",
  hitFrequency: 0.28,
  
  wildSubstitutes: true,
  wildMultiplier: 2,
  scatterPays: false,
  
  freeSpinSymbol: "wild",
  freeSpinCount: 10,
  freeSpinMinSymbols: 3
};

/**
 * EGYPTIAN THEME - Ancient treasures
 */
export const EGYPTIAN_THEME: ThemePaytable = {
  themeId: "egyptian",
  themeName: "Pharaoh's Fortune",
  description: "Ancient Egyptian treasures with scarabs and pyramids",
  
  symbols: [
    { id: "scarab", name: "Scarab", weight: 100, payoutMultiplier: 2.5, rarity: "common" },
    { id: "ankh", name: "Ankh", weight: 80, payoutMultiplier: 3.5, rarity: "common" },
    { id: "eye", name: "Eye of Ra", weight: 60, payoutMultiplier: 5, rarity: "rare" },
    { id: "cat", name: "Sacred Cat", weight: 40, payoutMultiplier: 7, rarity: "rare" },
    { id: "pyramid", name: "Pyramid", weight: 25, payoutMultiplier: 12, rarity: "epic", isScatter: true },
    { id: "pharaoh", name: "Pharaoh", weight: 15, payoutMultiplier: 20, rarity: "epic" },
    { id: "cleopatra", name: "Cleopatra", weight: 8, payoutMultiplier: 35, rarity: "legendary" },
    { id: "sphinx", name: "Sphinx Wild", weight: 3, payoutMultiplier: 100, rarity: "legendary", isWild: true }
  ],
  
  paylines3x3: CLASSIC_THEME.paylines3x3,
  paylines5x5: CLASSIC_THEME.paylines5x5,
  
  targetRTP: 0.968,
  volatility: "high",
  hitFrequency: 0.22,
  
  wildSubstitutes: true,
  wildMultiplier: 3,
  scatterPays: true,
  
  freeSpinSymbol: "pyramid",
  freeSpinCount: 15,
  freeSpinMinSymbols: 3
};

/**
 * SPACE THEME - Cosmic adventure
 */
export const SPACE_THEME: ThemePaytable = {
  themeId: "space",
  themeName: "Galactic Wins",
  description: "Explore the cosmos with planets and stars",
  
  symbols: [
    { id: "moon", name: "Moon", weight: 110, payoutMultiplier: 2, rarity: "common" },
    { id: "mars", name: "Mars", weight: 90, payoutMultiplier: 3, rarity: "common" },
    { id: "saturn", name: "Saturn", weight: 70, payoutMultiplier: 4, rarity: "rare" },
    { id: "jupiter", name: "Jupiter", weight: 50, payoutMultiplier: 6, rarity: "rare" },
    { id: "star", name: "Star", weight: 35, payoutMultiplier: 10, rarity: "epic", isScatter: true },
    { id: "astronaut", name: "Astronaut", weight: 20, payoutMultiplier: 15, rarity: "epic" },
    { id: "ufo", name: "UFO", weight: 10, payoutMultiplier: 30, rarity: "legendary" },
    { id: "black_hole", name: "Black Hole Wild", weight: 4, payoutMultiplier: 75, rarity: "legendary", isWild: true }
  ],
  
  paylines3x3: CLASSIC_THEME.paylines3x3,
  paylines5x5: CLASSIC_THEME.paylines5x5,
  
  targetRTP: 0.963,
  volatility: "low",
  hitFrequency: 0.35,
  
  wildSubstitutes: true,
  wildMultiplier: 2,
  scatterPays: true,
  
  freeSpinSymbol: "star",
  freeSpinCount: 12,
  freeSpinMinSymbols: 3
};

/**
 * Paytable Manager - Access different themes
 */
export class PaytableSystem {
  private static themes = new Map<string, ThemePaytable>([
    [CLASSIC_THEME.themeId, CLASSIC_THEME],
    [EGYPTIAN_THEME.themeId, EGYPTIAN_THEME],
    [SPACE_THEME.themeId, SPACE_THEME]
  ]);

  /**
   * Get paytable for a specific theme
   */
  static getPaytable(themeId: string): ThemePaytable {
    return this.themes.get(themeId) || CLASSIC_THEME;
  }

  /**
   * Get all available themes
   */
  static getAllThemes(): ThemePaytable[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get symbol set for a theme
   */
  static getSymbolSet(themeId: string): SymbolDefinition[] {
    const paytable = this.getPaytable(themeId);
    return paytable.symbols;
  }

  /**
   * Get symbol weights for RNG (normalized)
   */
  static getSymbolWeights(themeId: string): Map<string, number> {
    const symbols = this.getSymbolSet(themeId);
    const weights = new Map<string, number>();
    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);

    for (const symbol of symbols) {
      weights.set(symbol.id, symbol.weight / totalWeight);
    }

    return weights;
  }

  /**
   * Get paylines for specific grid mode
   */
  static getPaylines(themeId: string, mode: "3x3" | "5x5"): PaylineDefinition[] {
    const paytable = this.getPaytable(themeId);
    return mode === "3x3" ? paytable.paylines3x3 : paytable.paylines5x5;
  }

  /**
   * Calculate theoretical RTP for a paytable
   * 
   * Formula:
   * RTP = Σ(P(combination) × Payout(combination)) / Cost_per_spin
   * 
   * Where:
   * - P(combination) = Probability of specific symbol combination
   * - Payout(combination) = Bet × Symbol_multiplier
   * 
   * Example for 3x3 with 3 symbols needed:
   * P(3 cherries) = (weight_cherry / total_weight)^3
   * Payout = Bet × cherry_multiplier
   */
  static calculateTheoreticalRTP(themeId: string, gridSize: "3x3" | "5x5"): number {
    const paytable = this.getPaytable(themeId);
    const symbols = paytable.symbols;
    const paylines = this.getPaylines(themeId, gridSize);
    const symbolsNeeded = gridSize === "3x3" ? 3 : 5;

    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
    let expectedReturn = 0;

    for (const symbol of symbols) {
      // Probability of getting N matching symbols on a payline
      const symbolProb = symbol.weight / totalWeight;
      const lineWinProb = Math.pow(symbolProb, symbolsNeeded);
      
      // Expected payout for this symbol across all paylines
      const payout = symbol.payoutMultiplier;
      expectedReturn += lineWinProb * payout * paylines.length;
    }

    return Math.min(expectedReturn, 1.0); // Cap at 100% RTP
  }

  /**
   * Calculate hit frequency (% of spins with ANY win)
   * 
   * Formula:
   * Hit_Freq = 1 - P(no_wins_on_any_payline)
   * 
   * Where P(no_wins) is calculated by checking all possible outcomes
   */
  static calculateHitFrequency(themeId: string, gridSize: "3x3" | "5x5"): number {
    const paytable = this.getPaytable(themeId);
    const symbols = paytable.symbols;
    const paylines = this.getPaylines(themeId, gridSize);
    const symbolsNeeded = gridSize === "3x3" ? 3 : 5;

    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
    
    // Calculate probability of at least one winning payline
    let noWinProb = 1;
    
    for (const _ of paylines) {
      // Probability of NOT winning on this payline
      let lineNoWinProb = 1;
      
      for (const symbol of symbols) {
        const symbolProb = symbol.weight / totalWeight;
        const lineWinProb = Math.pow(symbolProb, symbolsNeeded);
        lineNoWinProb -= lineWinProb;
      }
      
      noWinProb *= lineNoWinProb;
    }

    return 1 - noWinProb;
  }

  /**
   * Calculate volatility index
   * Higher volatility = bigger variance in payouts
   * 
   * Formula:
   * Volatility = σ / μ (coefficient of variation)
   * 
   * Where:
   * - σ = Standard deviation of payouts
   * - μ = Mean payout
   */
  static calculateVolatility(themeId: string): { index: number; level: string } {
    const symbols = this.getSymbolSet(themeId);
    const multipliers = symbols.map(s => s.payoutMultiplier);
    
    const mean = multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
    const variance = multipliers.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / multipliers.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = stdDev / mean;
    
    let level = "low";
    if (coefficientOfVariation > 2.5) level = "high";
    else if (coefficientOfVariation > 1.5) level = "medium";
    
    return { index: coefficientOfVariation, level };
  }
}
