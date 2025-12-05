/**
 * Advanced Win Pattern System
 * Implements all additional winning combinations beyond basic 3-in-a-row
 * 
 * Categories:
 * 1. Broken three-in-a-row (Wild substitution patterns)
 * 2. Geometric patterns (L-shape, Cross, Corner)
 * 3. Multiple pairs
 * 4. Wild combinations
 */

export interface WinPattern {
  name: string;
  positions: number[];      // Cell indices that must match
  description: string;
  multiplier: number;       // Base payout multiplier
  minGridSize: 3 | 5;      // Minimum grid size required
}

export interface PatternMatch {
  pattern: WinPattern;
  matchedSymbol: string;    // Symbol ID that matched
  positions: number[];
  payout: number;
}

/**
 * 3x3 Grid Layout:
 * [0] [1] [2]
 * [3] [4] [5]
 * [6] [7] [8]
 * 
 * 5x5 Grid Layout:
 * [0]  [1]  [2]  [3]  [4]
 * [5]  [6]  [7]  [8]  [9]
 * [10] [11] [12] [13] [14]
 * [15] [16] [17] [18] [19]
 * [20] [21] [22] [23] [24]
 */

// ============================================================
// BROKEN THREE-IN-A-ROW PATTERNS (Wild substitution)
// ============================================================
export const BROKEN_PATTERNS_3x3: WinPattern[] = [
  // Horizontal broken patterns
  { name: "Top Broken H", positions: [0, 1, 2], description: "A-Wild-A or Wild-A-A", multiplier: 2.25, minGridSize: 3 },
  { name: "Mid Broken H", positions: [3, 4, 5], description: "A-Wild-A or Wild-A-A", multiplier: 2.25, minGridSize: 3 },
  { name: "Bot Broken H", positions: [6, 7, 8], description: "A-Wild-A or Wild-A-A", multiplier: 2.25, minGridSize: 3 },
  
  // Vertical broken patterns
  { name: "Left Broken V", positions: [0, 3, 6], description: "A-Wild-A or Wild-A-A", multiplier: 2.25, minGridSize: 3 },
  { name: "Mid Broken V", positions: [1, 4, 7], description: "A-Wild-A or Wild-A-A", multiplier: 2.25, minGridSize: 3 },
  { name: "Right Broken V", positions: [2, 5, 8], description: "A-Wild-A or Wild-A-A", multiplier: 2.25, minGridSize: 3 },
  
  // Diagonal broken patterns
  { name: "Diag TL-BR Broken", positions: [0, 4, 8], description: "A-Wild-A or Wild-A-A", multiplier: 2.5, minGridSize: 3 },
  { name: "Diag TR-BL Broken", positions: [2, 4, 6], description: "A-Wild-A or Wild-A-A", multiplier: 2.5, minGridSize: 3 }
];

// ============================================================
// GEOMETRIC PATTERNS (3x3)
// ============================================================
export const GEOMETRIC_PATTERNS_3x3: WinPattern[] = [
  // Corner match (all 4 corners same)
  { 
    name: "Four Corners", 
    positions: [0, 2, 6, 8], 
    description: "All corner cells match", 
    multiplier: 5.0, 
    minGridSize: 3 
  },
  
  // Cross pattern (center + 4 edges)
  { 
    name: "Cross Pattern", 
    positions: [1, 3, 4, 5, 7], 
    description: "Center + 4 mid-edges match", 
    multiplier: 10.0, 
    minGridSize: 3 
  },
  
  // L-shapes (multiple orientations)
  { 
    name: "L-Shape TL", 
    positions: [0, 1, 3], 
    description: "Top-left L", 
    multiplier: 1.8, 
    minGridSize: 3 
  },
  { 
    name: "L-Shape TR", 
    positions: [1, 2, 5], 
    description: "Top-right L", 
    multiplier: 1.8, 
    minGridSize: 3 
  },
  { 
    name: "L-Shape BL", 
    positions: [3, 6, 7], 
    description: "Bottom-left L", 
    multiplier: 1.8, 
    minGridSize: 3 
  },
  { 
    name: "L-Shape BR", 
    positions: [5, 7, 8], 
    description: "Bottom-right L", 
    multiplier: 1.8, 
    minGridSize: 3 
  }
];

