/**
 * Multiplier Symbol System
 * Uses assets from /public (2.svg - 9.svg) as multiplier symbols
 * 
 * In Pragmatic-style slots, multiplier symbols boost total win
 * Rarity: x2-x3 common, x4-x6 rare, x7-x9 very rare
 */

export interface MultiplierSymbol {
  value: number;          // 2-9
  imageUrl: string;       // Path to SVG file
  weight: number;         // Spawn chance weight
  rarity: "common" | "rare" | "epic";
}

// Multiplier symbol definitions
// Weights calculated from exact drop rates:
// x2=2.0%, x3=1.2%, x4=0.8%, x5=0.5%, x6=0.3%, x7=0.12%, x8=0.04%, x9=0.01%
// Total = 4.97% (normalized to weights)
// NOTE: Using .svg assets as provided in /public.
export const MULTIPLIER_SYMBOLS: MultiplierSymbol[] = [
  { value: 2, imageUrl: "/2.svg", weight: 200, rarity: "common" },   // 2.0%
  { value: 3, imageUrl: "/3.svg", weight: 120, rarity: "common" },   // 1.2%
  { value: 4, imageUrl: "/4.svg", weight: 80, rarity: "rare" },      // 0.8%
  { value: 5, imageUrl: "/5.svg", weight: 50, rarity: "rare" },      // 0.5%
  { value: 6, imageUrl: "/6.svg", weight: 30, rarity: "rare" },      // 0.3%
  { value: 7, imageUrl: "/7.svg", weight: 12, rarity: "epic" },      // 0.12%
  { value: 8, imageUrl: "/8.svg", weight: 4, rarity: "epic" },       // 0.04%
  { value: 9, imageUrl: "/9.svg", weight: 1, rarity: "epic" }        // 0.01%
];

export class MultiplierEngine {
  private static readonly FORCE_MULTIPLIER_SPAWN = false; // Debug flag (off)
  /**
   * Determines if a multiplier should appear on this spin
   * EXACT SPEC:
  * - 3x3 mode: 4% chance per spin
  * - 5x5 mode: 5% chance per spin
  * - Free spins: 1.5x frequency (maintains wow-factor during bonuses)
   * - Multipliers ONLY apply to winning spins (checked by caller)
   */
  static shouldSpawnMultiplier(
    mode: "3x3" | "5x5",
    isFreeSpinMode: boolean = false
  ): boolean {
    if (this.FORCE_MULTIPLIER_SPAWN) {
      return true;
    }
    const baseChance = mode === "5x5" ? 0.05 : 0.04;
    const boostedChance = isFreeSpinMode ? baseChance * 1.5 : baseChance;
    const chance = Math.min(0.95, boostedChance);
    return Math.random() < chance;
  }

  /**
   * Select a random multiplier symbol based on weighted rarity
   * Higher value multipliers are rarer
   */
  static selectMultiplier(): MultiplierSymbol {
    const totalWeight = MULTIPLIER_SYMBOLS.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const mult of MULTIPLIER_SYMBOLS) {
      random -= mult.weight;
      if (random <= 0) {
        return mult;
      }
    }

    // Fallback to x2
    return MULTIPLIER_SYMBOLS[0];
  }

  /**
   * Apply multiplier to base win
   */
  static applyMultiplier(baseWin: number, multiplier: MultiplierSymbol): number {
    return baseWin * multiplier.value;
  }

  /**
   * Apply multiple multipliers multiplicatively
   * EXAMPLE: x2 + x3 = x6, x3 + x5 + x2 = x30, x9 + x9 = x81
   */
  static applyMultipliers(baseWin: number, multipliers: MultiplierSymbol[]): number {
    const totalMultiplier = this.stackMultipliers(multipliers);
    return baseWin * totalMultiplier;
  }

  /**
   * Calculate total multiplier from multiple multipliers (multiplicative)
   */
  static stackMultipliers(multipliers: MultiplierSymbol[]): number {
    return multipliers.reduce((total, mult) => total * mult.value, 1);
  }

  /**
   * Get multiplier by value
   */
  static getMultiplierByValue(value: number): MultiplierSymbol | undefined {
    return MULTIPLIER_SYMBOLS.find(m => m.value === value);
  }

  /**
   * Check if a URL is a multiplier symbol
   */
  static isMultiplierSymbol(imageUrl: string): boolean {
    return MULTIPLIER_SYMBOLS.some(m => m.imageUrl === imageUrl);
  }

  /**
   * Extract multiplier value from image URL
   */
  static getMultiplierValue(imageUrl: string): number | null {
    const mult = MULTIPLIER_SYMBOLS.find(m => m.imageUrl === imageUrl);
    return mult ? mult.value : null;
  }
}
