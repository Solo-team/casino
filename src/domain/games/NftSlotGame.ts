import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";

export type NftRarity = "common" | "rare" | "legendary";

export interface NftGameSymbol {
  id: string;
  name: string;
  priceLabel: string;
  priceValue: number;
  imageUrl: string;
  rarity: NftRarity;
}

export interface NftSlotConfig {
  id: string;
  name: string;
  sourcePath: string;
  previewImage?: string;
  items: NftGameSymbol[];
  winChance?: number;
  minBet?: number;
  maxBet?: number;
  priceStats?: {
    min: number;
    max: number;
    median: number;
    average: number;
  };
}

type PriceStats = {
  min: number;
  max: number;
  median: number;
  average: number;
};

// Special free spin symbol
const FREE_SPIN_SYMBOL: NftGameSymbol = {
  id: "free-spin",
  name: "FREE SPIN",
  priceLabel: "BONUS",
  priceValue: 0,
  imageUrl: "/free.jpg",
  rarity: "legendary"
};

const DEFAULT_WIN_CHANCE = 0.01;
const DEFAULT_MIN_BET = 5;
const DEFAULT_MAX_BET = 500;

// Free spin chances by count
const FREE_SPIN_1_CHANCE = 0.10;  // 10% for 1 free spin symbol
const FREE_SPIN_2_CHANCE = 0.01;  // 1% for 2 free spin symbols
const FREE_SPIN_3_CHANCE_NORMAL = 0.002; // 0.2% for 3 free spin symbols
const FREE_SPIN_3_CHANCE_IN_FREE = 0.005; // 0.5% for 3 during free spins

const FREE_SPINS_AWARDED = 10;
const FREE_SPINS_RETRIGGER = 3;

export class NftSlotGame implements IGame {
  readonly name: string;
  readonly id: string;
  private readonly sourcePath: string;
  private readonly items: NftGameSymbol[];
  private readonly selectedPool: NftGameSymbol[]; // 10 selected cards
  private readonly previewImage?: string;
  private readonly winChance: number;
  private readonly minBet: number;
  private readonly maxBet: number;
  private readonly priceStats: PriceStats;
  private readonly rarityBreakdown: Record<NftRarity, number>;

  constructor(config: NftSlotConfig) {
    if (!config.items.length) {
      throw new Error(`NFT slot ${config.id} must contain at least one symbol`);
    }

    this.id = config.id;
    this.name = config.name;
    this.sourcePath = config.sourcePath;
    this.items = config.items;
    
    // Select 10 cards: 8 cheap + 2 expensive
    this.selectedPool = this.selectPoolCards(config.items);
    
    this.previewImage = config.previewImage ?? this.items[0]?.imageUrl;
    this.winChance = config.winChance ?? DEFAULT_WIN_CHANCE;
    this.minBet = config.minBet ?? DEFAULT_MIN_BET;
    this.maxBet = config.maxBet ?? DEFAULT_MAX_BET;
    const fallbackStats = this.calculatePriceStats(config.items);
    this.priceStats = {
      min: config.priceStats?.min ?? fallbackStats.min,
      max: config.priceStats?.max ?? fallbackStats.max,
      median: config.priceStats?.median ?? fallbackStats.median,
      average: config.priceStats?.average ?? fallbackStats.average
    };
    this.rarityBreakdown = this.items.reduce<Record<NftRarity, number>>((acc, item) => {
      acc[item.rarity] = (acc[item.rarity] ?? 0) + 1;
      return acc;
    }, { common: 0, rare: 0, legendary: 0 });
  }

  private selectPoolCards(items: NftGameSymbol[]): NftGameSymbol[] {
    if (items.length <= 10) return items;
    
    // Sort by price
    const sorted = [...items].sort((a, b) => a.priceValue - b.priceValue);
    
    // 8 cheapest + 2 most expensive
    const cheap = sorted.slice(0, 8);
    const expensive = sorted.slice(-2);
    
    return [...cheap, ...expensive];
  }

  validateBet(betAmount: number, userBalance: number): boolean {
    return betAmount >= this.minBet && betAmount <= this.maxBet && betAmount <= userBalance;
  }

  getMinBet(): number {
    return this.minBet;
  }

  getMaxBet(): number {
    return this.maxBet;
  }

  // Static spin price: 3% of average NFT price
  getSpinPrice(): number {
    return Number((this.priceStats.average * 0.03).toFixed(4));
  }