// ============================================================
// 5x5 EXCLUSIVE PATTERNS
// ============================================================
export const GEOMETRIC_PATTERNS_5x5: WinPattern[] = [
  // Corners
  { 
    name: "Four Corners 5x5", 
    positions: [0, 4, 20, 24], 
    description: "All corner cells match", 
    multiplier: 5.0, 
    minGridSize: 5 
  },
  
  // Cross (larger)
  { 
    name: "Cross 5x5", 
    positions: [2, 7, 11, 12, 13, 17, 22], 
    description: "Large cross pattern", 
    multiplier: 10.0, 
    minGridSize: 5 
  },
  
  // Plus sign (center + 4 adjacent)
  { 
    name: "Plus Sign", 
    positions: [7, 11, 12, 13, 17], 
    description: "Center + 4 adjacent cells", 
    multiplier: 6.0, 
    minGridSize: 5 
  },
  
  // X pattern (both diagonals)
  { 
    name: "X Pattern", 
    positions: [0, 6, 12, 18, 24, 4, 8, 16, 20], 
    description: "Both diagonals match", 
    multiplier: 12.0, 
    minGridSize: 5 
  },
  
  // L-shapes (5-cell versions)
  { 
    name: "Big L TL", 
    positions: [0, 1, 2, 5, 10], 
    description: "Large top-left L", 
    multiplier: 3.5, 
    minGridSize: 5 
  },
  { 
    name: "Big L TR", 
    positions: [2, 3, 4, 9, 14], 
    description: "Large top-right L", 
    multiplier: 3.5, 
    minGridSize: 5 
  },
  { 
    name: "Big L BL", 
    positions: [10, 15, 20, 21, 22], 
    description: "Large bottom-left L", 
    multiplier: 3.5, 
    minGridSize: 5 
  },
  { 
    name: "Big L BR", 
    positions: [14, 19, 22, 23, 24], 
    description: "Large bottom-right L", 
    multiplier: 3.5, 
    minGridSize: 5 
  },
  
  // Box patterns
  { 
    name: "Inner Box", 
    positions: [6, 7, 8, 11, 13, 16, 17, 18], 
    description: "Inner 3x3 box outline", 
    multiplier: 7.0, 
    minGridSize: 5 
  },
  
  // Diamond
  { 
    name: "Diamond", 
    positions: [2, 6, 8, 10, 14, 16, 18, 22], 
    description: "Diamond shape", 
    multiplier: 9.0, 
    minGridSize: 5 
  }
];

// ============================================================
// PATTERN DETECTION ENGINE
// ============================================================

export class WinPatternDetector {
  /**
   * Check if a pattern matches with the given symbols
   * Supports Wild substitution
   */
  static checkPattern(
    symbols: Array<{ id: string; imageUrl: string }>,
    pattern: WinPattern,
    wildSymbolId: string = "/free.jpg"
  ): { matches: boolean; matchedSymbol: string | null } {
    const { positions } = pattern;
    
    // Get symbols at pattern positions
    const patternSymbols = positions.map(pos => symbols[pos]);
    
    // Filter out wilds for base symbol detection
    const nonWildSymbols = patternSymbols.filter(s => s.id !== wildSymbolId);
    
    if (nonWildSymbols.length === 0) {
      // All wilds - this is a match (wilds match everything)
      return { matches: true, matchedSymbol: wildSymbolId };
    }
    
    // Check if all non-wild symbols are identical
    const firstSymbol = nonWildSymbols[0];
    const allMatch = nonWildSymbols.every(s => s.id === firstSymbol.id);
    
    if (allMatch) {
      return { matches: true, matchedSymbol: firstSymbol.id };
    }
    
    return { matches: false, matchedSymbol: null };
  }
  
  /**
   * Check for broken three-in-a-row (2 matching + 1 wild)
   * More lenient than full pattern match
   */
  static checkBrokenPattern(
    symbols: Array<{ id: string; imageUrl: string }>,
    pattern: WinPattern,
    wildSymbolId: string = "/free.jpg"
  ): { matches: boolean; matchedSymbol: string | null } {
    const { positions } = pattern;
    const patternSymbols = positions.map(pos => symbols[pos]);
    
    // Count wilds and non-wilds
    const wilds = patternSymbols.filter(s => s.id === wildSymbolId);
    const nonWilds = patternSymbols.filter(s => s.id !== wildSymbolId);
    
    // Broken pattern: exactly 1 wild + 2 matching symbols
    if (wilds.length === 1 && nonWilds.length === 2) {
      if (nonWilds[0].id === nonWilds[1].id) {
        return { matches: true, matchedSymbol: nonWilds[0].id };
      }
    }
    
    // OR: 2 wilds + 1 symbol (still counts)
    if (wilds.length >= 2) {
      return { matches: true, matchedSymbol: nonWilds[0]?.id ?? wildSymbolId };
    }
    
    return { matches: false, matchedSymbol: null };
  }
  
  /**
   * Detect all matching patterns in a grid
   */
  static detectAllPatterns(
    symbols: Array<{ id: string; imageUrl: string }>,
    gridSize: 3 | 5,
    betAmount: number,
    symbolValues: Map<string, number>
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    
    // Select appropriate pattern sets
    const brokenPatterns = gridSize === 3 ? BROKEN_PATTERNS_3x3 : [];
    const geometricPatterns = gridSize === 3 
      ? GEOMETRIC_PATTERNS_3x3 
      : [...GEOMETRIC_PATTERNS_3x3, ...GEOMETRIC_PATTERNS_5x5];
    
    // Check broken patterns (Wild substitution)
    for (const pattern of brokenPatterns) {
      const result = this.checkBrokenPattern(symbols, pattern);
      if (result.matches && result.matchedSymbol) {
        const symbolValue = symbolValues.get(result.matchedSymbol) ?? 1;
        const payout = betAmount * pattern.multiplier * symbolValue;
        matches.push({
          pattern,
          matchedSymbol: result.matchedSymbol,
          positions: pattern.positions,
          payout
        });
      }
    }
    
    // Check geometric patterns
    for (const pattern of geometricPatterns) {
      if (pattern.minGridSize > gridSize) continue;
      
      const result = this.checkPattern(symbols, pattern);
      if (result.matches && result.matchedSymbol) {
        const symbolValue = symbolValues.get(result.matchedSymbol) ?? 1;
        const payout = betAmount * pattern.multiplier * symbolValue;
        matches.push({
          pattern,
          matchedSymbol: result.matchedSymbol,
          positions: pattern.positions,
          payout
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Check for double pair (two different pairs anywhere)
   */
  static detectDoublePair(
    symbols: Array<{ id: string; imageUrl: string }>,
    wildSymbolId: string = "/free.jpg"
  ): { matches: boolean; pairs: Array<{ symbol: string; positions: number[] }> } {
    const symbolCounts = new Map<string, number[]>();
    
    // Count occurrences
    symbols.forEach((symbol, idx) => {
      if (symbol.id === wildSymbolId) return; // Skip wilds for pair counting
      if (!symbolCounts.has(symbol.id)) {
        symbolCounts.set(symbol.id, []);
      }
      symbolCounts.get(symbol.id)!.push(idx);
    });
    
    // Find pairs (2 or more)
    const pairs: Array<{ symbol: string; positions: number[] }> = [];
    for (const [symbolId, positions] of symbolCounts.entries()) {
      if (positions.length >= 2) {
        pairs.push({ symbol: symbolId, positions: positions.slice(0, 2) });
      }
    }
    
    // Double pair = at least 2 different pairs
    return {
      matches: pairs.length >= 2,
      pairs: pairs.slice(0, 2) // Take first 2 pairs
    };
  }
  
  /**
   * Check for Wild storm (2+ Wilds + any other match)
   */
  static detectWildStorm(
    symbols: Array<{ id: string; imageUrl: string }>,
    wildSymbolId: string = "/free.jpg",
    hasAnyWin: boolean
  ): { matches: boolean; wildCount: number; wildPositions: number[] } {
    const wildPositions: number[] = [];
    
    symbols.forEach((symbol, idx) => {
      if (symbol.id === wildSymbolId) {
        wildPositions.push(idx);
      }
    });
    
    const wildCount = wildPositions.length;
    const matches = wildCount >= 2 && hasAnyWin;
    
    return { matches, wildCount, wildPositions };
  }
}