  getSummary(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      previewImage: this.previewImage ?? null,
      itemCount: this.items.length,
      winChance: this.winChance,
      spinPrice: this.getSpinPrice(),
      priceStats: this.priceStats,
      rarity: this.rarityBreakdown,
      sourcePath: this.sourcePath,
      // Return selected pool instead of all items
      symbols: this.selectedPool.map(item => ({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        priceLabel: item.priceLabel,
        priceValue: item.priceValue,
        rarity: item.rarity
      }))
    };
  }

  async play(
    userId: string,
    betAmount: number,
    gameData?: Record<string, unknown>
  ): Promise<GameResult> {
    const mode = (gameData?.mode as string) ?? "classic";
    const isFreeSpinMode = Boolean(gameData?.freeSpinMode);
    const cellCount = mode === "expanded" ? 9 : 3;
    
    // Determine how many free spin symbols to show (only in expanded mode)
    let freeSpinCount = 0;
    if (mode === "expanded") {
      const roll = Math.random();
      const chance3 = isFreeSpinMode ? FREE_SPIN_3_CHANCE_IN_FREE : FREE_SPIN_3_CHANCE_NORMAL;
      
      if (roll < chance3) {
        freeSpinCount = 3; // Triggers free spins!
      } else if (roll < chance3 + FREE_SPIN_2_CHANCE) {
        freeSpinCount = 2; // Just visual, no trigger
      } else if (roll < chance3 + FREE_SPIN_2_CHANCE + FREE_SPIN_1_CHANCE) {
        freeSpinCount = 1; // Just visual, no trigger
      }
    }
    
    const triggerFreeSpins = freeSpinCount === 3;
    const shouldMatch = Math.random() < this.winChance;
    const { symbols, freeSpinPositions } = this.spinSymbols(shouldMatch, cellCount, freeSpinCount);
    
    const isWin = shouldMatch;
    const payoutMultiplier = isWin ? this.computeMultiplier(symbols[0]) : 0;
    const effectiveBet = isFreeSpinMode ? 0 : betAmount;
    const payout = isWin ? Number((effectiveBet * payoutMultiplier).toFixed(2)) : 0;

    const result = new GameResult(
      `${this.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      this.name,
      effectiveBet,
      isWin ? GameResultType.WIN : GameResultType.LOSS,
      payout,
      {
        collectionId: this.id,
        collectionName: this.name,
        sourcePath: this.sourcePath,
        symbols,
        matched: isWin,
        chance: this.winChance,
        multiplier: payoutMultiplier,
        priceStats: this.priceStats,
        mode,
        freeSpinsTriggered: triggerFreeSpins,
        freeSpinPositions,
        freeSpinsAwarded: triggerFreeSpins 
          ? (isFreeSpinMode ? FREE_SPINS_RETRIGGER : FREE_SPINS_AWARDED) 
          : 0
      }
    );

    return result;
  }

  private spinSymbols(
    forceMatch: boolean, 
    count: number,
    freeSpinCount: number
  ): { symbols: NftGameSymbol[]; freeSpinPositions: number[] } {
    const freeSpinPositions: number[] = [];
    
    if (forceMatch && count === 3) {
      const selected = this.pickRandomSymbol();
      return { 
        symbols: [selected, selected, selected].map(symbol => ({ ...symbol })),
        freeSpinPositions 
      };
    }

    const picks: NftGameSymbol[] = [];
    
    // For expanded mode with free spin symbols
    if (freeSpinCount > 0 && count === 9) {
      // Place free spin symbols randomly
      const positions = this.getRandomPositions(freeSpinCount, count);
      freeSpinPositions.push(...positions);
      
      for (let i = 0; i < count; i++) {
        if (positions.includes(i)) {
          picks.push({ ...FREE_SPIN_SYMBOL });
        } else {
          picks.push(this.pickRandomSymbol());
        }
      }
      return { symbols: picks, freeSpinPositions };
    }

    // Regular spin
    while (picks.length < count) {
      picks.push(this.pickRandomSymbol());
    }

    // Force match for classic mode
    if (forceMatch && count === 3) {
      const selected = picks[0];
      picks[1] = { ...selected };
      picks[2] = { ...selected };
    }

    // Prevent accidental matches in classic mode when not supposed to win
    if (!forceMatch && count === 3 && this.allSame(picks)) {
      picks[2] = this.pickDifferentSymbol(picks[0].id);
    }

    return { symbols: picks.map(symbol => ({ ...symbol })), freeSpinPositions };
  }

  private getRandomPositions(count: number, total: number): number[] {
    const positions: number[] = [];
    while (positions.length < count) {
      const pos = Math.floor(Math.random() * total);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }
    return positions.sort((a, b) => a - b);
  }

  private pickRandomSymbol(): NftGameSymbol {
    const index = Math.floor(Math.random() * this.selectedPool.length);
    return this.selectedPool[index];
  }

  private pickDifferentSymbol(excludeId: string): NftGameSymbol {
    const alternatives = this.selectedPool.filter(item => item.id !== excludeId);
    if (!alternatives.length) {
      return this.selectedPool[0];
    }
    const index = Math.floor(Math.random() * alternatives.length);
    return alternatives[index];
  }

  private allSame(symbols: NftGameSymbol[]): boolean {
    return symbols.every(symbol => symbol.id === symbols[0].id);
  }

  private computeMultiplier(symbol: NftGameSymbol): number {
    if (!symbol) {
      return 0;
    }
    const { max, min } = this.priceStats;
    const priceSpread = Math.max(1, max - min);
    const relativePrice = (symbol.priceValue - min) / priceSpread;
    const base = 6;
    const bonus = 14 * relativePrice;
    const rarityBoost = symbol.rarity === "legendary" ? 6 : symbol.rarity === "rare" ? 3 : 0;
    const total = base + bonus + rarityBoost;
    return Number(total.toFixed(2));
  }

  private calculatePriceStats(items: NftGameSymbol[]) {
    const values = items.map(item => item.priceValue);
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? min;
    const median = sorted[Math.floor(sorted.length / 2)] ?? min;
    const average = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
    return { min, max, median, average };
  }
}
