import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";
import { RTPEngine } from "./RTPEngine";
import { MultiplierEngine, type MultiplierSymbol } from "./MultiplierEngine";
import { ShardEconomy, DEFAULT_SHARD_CONFIG } from "./ShardEconomy";
import { WinPatternDetector } from "./WinPatterns";
import { EVCalculator, type EVBreakdown } from "./EVCalculator";

export type NftRarity = "common" | "rare" | "legendary";

// NFT Tier system for drops
export type NftTier = "S" | "A" | "B" | "C";

export interface NftTierConfig {
  tier: NftTier;
  dropRate: number;        // Probability (0.0001 = 0.01%)
  label: string;
  multiplierBonus: number; // Additional multiplier for this tier
}

export interface NftDropMetadata {
  tier: NftTier;
  nftSymbol: NftGameSymbol;
  bonusMultiplier: number;
  rarity: string;
  cashPayout?: number;
}

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

type DoubleFreeRespinsPlan = {
  enabled: boolean;
  totalRespins: number;
  fakeChance: number;
  realChance: number;
  initialLockedPositions: number[];
  finalLockedPositions: number[];
  sequence: Array<{
    attempt: number;
    addedFreeSpin: boolean;
    addedPosition: number | null;
    fakeNearMiss: boolean;
    lockedPositions: number[];
  }>;
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

// Win chances configuration
const DEFAULT_WIN_CHANCE = 0.02;  // 2% базовый шанс (показываем юзерам)
// Legacy newbie boost constants removed - now handled by RTP Engine

// Near miss rewards
const NEAR_MISS_REFUND = 0.10;    // 10% возврат при near miss

const DEFAULT_MIN_BET = 5;
const DEFAULT_MAX_BET = 500;

// Free spin chances by count
const FREE_SPIN_1_CHANCE = 0.10;  // 10% for 1 free spin symbol
const FREE_SPIN_2_CHANCE = 0.01;  // 1% for 2 free spin symbols

// 3 Wild (FREE) triggers - spec: 1.5% (3x3) / 3% (5x5), doubled in free spins
const FREE_SPIN_3_CHANCE_3X3 = 0.015;         // 1.5% for 3x3 mode
const FREE_SPIN_3_CHANCE_5X5 = 0.03;          // 3.0% for 5x5 mode
const FREE_SPIN_3_CHANCE_IN_FREE_3X3 = 0.03;   // 3.0% during free spins
const FREE_SPIN_3_CHANCE_IN_FREE_5X5 = 0.06;   // 6.0% during free spins

const FREE_SPINS_AWARDED = 10;
const FREE_SPINS_RETRIGGER = 10;
const MAX_FREE_SPINS_CAP = 50; // Prevent infinite free spin chains

// Wild mechanics - EXACT SPEC
const WILD_FREE_SPIN_BONUS = 1;          // +1 free spin per Wild

// Two-adjacent symbol payout - EXACT SPEC
const TWO_ADJACENT_MIN_PAYOUT = 0.10; // 10% of bet
const TWO_ADJACENT_MAX_PAYOUT = 0.20; // 20% of bet

// Double-free respin behavior
const DOUBLE_FREE_RESPIN_COUNT = 2;
const DOUBLE_FREE_REAL_TRIGGER_CHANCE = 0.05;  // 5% chance to land real third FREE
const DOUBLE_FREE_FAKE_ANIM_CHANCE = 0.30;     // 30% chance to show "almost" animation

// Economy protection - EXACT SPEC
const MAX_PAYOUT_MULTIPLIER = 500; // Default: 500× bet cap

// Spin pricing - EXACT SPEC
const SPIN_PRICE_3X3_MIN = 0.2; // USDT
const SPIN_PRICE_3X3_MAX = 0.5;
const SPIN_PRICE_5X5_MIN = 0.3;
const SPIN_PRICE_5X5_MAX = 0.8;

// NFT Tier drop rates (configurable)
const NFT_TIER_CONFIG: NftTierConfig[] = [
  { tier: "S", dropRate: 0.0001, label: "Ultra Rare", multiplierBonus: 10 },   // 0.01%
  { tier: "A", dropRate: 0.0005, label: "Rare", multiplierBonus: 5 },          // 0.05%
  { tier: "B", dropRate: 0.002, label: "Uncommon", multiplierBonus: 2.5 },     // 0.2%
  { tier: "C", dropRate: 0.006, label: "Common", multiplierBonus: 1.5 }        // 0.6%
];

// Structural NFT attempt chance (three-in-row identical NFT symbols)
const NFT_ATTEMPT_MIN = 0.0005; // 0.05%
const NFT_ATTEMPT_MAX = 0.001;  // 0.1%
const NFT_ATTEMPT_SUCCESS = 0.01; // 1% of attempts succeed

// URL validation helper
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    // Check if it's a valid relative URL
    return url.startsWith('/') || url.startsWith('./');
  }
};

export class NftSlotGame implements IGame {
  readonly name: string;
  readonly id: string;
  private readonly sourcePath: string;
  private readonly items: NftGameSymbol[];
  private readonly selectedPool: NftGameSymbol[]; // 10 selected cards
  private readonly selectedPoolImageUrls: Set<string>;
  private readonly rtpEngine: RTPEngine; // RTP system
  private readonly weightedReelStrip: NftGameSymbol[]; // Weighted reel for realistic distribution
  private readonly shardEconomy: ShardEconomy; // Shard drop system
  
  private symbolsEqual(a?: NftGameSymbol, b?: NftGameSymbol): boolean {
    if (!a || !b) return false;
    // Extract base64 hash from GetGems CDN URLs to compare actual image content
    // Format: https://i.getgems.io/<SIG>/rs:fill:500:500:1/g:ce/<BASE64_HASH>
    const getImageHash = (url: string): string => {
      const match = url.match(/\/g:ce\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : url;
    };
    const keyA = getImageHash(a.imageUrl || a.id);
    const keyB = getImageHash(b.imageUrl || b.id);
    return keyA === keyB;
  }
  private readonly previewImage?: string;
  private readonly minBet: number;
  private readonly maxBet: number;
  private readonly priceStats: PriceStats;
  private readonly rarityBreakdown: Record<NftRarity, number>;
  
  // EV-based pricing cache
  private evBreakdown3x3: EVBreakdown | null = null;
  private evBreakdown5x5: EVBreakdown | null = null;

  constructor(config: NftSlotConfig) {
    if (!config.items.length) {
      throw new Error(`NFT slot ${config.id} must contain at least one symbol`);
    }

    this.id = config.id;
    this.name = config.name;
    this.sourcePath = config.sourcePath;
    this.items = config.items;
    
    // Select 10 cards: 8 cheap + 2 expensive; keep only symbols with valid image URLs for spins/UI
    const pool = this.selectPoolCards(config.items);
    const filteredPool = pool.filter(item => isValidImageUrl(item.imageUrl));
    this.selectedPool = filteredPool.length ? filteredPool : pool;
    this.selectedPoolImageUrls = new Set(this.selectedPool.map(item => item.imageUrl));
    
    // Initialize RTP Engine with medium volatility and 96.5% RTP
    this.rtpEngine = new RTPEngine({
      targetRTP: 0.965,
      volatility: "medium",
      hitFrequency: 0.28, // 28% hit rate
      maxMultiplier: 100,
      minMultiplier: 1.2
    });
    
    // Initialize Shard Economy system
    this.shardEconomy = new ShardEconomy(DEFAULT_SHARD_CONFIG);
    
    // Create weighted reel strip for realistic symbol distribution
    this.weightedReelStrip = RTPEngine.createWeightedReelStrip(this.selectedPool, 100);
    
    this.previewImage = config.previewImage ?? this.items[0]?.imageUrl;
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

  /**
   * Calculate EV-based spin price dynamically
   * EXACT SPEC: spinPrice = EV_total / RTP_target
   * 
   * @param mode - "3x3" or "5x5" 
   * @param rtpTarget - Target RTP (default 76% = 24% house edge)
   * @returns Spin price with full EV breakdown
   */
  getSpinPriceWithEV(mode: "3x3" | "5x5" = "3x3", rtpTarget: number = 0.85): EVBreakdown {
    // Use cached calculation if available and RTP matches
    if (mode === "3x3" && this.evBreakdown3x3 && this.evBreakdown3x3.rtpTarget === rtpTarget) {
      return this.evBreakdown3x3;
    }
    if (mode === "5x5" && this.evBreakdown5x5 && this.evBreakdown5x5.rtpTarget === rtpTarget) {
      return this.evBreakdown5x5;
    }
    
    // Calculate EV-based pricing
    const evBreakdown = EVCalculator.getRecommendedSpinPrice(
      mode,
      this.priceStats.average,
      this.minBet,
      rtpTarget
    );
    
    // Cache result
    if (mode === "3x3") {
      this.evBreakdown3x3 = evBreakdown;
    } else {
      this.evBreakdown5x5 = evBreakdown;
    }
    
    return evBreakdown;
  }

  /**
   * Legacy method - returns simple spin price (3% of average NFT price)
   * Use getSpinPriceWithEV() for EV-based calculation
   */
  getSpinPrice(): number {
    return Number((this.priceStats.average * 0.03).toFixed(4));
  }
  
  /**
   * Get dynamic spin price based on mode
   * SIMPLE: 3-5% of average NFT value (much lower than EV calculation)
   */
  getDynamicSpinPrice(mode: "3x3" | "5x5" = "3x3"): number {
    // Simple percentage-based pricing
    const percentage = mode === "5x5" ? 0.05 : 0.03; // 5% for 5x5, 3% for 3x3
    const calculatedPrice = this.priceStats.average * percentage;
    
    // Clamp to configured range
    const minPrice = mode === "5x5" ? SPIN_PRICE_5X5_MIN : SPIN_PRICE_3X3_MIN;
    const maxPrice = mode === "5x5" ? SPIN_PRICE_5X5_MAX : SPIN_PRICE_3X3_MAX;
    
    return Number(Math.max(minPrice, Math.min(maxPrice, calculatedPrice)).toFixed(2));
  }

  getSummary(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      previewImage: this.previewImage ?? null,
      itemCount: this.items.length,
      winChance: DEFAULT_WIN_CHANCE, // Показываем базовые 2% всем юзерам
      spinPrice: this.getSpinPrice(),
      priceStats: this.priceStats,
      rarity: this.rarityBreakdown,
      sourcePath: this.sourcePath,
      // Return selected pool instead of all items, filter invalid URLs
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

  /**
   * Checks if NFT tier drop occurs
   * NEW SPEC: NFT only drops on 5-in-row in 5x5 mode with 1% chance
   * Returns NFT metadata if drop occurs, null otherwise
   */
  private checkNftDrop(allMatchedSymbols: NftGameSymbol[], hasThreeInRow: boolean): NftDropMetadata | null {
    if (!hasThreeInRow || allMatchedSymbols.length === 0) return null;

    // Structural attempt: 0.05% - 0.1% of spins when three-in-row NFT symbols appear
    const attemptChance = NFT_ATTEMPT_MIN + Math.random() * (NFT_ATTEMPT_MAX - NFT_ATTEMPT_MIN);
    if (Math.random() > attemptChance) {
      return null;
    }

    // Actual drop: 1% of attempts
    if (Math.random() > NFT_ATTEMPT_SUCCESS) {
      return null;
    }

    const roll = Math.random();
    let cumulativeProbability = 0;

    // Select tier based on configured rates
    for (const config of NFT_TIER_CONFIG) {
      cumulativeProbability += config.dropRate;
      if (roll < cumulativeProbability) {
        const nftSymbol = allMatchedSymbols.reduce((best, current) => 
          current.priceValue > best.priceValue ? current : best
        );

        return {
          tier: config.tier,
          nftSymbol,
          bonusMultiplier: config.multiplierBonus,
          rarity: config.label
        };
      }
    }

    return null;
  }

  /**
   * Map NftRarity to NftTier for shard economy
   * This provides a loose mapping since rarity and tier are different concepts
   */
  private getNftTierFromRarity(rarity: NftRarity): NftTier | null {
    switch (rarity) {
      case "legendary":
        return "S";
      case "rare":
        return "A";
      case "common":
        return "C";
      default:
        return null;
    }
  }

  // Вычисляет реальный шанс выигрыша в зависимости от количества спинов


  /**
   * Calculate free spin trigger chance based on mode and free spin state
   * EXACT SPEC: 3x3=1.5%, 5x5=3.0%, doubled during free spins
   */
  private calculateFreeSpinTriggerChance(mode: string, isFreeSpinMode: boolean): number {
    const is5x5 = mode === "mode5" || mode === "5x5";
    
    if (isFreeSpinMode) {
      // During free spins: boosted frequency
      return is5x5 ? FREE_SPIN_3_CHANCE_IN_FREE_5X5 : FREE_SPIN_3_CHANCE_IN_FREE_3X3;
    }
    
    // Normal spins
    return is5x5 ? FREE_SPIN_3_CHANCE_5X5 : FREE_SPIN_3_CHANCE_3X3;
  }

  // Проверяет сетку 3x3 на совпадения построчно (верхний, средний, нижний ряды)
  private analyzeGrid(symbols: NftGameSymbol[]): {
    hasWin: boolean;
    hasNearMiss: boolean;
    hasTwoMatch: boolean;
    winningLines?: number[][];
    matchedSymbols?: NftGameSymbol[];
    matchedSymbol?: NftGameSymbol;
    nearMissCount?: number;
    nearMissSymbols?: NftGameSymbol[];
  } {
    if (symbols.length !== 9) {
      return { hasWin: false, hasNearMiss: false, hasTwoMatch: false };
    }

    const isFree = (s?: NftGameSymbol) => s?.imageUrl === "/free.jpg";
    const rows = [
      [0, 1, 2], // верхний ряд
      [3, 4, 5], // средний ряд
      [6, 7, 8], // нижний ряд
    ];

    // CONSOLE LOG: выводим структуру сетки
    console.log('\n=== ANALYZE GRID 3x3 ===');
    console.log('Верхний ряд [0,1,2]:', [
      symbols[0]?.imageUrl || symbols[0]?.id,
      symbols[1]?.imageUrl || symbols[1]?.id,
      symbols[2]?.imageUrl || symbols[2]?.id,
    ]);
    console.log('Средний ряд [3,4,5]:', [
      symbols[3]?.imageUrl || symbols[3]?.id,
      symbols[4]?.imageUrl || symbols[4]?.id,
      symbols[5]?.imageUrl || symbols[5]?.id,
    ]);
    console.log('Нижний ряд [6,7,8]:', [
      symbols[6]?.imageUrl || symbols[6]?.id,
      symbols[7]?.imageUrl || symbols[7]?.id,
      symbols[8]?.imageUrl || symbols[8]?.id,
    ]);
    
    // Показываем hash части для проверки равенства
    const getHash = (url?: string) => url ? url.match(/\/g:ce\/([a-zA-Z0-9_-]+)/)?.[1] || url : 'null';
    console.log('\nHASH COMPARISON:');
    console.log('Row 1 hashes:', [getHash(symbols[0]?.imageUrl), getHash(symbols[1]?.imageUrl), getHash(symbols[2]?.imageUrl)]);
    console.log('Row 2 hashes:', [getHash(symbols[3]?.imageUrl), getHash(symbols[4]?.imageUrl), getHash(symbols[5]?.imageUrl)]);
    console.log('Row 3 hashes:', [getHash(symbols[6]?.imageUrl), getHash(symbols[7]?.imageUrl), getHash(symbols[8]?.imageUrl)]);
    console.log('========================\n');

    // Проверяем каждый ряд отдельно - СОБИРАЕМ ВСЕ совпадения
    const winningLines: number[][] = [];
    const matchedSymbols: NftGameSymbol[] = [];
    const nearMissLines: number[][] = []; // Все строки с near-miss
    const nearMissSymbols: NftGameSymbol[] = []; // Символы near-miss для каждой строки

    // Helper: проверка совпадения с учетом FREE wildcard
    const matchesWithWildcard = (a: NftGameSymbol, b: NftGameSymbol): boolean => {
      if (isFree(a) || isFree(b)) return true; // FREE = wildcard
      return this.symbolsEqual(a, b);
    };

    for (const row of rows) {
      const [i0, i1, i2] = row;
      const s0 = symbols[i0];
      const s1 = symbols[i1];
      const s2 = symbols[i2];

      // FREE теперь wildcard, не исключаем из проверки

      // Проверка на полное совпадение (три в ряд) с учетом wildcard
      if (matchesWithWildcard(s0, s1) && matchesWithWildcard(s1, s2)) {
        winningLines.push(row);
        // Для matchedSymbol берем не-FREE символ
        const matchedSym = !isFree(s0) ? s0 : (!isFree(s1) ? s1 : s2);
        matchedSymbols.push(matchedSym);
        continue; // Переходим к следующему ряду
      }

      // Проверка ТОЛЬКО соседних пар (игнорируя если ВСЕ три FREE)
      if (isFree(s0) && isFree(s1) && isFree(s2)) continue;

      const match01 = matchesWithWildcard(s0, s1);
      const match12 = matchesWithWildcard(s1, s2);

      if (match01 || match12) {
        // Собираем ВСЕ near-miss (двойные совпадения)
        nearMissLines.push(row);
        const matchedSym = match01 
          ? (!isFree(s0) ? s0 : s1)
          : (!isFree(s1) ? s1 : s2);
        nearMissSymbols.push(matchedSym);
      }
    }

    // Если есть хотя бы один win
    if (winningLines.length > 0) {
      return {
        hasWin: true,
        hasNearMiss: false,
        hasTwoMatch: false,
        winningLines,
        matchedSymbols, // Все выигрышные символы
        matchedSymbol: matchedSymbols[0], // Первый для обратной совместимости
        nearMissCount: 0,
        nearMissSymbols: [],
      };
    }

    // Если есть near miss строки (2 в ряд)
    if (nearMissLines.length > 0) {
      return {
        hasWin: false,
        hasNearMiss: true,
        hasTwoMatch: true,
        matchedSymbol: nearMissSymbols[0], // Первый для обратной совместимости
        nearMissCount: nearMissLines.length, // Количество near-miss строк
        nearMissSymbols, // Все символы near-miss
      };
    }

    return { hasWin: false, hasNearMiss: false, hasTwoMatch: false, nearMissCount: 0, nearMissSymbols: [] };
  }

  /**
   * Analyzes 5x5 grid (25 symbols) for wins
   * Checks: 5 rows, 5 columns, 2 diagonals, optional cluster wins (5+ adjacent)
   * Returns winning lines, matched symbols, and near-miss info
   */
  private analyzeGrid5x5(symbols: NftGameSymbol[]): {
    hasWin: boolean;
    hasNearMiss: boolean;
    hasTwoMatch: boolean;
    winningLines?: number[][];
    matchedSymbols?: NftGameSymbol[];
    matchedSymbol?: NftGameSymbol;
    nearMissCount?: number;
    nearMissSymbols?: NftGameSymbol[];
    clusterWins?: Array<{ positions: number[]; symbol: NftGameSymbol; size: number }>;
  } {
    if (symbols.length !== 25) {
      return { hasWin: false, hasNearMiss: false, hasTwoMatch: false };
    }

    const isFree = (s?: NftGameSymbol) => s?.imageUrl === "/free.jpg";
    const matchesWithWildcard = (a: NftGameSymbol, b: NftGameSymbol): boolean => {
      if (isFree(a) || isFree(b)) return true;
      return this.symbolsEqual(a, b);
    };

    console.log('\n=== ANALYZE GRID 5x5 ===');
    
    const winningLines: number[][] = [];
    const matchedSymbols: NftGameSymbol[] = [];
    const nearMissLines: number[][] = [];
    const nearMissSymbols: NftGameSymbol[] = [];

    // Define 5x5 paylines
    const rows: number[][] = [];
    const cols: number[][] = [];
    
    // 5 rows
    for (let r = 0; r < 5; r++) {
      rows.push([r*5, r*5+1, r*5+2, r*5+3, r*5+4]);
    }
    
    // 5 columns
    for (let c = 0; c < 5; c++) {
      cols.push([c, c+5, c+10, c+15, c+20]);
    }
    
    // 2 diagonals
    const diag1 = [0, 6, 12, 18, 24];  // Top-left to bottom-right
    const diag2 = [4, 8, 12, 16, 20];  // Top-right to bottom-left
    
    const allLines = [...rows, ...cols, diag1, diag2];

    // Check each line for full match (5 symbols)
    for (const line of allLines) {
      const lineSymbols = line.map(i => symbols[i]);
      
      // Check if all 5 match with wildcard support
      let allMatch = true;
      for (let i = 0; i < lineSymbols.length - 1; i++) {
        if (!matchesWithWildcard(lineSymbols[i], lineSymbols[i + 1])) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) {
        winningLines.push(line);
        const matchedSym = lineSymbols.find(s => !isFree(s)) || lineSymbols[0];
        matchedSymbols.push(matchedSym);
      } else {
        // Check for near-miss (4 out of 5)
        let matchCount = 1;
        for (let i = 0; i < lineSymbols.length - 1; i++) {
          if (matchesWithWildcard(lineSymbols[i], lineSymbols[i + 1])) {
            matchCount++;
          } else {
            break;
          }
        }
        
        if (matchCount >= 4) {
          nearMissLines.push(line);
          const matchedSym = lineSymbols.find(s => !isFree(s)) || lineSymbols[0];
          nearMissSymbols.push(matchedSym);
        }
      }
    }

    // CLUSTER WINS: Find groups of 5+ adjacent matching symbols
    const clusterWins = this.findClusters(symbols, 5, 5);

    console.log(`Found ${winningLines.length} winning lines, ${clusterWins.length} clusters`);
    console.log('========================\n');

    if (winningLines.length > 0 || clusterWins.length > 0) {
      return {
        hasWin: true,
        hasNearMiss: false,
        hasTwoMatch: false,
        winningLines,
        matchedSymbols,
        matchedSymbol: matchedSymbols[0],
        nearMissCount: 0,
        nearMissSymbols: [],
        clusterWins
      };
    }

    if (nearMissLines.length > 0) {
      return {
        hasWin: false,
        hasNearMiss: true,
        hasTwoMatch: true,
        matchedSymbol: nearMissSymbols[0],
        nearMissCount: nearMissLines.length,
        nearMissSymbols,
        clusterWins: []
      };
    }

    return { hasWin: false, hasNearMiss: false, hasTwoMatch: false, nearMissCount: 0, nearMissSymbols: [], clusterWins: [] };
  }

  /**
   * Finds clusters of adjacent matching symbols in grid
   * @param symbols - Flat array of symbols
   * @param gridWidth - Width of grid (5 for 5x5)
   * @param gridHeight - Height of grid (5 for 5x5)
   * @param minSize - Minimum cluster size (default 5)
   */
  private findClusters(
    symbols: NftGameSymbol[],
    gridWidth: number,
    gridHeight: number,
    minSize: number = 5
  ): Array<{ positions: number[]; symbol: NftGameSymbol; size: number }> {
    const visited = new Set<number>();
    const clusters: Array<{ positions: number[]; symbol: NftGameSymbol; size: number }> = [];
    const isFree = (s?: NftGameSymbol) => s?.imageUrl === "/free.jpg";

    const getNeighbors = (pos: number): number[] => {
      const row = Math.floor(pos / gridWidth);
      const col = pos % gridWidth;
      const neighbors: number[] = [];

      // Up, Down, Left, Right
      if (row > 0) neighbors.push(pos - gridWidth);
      if (row < gridHeight - 1) neighbors.push(pos + gridWidth);
      if (col > 0) neighbors.push(pos - 1);
      if (col < gridWidth - 1) neighbors.push(pos + 1);

      return neighbors;
    };

    const floodFill = (startPos: number, targetSymbol: NftGameSymbol): number[] => {
      const cluster: number[] = [];
      const queue = [startPos];

      while (queue.length > 0) {
        const pos = queue.shift()!;
        if (visited.has(pos)) continue;

        const symbol = symbols[pos];
        if (!symbol) continue;

        // Check if matches (with wildcard support)
        const matches = isFree(symbol) || isFree(targetSymbol) || this.symbolsEqual(symbol, targetSymbol);
        if (!matches) continue;

        visited.add(pos);
        cluster.push(pos);

        for (const neighbor of getNeighbors(pos)) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }

      return cluster;
    };

    // Find all clusters
    for (let i = 0; i < symbols.length; i++) {
      if (visited.has(i)) continue;
      const symbol = symbols[i];
      if (!symbol || isFree(symbol)) continue;

      const cluster = floodFill(i, symbol);
      if (cluster.length >= minSize) {
        clusters.push({
          positions: cluster,
          symbol,
          size: cluster.length
        });
      }
    }

    return clusters;
  }

  // Ищет любую тройку одинаковых символов в сетке (по imageUrl), игнорируя free spin
  private findAnyTriple(symbols: NftGameSymbol[]): { found: boolean; symbol?: NftGameSymbol } {
    const counts = new Map<string, { symbol: NftGameSymbol; count: number }>();

    for (const symbol of symbols) {
      if (!symbol || symbol.imageUrl === FREE_SPIN_SYMBOL.imageUrl) continue;
      const key = symbol.imageUrl || symbol.id;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { symbol, count: 1 });
      }
    }

    let chosen: NftGameSymbol | undefined;
    for (const { symbol, count } of counts.values()) {
      if (count >= 3) {
        // выбираем самую дорогую тройку, чтобы множитель был честным
        if (!chosen || symbol.priceValue > chosen.priceValue) {
          chosen = symbol;
        }
      }
    }

    return { found: Boolean(chosen), symbol: chosen };
  }

  /**
   * Find all adjacent pairs of identical symbols (horizontal/vertical)
   * EXACT SPEC: Two identical adjacent symbols → payout 10%-20% of bet
   * FIXED: Now finds ALL pairs in each row, not just first occurrence
   * Example: [A,A,B,A,A] → 2 pairs (0-1 and 3-4)
   */
  private findAdjacentPairs(symbols: NftGameSymbol[], gridSize: 3 | 5): Array<{symbol: NftGameSymbol; positions: number[]}> {
    const pairs: Array<{symbol: NftGameSymbol; positions: number[]}> = [];
    const checked = new Set<string>();

    // HORIZONTAL PAIRS - check each row completely
    const rows = symbols.length / gridSize;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < gridSize - 1; col++) {
        const i = row * gridSize + col;
        const symbol = symbols[i];
        if (!symbol || symbol.imageUrl === FREE_SPIN_SYMBOL.imageUrl) continue;

        const right = symbols[i + 1];
        if (right && right.imageUrl !== FREE_SPIN_SYMBOL.imageUrl && this.symbolsEqual(symbol, right)) {
          const key = `h-${i}-${i + 1}`;
          if (!checked.has(key)) {
            pairs.push({ symbol, positions: [i, i + 1] });
            checked.add(key);
          }
        }
      }
    }

    // VERTICAL PAIRS - check each column
    for (let col = 0; col < gridSize; col++) {
      for (let row = 0; row < rows - 1; row++) {
        const i = row * gridSize + col;
        const symbol = symbols[i];
        if (!symbol || symbol.imageUrl === FREE_SPIN_SYMBOL.imageUrl) continue;

        const bottom = i + gridSize;
        const bottomSymbol = symbols[bottom];
        if (bottomSymbol && bottomSymbol.imageUrl !== FREE_SPIN_SYMBOL.imageUrl && this.symbolsEqual(symbol, bottomSymbol)) {
          const key = `v-${i}-${bottom}`;
          if (!checked.has(key)) {
            pairs.push({ symbol, positions: [i, bottom] });
            checked.add(key);
          }
        }
      }
    }

    return pairs;
  }

  /**
   * Count Wild (FREE) symbols in grid
   * EXACT SPEC: Each Wild awards +1 free spin
   */
  private countWildSymbols(symbols: NftGameSymbol[]): number {
    return symbols.filter(s => s && s.imageUrl === FREE_SPIN_SYMBOL.imageUrl).length;
  }

  private getFreeSymbolPositions(symbols: NftGameSymbol[]): number[] {
    const positions: number[] = [];
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i]?.imageUrl === FREE_SPIN_SYMBOL.imageUrl) {
        positions.push(i);
      }
    }
    return positions;
  }

  private getGridSize(cellCount: number): 3 | 5 {
    return cellCount === 25 ? 5 : 3;
  }

  private planDoubleFreeRespins(
    symbols: NftGameSymbol[],
    initialFreePositions: number[],
    blockedPositions: Set<number>,
    cellCount: number
  ): { plan: DoubleFreeRespinsPlan; freeSpinPositions: number[]; triggerFreeSpins: boolean } | null {
    if (initialFreePositions.length !== 2) {
      return null;
    }

    const lockedSet = new Set<number>(initialFreePositions);
    for (const pos of initialFreePositions) {
      blockedPositions.add(pos);
    }

    const plan: DoubleFreeRespinsPlan = {
      enabled: true,
      totalRespins: DOUBLE_FREE_RESPIN_COUNT,
      fakeChance: DOUBLE_FREE_FAKE_ANIM_CHANCE,
      realChance: DOUBLE_FREE_REAL_TRIGGER_CHANCE,
      initialLockedPositions: [...initialFreePositions].sort((a, b) => a - b),
      finalLockedPositions: [...initialFreePositions].sort((a, b) => a - b),
      sequence: []
    };

    for (let attempt = 1; attempt <= DOUBLE_FREE_RESPIN_COUNT; attempt++) {
      const availablePositions: number[] = [];
      for (let idx = 0; idx < cellCount; idx++) {
        if (lockedSet.has(idx)) continue;
        if (blockedPositions.has(idx)) continue;
        availablePositions.push(idx);
      }

      const canAddFree = availablePositions.length > 0 && Math.random() < DOUBLE_FREE_REAL_TRIGGER_CHANCE;
      let addedPosition: number | null = null;
      if (canAddFree) {
        addedPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
        lockedSet.add(addedPosition);
        blockedPositions.add(addedPosition);
        symbols[addedPosition] = { ...FREE_SPIN_SYMBOL };
      }

      const fakeNearMiss = !canAddFree && Math.random() < DOUBLE_FREE_FAKE_ANIM_CHANCE;
      const lockedPositionsSnapshot = Array.from(lockedSet).sort((a, b) => a - b);

      plan.sequence.push({
        attempt,
        addedFreeSpin: canAddFree,
        addedPosition,
        fakeNearMiss,
        lockedPositions: lockedPositionsSnapshot
      });

      if (canAddFree && lockedSet.size >= 3) {
        break;
      }
    }

    const finalFreePositions = Array.from(lockedSet).sort((a, b) => a - b);
    plan.finalLockedPositions = finalFreePositions;

    return {
      plan,
      freeSpinPositions: finalFreePositions,
      triggerFreeSpins: finalFreePositions.length >= 3
    };
  }

  async play(
    userId: string,
    betAmount: number,
    gameData?: Record<string, unknown>
  ): Promise<GameResult> {
    const mode = (gameData?.mode as string) ?? "classic";
    const isFreeSpinMode = Boolean(gameData?.freeSpinMode);
    // PERSISTENT MULTIPLIER: Track across free spins
    const persistentMultiplier = (gameData?.persistentMultiplier as number) ?? 1;
    // USER SPIN COUNT: For newbie boost (first 20 spins)
    const userSpinCount = (gameData?.userSpinCount as number) ?? 0;
    const incomingStickyWilds = Array.isArray(gameData?.stickyWildPositions)
      ? (gameData?.stickyWildPositions as Array<number | string>)
          .map(value => Number(value))
          .filter(value => Number.isFinite(value))
      : [];
    const stickyWildPositions = new Set<number>(incomingStickyWilds);
    
    // Mode support: classic (3), expanded/3x3 (9), mode5/5x5 (25)
    let cellCount = 3;
    if (mode === "expanded" || mode === "3x3") {
      cellCount = 9;
    } else if (mode === "mode5" || mode === "5x5") {
      cellCount = 25;
    }
    const slotMode: "3x3" | "5x5" = cellCount === 25 ? "5x5" : "3x3";
    const gridSize = this.getGridSize(cellCount);
    
    // === RTP ENGINE: Calculate if this spin should win ===
    const rtpOutcome = this.rtpEngine.calculateSpinOutcome(betAmount, userSpinCount);
    let shouldMatch = rtpOutcome.shouldWin;
    // Global boost to see more winning combinations
    if (!shouldMatch && Math.random() < 0.20) {
      shouldMatch = true;
    }
    
    // Free spins: slight win frequency boost (+8%)
    if (isFreeSpinMode && !shouldMatch && Math.random() < 0.08) {
      shouldMatch = true;
    }
    
    // Determine how many free spin symbols to show (3x3 and 5x5 modes)
    let freeSpinCount = 0;
    if (cellCount === 9 || cellCount === 25) {
      const roll = Math.random();
      const chance3 = this.calculateFreeSpinTriggerChance(mode, isFreeSpinMode);
      
      if (roll < chance3) {
        freeSpinCount = 3; // Triggers free spins!
      } else if (roll < chance3 + FREE_SPIN_2_CHANCE) {
        freeSpinCount = 2; // Just visual, no trigger
      } else if (roll < chance3 + FREE_SPIN_2_CHANCE + FREE_SPIN_1_CHANCE) {
        freeSpinCount = 1; // Just visual, no trigger
      }
    }
    
    let triggerFreeSpins = freeSpinCount === 3;

    // Safety: if still not forced win, allow a late 10% chance to force one line
    const forceMatchLate = !shouldMatch && Math.random() < 0.10;
    if (forceMatchLate) {
      shouldMatch = true;
    }

    let { symbols, freeSpinPositions, protectedPositions } = this.spinSymbols(shouldMatch, cellCount, freeSpinCount, isFreeSpinMode);
    let rawSymbolsBeforeSticky: NftGameSymbol[] | null = null;
    const newStickyWilds: number[] = [];
    if (isFreeSpinMode) {
      rawSymbolsBeforeSticky = symbols.map(symbol => ({ ...symbol }));
      const validStickyPositions: number[] = [];
      for (const pos of stickyWildPositions) {
        if (pos >= 0 && pos < symbols.length) {
          symbols[pos] = { ...FREE_SPIN_SYMBOL };
          validStickyPositions.push(pos);
        }
      }
      stickyWildPositions.clear();
      validStickyPositions.forEach(pos => stickyWildPositions.add(pos));

      for (let idx = 0; idx < rawSymbolsBeforeSticky.length; idx++) {
        if (rawSymbolsBeforeSticky[idx]?.imageUrl === FREE_SPIN_SYMBOL.imageUrl && !stickyWildPositions.has(idx)) {
          stickyWildPositions.add(idx);
          newStickyWilds.push(idx);
          symbols[idx] = { ...FREE_SPIN_SYMBOL };
        }
      }
    }
    freeSpinPositions = this.getFreeSymbolPositions(symbols);
    
    // === ADD MULTIPLIER SYMBOLS TO GRID (NEW) ===
    // Multipliers appear as symbols; they apply to payout only on winning spins
    const multiplierPositions: number[] = [];
    const placedMultipliers: MultiplierSymbol[] = [];
    const protectedSlots = new Set<number>(protectedPositions ?? []);
    const placeMultiplierSymbol = (mult: MultiplierSymbol): boolean => {
      const exclude = new Set<number>([...freeSpinPositions, ...multiplierPositions]);
      protectedSlots.forEach(pos => exclude.add(pos));
      const availablePositions: number[] = [];
      for (let i = 0; i < cellCount; i++) {
        if (!exclude.has(i)) {
          availablePositions.push(i);
        }
      }
      if (!availablePositions.length) {
        return false;
      }
      const pos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      symbols[pos] = {
        id: `multiplier-${mult.value}`,
        name: `${mult.value}x Multiplier`,
        imageUrl: mult.imageUrl,
        priceValue: 0,
        priceLabel: `x${mult.value}`,
        rarity: mult.rarity === "epic" ? "legendary" : mult.rarity as "common" | "rare" | "legendary"
      };
      multiplierPositions.push(pos);
      placedMultipliers.push(mult);
      return true;
    };
    
    if (MultiplierEngine.shouldSpawnMultiplier(slotMode, isFreeSpinMode)) {
      const mult = MultiplierEngine.selectMultiplier();
      const placed = placeMultiplierSymbol(mult);
      
      // In free spins, can spawn SECOND multiplier (15% chance, stacking!)
      if (placed && isFreeSpinMode && Math.random() < 0.15) {
        const mult2 = MultiplierEngine.selectMultiplier();
        placeMultiplierSymbol(mult2);
      }
    }

    // Refresh FREE symbol positions in case cosmetic changes occurred
    freeSpinPositions = this.getFreeSymbolPositions(symbols);

    // Double FREE mechanic: 2 FREE symbols award two respin attempts that hold FREE positions
    let doubleFreeRespinsMeta: DoubleFreeRespinsPlan | null = null;
    const blockedRespins = new Set<number>(protectedPositions ?? []);
    for (const multPos of multiplierPositions) {
      blockedRespins.add(multPos);
    }
    const canUseDoubleRespins = (cellCount === 9 || cellCount === 25) && !isFreeSpinMode;
    if (canUseDoubleRespins && freeSpinPositions.length === 2) {
      const respinComputation = this.planDoubleFreeRespins(
        symbols,
        freeSpinPositions,
        blockedRespins,
        cellCount
      );
      if (respinComputation) {
        doubleFreeRespinsMeta = respinComputation.plan;
        freeSpinPositions = respinComputation.freeSpinPositions;
        triggerFreeSpins = triggerFreeSpins || respinComputation.triggerFreeSpins;
      }
    }

    // Ensure FREE positions reflect any respin adjustments
    freeSpinPositions = this.getFreeSymbolPositions(symbols);

    // Проверяем есть ли FREE символы для ре-спина (не 3 подряд = не триггер)
    let shouldTriggerReSpin = false;
    const reSpinColumns: number[] = [];
    if (!isFreeSpinMode && doubleFreeRespinsMeta) {
      shouldTriggerReSpin = true;
      const columnSet = new Set<number>();
      for (const pos of doubleFreeRespinsMeta.initialLockedPositions) {
        columnSet.add(pos % gridSize);
      }
      reSpinColumns.push(...columnSet);
    } else if (!isFreeSpinMode && canUseDoubleRespins && freeSpinPositions.length > 0 && freeSpinPositions.length < 3) {
      shouldTriggerReSpin = true;
      const columnSet = new Set<number>();
      for (const pos of freeSpinPositions) {
        columnSet.add(pos % gridSize);
      }
      reSpinColumns.push(...columnSet);
    }
    
    // Используем новую логику анализа для 3x3 и 5x5, старую для классики
    let isWin: boolean;
    let isNearMiss: boolean;
    let isTwoMatch: boolean;
    let matchedSymbol: NftGameSymbol | undefined;
    let winningLines: number[][] = [];
    let allMatchedSymbols: NftGameSymbol[] = [];
    
    if (cellCount === 9) {
      const analysis = this.analyzeGrid(symbols);
      isWin = analysis.hasWin;
      isNearMiss = analysis.hasNearMiss;
      isTwoMatch = analysis.hasTwoMatch;
      matchedSymbol = analysis.matchedSymbol;
      winningLines = analysis.winningLines || [];
      allMatchedSymbols = analysis.matchedSymbols || [];
    } else if (cellCount === 25) {
      const analysis = this.analyzeGrid5x5(symbols);
      isWin = analysis.hasWin;
      isNearMiss = analysis.hasNearMiss;
      isTwoMatch = analysis.hasTwoMatch;
      matchedSymbol = analysis.matchedSymbol;
      winningLines = analysis.winningLines || [];
      allMatchedSymbols = analysis.matchedSymbols || [];
      
      // ПРИОРИТЕТ: Win или Free Spins отменяют near miss
      if (isWin || triggerFreeSpins) {
        isNearMiss = false;
        if (isWin) {
          isTwoMatch = false; // При полном выигрыше не показываем "два в ряд"
        }
      }
    } else {
      // Классический режим 1x3
      const tripleMatch = this.findAnyTriple(symbols);
      isWin = tripleMatch.found;
      isNearMiss = false;
      isTwoMatch = false;
      matchedSymbol = tripleMatch.symbol;
      if (isWin && matchedSymbol) {
        winningLines = [[0, 1, 2]];
        allMatchedSymbols = [matchedSymbol];
      }
    }
    
    const effectiveBet = isFreeSpinMode ? 0 : betAmount;
    
    let payout = 0;
    let payoutMultiplier = 0;
    let appliedMultiplierSymbol: MultiplierSymbol | undefined;
    let nftDrop: NftDropMetadata | null = null;
    let totalSpinMultiplierApplied = 1;
    let nftCashReward = 0;
    
    // Track winnings by combination type
    const winBreakdown: Record<string, number> = {};
    
    // Check if this is a full 5-in-row line (for NFT eligibility)
    const hasThreeInRow = winningLines.some(line => line.length >= 3);
    
    // === ADVANCED WIN PATTERNS DETECTION ===
    // Check for geometric patterns, broken 3-in-row, double pairs, etc.
    const symbolValues = new Map<string, number>();
    for (const symbol of this.selectedPool) {
      const value = symbol.priceValue / this.minBet; // Normalize by min bet
      symbolValues.set(symbol.id, value);
    }
    symbolValues.set("/free.jpg", 1.5); // Wild has 1.5x base value
    
    const advancedPatterns = WinPatternDetector.detectAllPatterns(
      symbols,
      gridSize as 3 | 5,
      effectiveBet,
      symbolValues
    );
    
    // Check double pair (1.2x bet)
    const doublePair = WinPatternDetector.detectDoublePair(symbols, "/free.jpg");
    let doublePairPayout = 0;
    if (doublePair.matches && effectiveBet > 0) {
      doublePairPayout = effectiveBet * 1.2;
      console.log(`💎 Double pair detected! Pairs: ${doublePair.pairs.map(p => p.symbol).join(", ")}`);
    }
    
    // Check Wild storm (2+ Wilds + any win = +3 free spins bonus)
    const wildStorm = WinPatternDetector.detectWildStorm(
      symbols,
      "/free.jpg",
      isWin || advancedPatterns.length > 0
    );
    let wildStormBonus = 0;
    if (wildStorm.matches) {
      wildStormBonus = 3; // +3 free spins
      console.log(`⚡ WILD STORM! ${wildStorm.wildCount} Wilds + Win = +${wildStormBonus} free spins!`);
    }
    
    // === COUNT WILD SYMBOLS (+1 free spin each) ===
    const wildCount = this.countWildSymbols(symbols);
    if (!isFreeSpinMode && wildCount >= 3) {
      triggerFreeSpins = true; // Three Wilds anywhere trigger free spins
    }
    const wildFreeSpins = isFreeSpinMode
      ? newStickyWilds.length * WILD_FREE_SPIN_BONUS
      : wildCount * WILD_FREE_SPIN_BONUS; // +1 per Wild / newly added sticky
    
    // === TWO-ADJACENT SYMBOL PAYOUT ===
    let adjacentPairsPayout = 0;
    let adjacentPairs = this.findAdjacentPairs(symbols, gridSize);

    const pairForgeChance = 0.25;
    // If nothing hit at all, gently craft one adjacent pair to show wins more often (avoid overwriting multipliers)
    if (!shouldMatch && adjacentPairs.length === 0 && Math.random() < pairForgeChance) {
      const pairGridSize = gridSize;
      const blocked = new Set(multiplierPositions);
      // Collect safe positions (non-multiplier) that have a right neighbor also non-multiplier
      const safeSlots: number[] = [];
      const rows = Math.max(1, Math.ceil(cellCount / pairGridSize));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < pairGridSize - 1; col++) {
          const idx = row * pairGridSize + col;
          const nextIdx = idx + 1;
          if (nextIdx >= cellCount) continue;
          if (blocked.has(idx) || blocked.has(nextIdx)) continue;
          if (!symbols[idx]) continue;
          safeSlots.push(idx);
        }
      }
      if (safeSlots.length > 0) {
        const pick = safeSlots[Math.floor(Math.random() * safeSlots.length)];
        symbols[pick + 1] = { ...symbols[pick] }; // duplicate to form a pair
        adjacentPairs = this.findAdjacentPairs(symbols, pairGridSize);
      }
    }

    if (adjacentPairs.length > 0 && effectiveBet > 0) {
      // Random payout between 10%-20% per pair
      for (let i = 0; i < adjacentPairs.length; i++) {
        const basePayout = effectiveBet * (TWO_ADJACENT_MIN_PAYOUT + Math.random() * (TWO_ADJACENT_MAX_PAYOUT - TWO_ADJACENT_MIN_PAYOUT));
        const pairPayout = basePayout; // Spec: flat 10-20% of bet
        adjacentPairsPayout += pairPayout;
      }
      console.log(`💎 Adjacent pairs: ${adjacentPairs.length} pairs = ${adjacentPairsPayout.toFixed(2)}`);
    }
    
    // Initialize persistent multiplier tracking
    let newPersistentMultiplier = persistentMultiplier;
    
    if (isWin && allMatchedSymbols.length > 0) {
      // Считаем выплату за КАЖДУЮ выигрышную линию
      let totalPayout = 0;
      let totalMultiplier = 0;
      
      for (const symbol of allMatchedSymbols) {
        const multiplier = this.computeMultiplier(symbol);
        const linePayout = effectiveBet * multiplier;
        totalPayout += linePayout;
        totalMultiplier += multiplier;
        
        // Track standard line wins
        const lineType = winningLines.length > 0 && winningLines[0].length === 5 ? "5-in-row" : "3-in-row";
        winBreakdown[lineType] = (winBreakdown[lineType] || 0) + linePayout;
      }
      
      // === NFT TIER DROP CHECK (5-in-row only, 1% chance) ===
      nftDrop = this.checkNftDrop(allMatchedSymbols, hasThreeInRow);
      if (nftDrop) {
        // Apply NFT tier bonus multiplier
        totalPayout *= nftDrop.bonusMultiplier;
        totalMultiplier *= nftDrop.bonusMultiplier;
        totalSpinMultiplierApplied *= nftDrop.bonusMultiplier;
        console.log(`🎁 NFT DROP! Tier ${nftDrop.tier} - ${nftDrop.rarity} (${nftDrop.bonusMultiplier}x bonus)`);
      }
      
      // === MULTIPLIER SYMBOL LOGIC (NEW SPEC) ===
      // Multipliers ONLY appear on winning spins
      // 3x3=4%, 5x5=5%, free spins=1.5× frequency
      const multiplierSymbols: MultiplierSymbol[] = [...placedMultipliers];
      
      // If none were placed cosmetically, still ensure at least one for winning spins
      if (multiplierSymbols.length === 0 && MultiplierEngine.shouldSpawnMultiplier(slotMode, isFreeSpinMode)) {
        const mult = MultiplierEngine.selectMultiplier();
        multiplierSymbols.push(mult);
        placedMultipliers.push(mult);

        // In free spins, can spawn multiple multipliers (stacking!)
        if (isFreeSpinMode && Math.random() < 0.15) { // 15% chance for second multiplier
          const extra = MultiplierEngine.selectMultiplier();
          multiplierSymbols.push(extra);
          placedMultipliers.push(extra);
        }
      }
      
      // STACK MULTIPLIERS MULTIPLICATIVELY
      let spinMultiplier = 1;
      if (multiplierSymbols.length > 0) {
        spinMultiplier = MultiplierEngine.stackMultipliers(multiplierSymbols);
        console.log(`🎰 Multipliers: ${multiplierSymbols.map(m => `x${m.value}`).join(' + ')} = x${spinMultiplier}`);
      }
      totalSpinMultiplierApplied *= spinMultiplier;
      
      // PERSISTENT MULTIPLIER (free spins only) - update tracking
      if (isFreeSpinMode && spinMultiplier > 1) {
        newPersistentMultiplier *= spinMultiplier;
        console.log(`🔥 PERSISTENT MULTIPLIER: ${persistentMultiplier} × ${spinMultiplier} = ${newPersistentMultiplier}`);
      }
      
      // Apply current spin multiplier
      totalPayout *= spinMultiplier;
      totalMultiplier *= spinMultiplier;
      
      // Apply persistent multiplier from previous free spins
      if (isFreeSpinMode && persistentMultiplier > 1) {
        totalPayout *= persistentMultiplier;
        totalMultiplier *= persistentMultiplier;
        totalSpinMultiplierApplied *= persistentMultiplier;
        console.log(`🔥 Applied persistent multiplier: x${persistentMultiplier}`);
      }

      if (nftDrop && nftDrop.nftSymbol.priceValue > 0) {
        nftCashReward = Number((nftDrop.nftSymbol.priceValue * totalSpinMultiplierApplied).toFixed(2));
        totalPayout += nftCashReward;
        winBreakdown["NFT Value"] = (winBreakdown["NFT Value"] || 0) + nftCashReward;
        nftDrop.cashPayout = nftCashReward;
      }
      
      // Store multipliers for display
      appliedMultiplierSymbol = multiplierSymbols[0];
      
      payout = Number(totalPayout.toFixed(2));
      payoutMultiplier = Number((totalMultiplier).toFixed(2));
      
      // ADD ADVANCED PATTERN PAYOUTS
      if (advancedPatterns.length > 0) {
        const advancedPayout = advancedPatterns.reduce((sum, p) => sum + p.payout, 0);
        payout += advancedPayout;
        winBreakdown["Advanced Patterns"] = advancedPayout;
        console.log(`🎨 Advanced patterns bonus: ${advancedPatterns.length} patterns = +${advancedPayout.toFixed(2)}`);
        advancedPatterns.forEach(p => {
          console.log(`  - ${p.pattern.name}: ${p.payout.toFixed(2)}`);
        });
      }
      
      // ADD DOUBLE PAIR PAYOUT
      if (doublePairPayout > 0) {
        payout += doublePairPayout;
        winBreakdown["Double Pair"] = doublePairPayout;
      }
      
      // ADD ADJACENT PAIRS PAYOUT
      if (adjacentPairsPayout > 0) {
        payout += adjacentPairsPayout;
        winBreakdown["Adjacent Pairs"] = adjacentPairsPayout;
      }
      
      // === MAX PAYOUT CAP (ECONOMY PROTECTION) ===
      const maxPayout = effectiveBet * MAX_PAYOUT_MULTIPLIER;
      if (payout > maxPayout) {
        console.log(`⚠️  Payout capped: ${payout.toFixed(2)} → ${maxPayout.toFixed(2)} (${MAX_PAYOUT_MULTIPLIER}× bet)`);
        payout = maxPayout;
      }
      
    } else if (isNearMiss && effectiveBet > 0) {
      // Near miss: суммируем выплаты за ВСЕ строки с двойными совпадениями
      if (cellCount === 9) {
        const analysis = this.analyzeGrid(symbols);
        const nearMissCount = analysis.nearMissCount || 0;
        
        // Каждая near-miss строка даёт 10% возврат
        payout = Number((effectiveBet * NEAR_MISS_REFUND * nearMissCount).toFixed(2));
      } else {
        // Классический режим: одна near-miss
        payout = Number((effectiveBet * NEAR_MISS_REFUND).toFixed(2));
      }
    } else {
      // No traditional win - but check if advanced patterns won
      if (advancedPatterns.length > 0 && effectiveBet > 0) {
        const advancedPayout = advancedPatterns.reduce((sum, p) => sum + p.payout, 0);
        payout = advancedPayout;
        isWin = true; // Mark as win because patterns matched
        console.log(`🎨 Advanced pattern win (no 3-in-row): ${advancedPatterns.length} patterns = ${advancedPayout.toFixed(2)}`);
      } else if (doublePairPayout > 0) {
        payout = doublePairPayout;
        isWin = true; // Double pair counts as small win
      } else if (adjacentPairsPayout > 0) {
        payout = adjacentPairsPayout;
        isWin = true; // Adjacent pairs count as small win
      }
    }

    const winsMeta: Array<{ type: string; positions?: number[]; payout?: number; symbol?: string }> = [];
    if ((isWin || payout > 0) && winningLines.length > 0) {
      const linePayout = winBreakdown["5-in-row"] ?? winBreakdown["3-in-row"] ?? payout;
      winsMeta.push({
        type: "line",
        positions: winningLines.flat(),
        payout: linePayout,
        symbol: matchedSymbol?.name
      });
    }
    for (const pattern of advancedPatterns) {
      winsMeta.push({
        type: `pattern:${pattern.pattern.name}`,
        positions: pattern.positions,
        payout: pattern.payout,
        symbol: pattern.matchedSymbol
      });
    }
    if (doublePairPayout > 0) {
      winsMeta.push({
        type: "double-pair",
        positions: doublePair.pairs.flatMap(p => p.positions).slice(0, 4),
        payout: doublePairPayout,
        symbol: doublePair.pairs[0]?.symbol
      });
    }
    if (adjacentPairsPayout > 0) {
      winsMeta.push({
        type: "adjacent-pair",
        positions: adjacentPairs.flatMap(p => p.positions),
        payout: adjacentPairsPayout,
        symbol: adjacentPairs[0]?.symbol.name
      });
    }

    // === SHARD ECONOMY: Detect patterns and award shards ===
    let shardAwards: Array<{ tier: NftTier; count: number }> = [];
    if (cellCount === 9) {
      // 3x3 mode: detect side combo, edge combo, diagonal pair
      // Build nftTierSymbols Map from selectedPool
      const nftTierSymbols = new Map<string, NftTier>();
      for (const symbol of this.selectedPool) {
        const tier = this.getNftTierFromRarity(symbol.rarity);
        if (tier) {
          nftTierSymbols.set(symbol.id, tier);
        }
      }
      
      const patterns = this.shardEconomy.detectPatterns3x3(symbols, nftTierSymbols, "free-spin");
      shardAwards = this.shardEconomy.awardShards(patterns, "3x3");
    } else if (cellCount === 25) {
      // 5x5 mode: cluster detection would require full pattern detection
      // For now, skip shard awards in 5x5 until proper cluster detection is integrated
      // TODO: Implement cluster-based shard awards for 5x5 mode
    }
    
    // === RECORD RESULT IN RTP ENGINE ===
    this.rtpEngine.recordResult(payout, isWin);
    const rtpState = this.rtpEngine.getSessionState();
    const evDiagnostics = this.getSpinPriceWithEV(
      slotMode,
      this.rtpEngine.getTargetRTP ? this.rtpEngine.getTargetRTP() : 0.85
    );
    const spinPrice = evDiagnostics.spinPrice;
    const spinId = `${this.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Build metadata from symbols actually on grid
    const multipliersMeta = multiplierPositions.map(pos => {
      const symbol = symbols[pos];
      const fallbackLabelValue = Number(symbol.priceLabel?.replace("x", "")) || null;
      const value = MultiplierEngine.getMultiplierValue(symbol.imageUrl) ?? fallbackLabelValue;
      return {
        value,
        imageUrl: symbol.imageUrl,
        rarity: symbol.rarity,
        position: pos
      };
    });
    const stickyWildPositionsMeta = isFreeSpinMode
      ? Array.from(stickyWildPositions).sort((a, b) => a - b)
      : (triggerFreeSpins ? [...freeSpinPositions].sort((a, b) => a - b) : null);
    const newStickyWildPositionsMeta = newStickyWilds.length > 0 ? [...newStickyWilds].sort((a, b) => a - b) : null;

    const result = new GameResult(
      spinId,
      userId,
      this.name,
      effectiveBet,
      isWin ? GameResultType.WIN : (isNearMiss ? GameResultType.LOSS : GameResultType.LOSS),
      payout,
      {
        collectionId: this.id,
        collectionName: this.name,
        sourcePath: this.sourcePath,
        spinId,
        symbols,
        grid: symbols,
        wins: winsMeta,
        multipliers: multipliersMeta,
        matched: isWin,
        nearMiss: isNearMiss,
        nearMissRefund: isNearMiss ? payout : 0,
        nearMissSymbolUrl: (matchedSymbol && this.selectedPoolImageUrls.has(matchedSymbol.imageUrl))
          ? matchedSymbol.imageUrl
          : null,
        nearMissSymbolName: matchedSymbol?.name ?? null,
        twoMatch: isTwoMatch,
        twoMatchSymbolUrl: (matchedSymbol && this.selectedPoolImageUrls.has(matchedSymbol.imageUrl)) ? matchedSymbol.imageUrl : null,
        twoMatchSymbolName: matchedSymbol?.name ?? null,
        chance: DEFAULT_WIN_CHANCE, // Показываем юзерам базовые 2%
        multiplier: payoutMultiplier,
        priceStats: this.priceStats,
        mode,
        freeSpinsTriggered: triggerFreeSpins,
        freeSpinPositions,
        stickyWildPositions: stickyWildPositionsMeta,
        newStickyWildPositions: newStickyWildPositionsMeta,
        shouldTriggerReSpin, // Флаг что нужен ре-спин (есть FREE но не 3)
        reSpinColumns, // Колонки которые нужно ре-спинить
        doubleFreeRespins: !isFreeSpinMode ? doubleFreeRespinsMeta : null,
        winningLines,
        matchedSymbols: allMatchedSymbols, // Все выигрышные символы
        matchedSymbol: matchedSymbol, // Первый для обратной совместимости
        nearMissCount: cellCount === 9 ? (this.analyzeGrid(symbols).nearMissCount || 0) : 0, // Количество near-miss строк
        // RTP & Multiplier info
        appliedMultiplier: appliedMultiplierSymbol ? {
          value: appliedMultiplierSymbol.value,
          imageUrl: appliedMultiplierSymbol.imageUrl,
          rarity: appliedMultiplierSymbol.rarity
        } : null,
        // NFT Drop info
        nftDrop: nftDrop ? {
          tier: nftDrop.tier,
          rarity: nftDrop.rarity,
          bonusMultiplier: nftDrop.bonusMultiplier,
          cashPayout: nftCashReward,
          nftSymbol: {
            id: nftDrop.nftSymbol.id,
            name: nftDrop.nftSymbol.name,
            imageUrl: nftDrop.nftSymbol.imageUrl,
            priceValue: nftDrop.nftSymbol.priceValue,
            rarity: nftDrop.nftSymbol.rarity
          }
        } : null,
        rtpState: {
          currentRTP: Number((rtpState.currentRTP * 100).toFixed(2)), // Convert to %
          totalSpins: rtpState.totalSpins,
          consecutiveLosses: rtpState.consecutiveLosses
        },
        // Shard Economy
        shardsAwarded: shardAwards.length > 0 ? shardAwards : null,
        // Free spins: base (10 or 3) + Wild Storm + Wild count (+1 each)
        freeSpinsAwarded: Math.min(
          (triggerFreeSpins ? (isFreeSpinMode ? FREE_SPINS_RETRIGGER : FREE_SPINS_AWARDED) : 0) 
          + wildStormBonus 
          + wildFreeSpins,
          MAX_FREE_SPINS_CAP // Cap at 50
        ),
        // Advanced Patterns
        advancedPatterns: advancedPatterns.length > 0 ? advancedPatterns.map(p => ({
          name: p.pattern.name,
          description: p.pattern.description,
          multiplier: p.pattern.multiplier,
          positions: p.positions,
          payout: p.payout
        })) : null,
        doublePair: doublePair.matches ? {
          pairs: doublePair.pairs,
          payout: doublePairPayout
        } : null,
        wildStorm: wildStorm.matches ? {
          wildCount: wildStorm.wildCount,
          wildPositions: wildStorm.wildPositions,
          bonusSpins: wildStormBonus
        } : null,
        // NEW: Wild mechanics
        wildCount,
        wildFreeSpins,
        // NEW: Adjacent pairs
        adjacentPairs: adjacentPairs.length > 0 ? adjacentPairs.map(p => ({
          symbol: p.symbol.name,
          positions: p.positions
        })) : null,
        adjacentPairsPayout: adjacentPairsPayout > 0 ? adjacentPairsPayout : null,
        // NEW: Persistent multiplier (free spins only)
        persistentMultiplier: newPersistentMultiplier,
        // NEW: Win breakdown by combination type
        winBreakdown: Object.keys(winBreakdown).length > 0 ? winBreakdown : null,
        // NEW: EV-based spin pricing with full diagnostics
        evDiagnostics,
        spinPrice,
        spinPriceRange: cellCount === 25 
          ? { min: SPIN_PRICE_5X5_MIN, max: SPIN_PRICE_5X5_MAX }
          : { min: SPIN_PRICE_3X3_MIN, max: SPIN_PRICE_3X3_MAX },
        payoutCash: payout,
        nftAwarded: Boolean(nftDrop),
        newShardBalance: null,
        diagnostics: {
          EV_cash: evDiagnostics.cashPayouts,
          EV_multipliers: evDiagnostics.multiplierContribution,
          EV_freeSpins: evDiagnostics.freeSpinContribution,
          EV_NFT: evDiagnostics.nftRewards,
          EV_total: evDiagnostics.totalEV,
          RTP_actual: Number(rtpState.currentRTP.toFixed(4))
        }
      }
    );

    // LOG: что отправляется на фронт
    if (cellCount === 9) {
      console.log('\n=== SYMBOLS SENT TO FRONTEND ===');
      console.log('Row 1:', symbols.slice(0, 3).map(s => s.imageUrl));
      console.log('Row 2:', symbols.slice(3, 6).map(s => s.imageUrl));
      console.log('Row 3:', symbols.slice(6, 9).map(s => s.imageUrl));
      console.log('Match result:', { isWin, isNearMiss, isTwoMatch });
      console.log('================================\n');
    }

    return result;
  }

  private spinSymbols(
    forceMatch: boolean, 
    count: number,
    freeSpinCount: number,
    isFreeSpinMode: boolean = false
  ): { symbols: NftGameSymbol[]; freeSpinPositions: number[]; protectedPositions: number[] } {
    const freeSpinPositions: number[] = [];
    const gridSize: 3 | 5 = count === 25 ? 5 : 3;
    let protectedPositions: number[] = [];
    
    if (forceMatch && count === 3) {
      const selected = this.pickRandomSymbol(isFreeSpinMode, gridSize);
      protectedPositions = [0, 1, 2];
      return { 
        symbols: [selected, selected, selected].map(symbol => ({ ...symbol })),
        freeSpinPositions,
        protectedPositions
      };
    }

    const picks: NftGameSymbol[] = [];
    
    // 5x5 mode (25 symbols)
    if (count === 25) {
      const winningLines = this.getExpandedLines(5);
      let chosenLine: number[] | undefined;

      // Base fill with random symbols
      while (picks.length < count) {
        picks.push(this.pickRandomSymbol(isFreeSpinMode, gridSize));
      }

      // Force at least one winning line
      // WEIGHTED SELECTION: 5-in-row is RARE (0.3% chance)
      if (forceMatch) {
        let line: number[];
        const roll = Math.random();
        
        // 0.3% chance for full 5-in-row
        if (roll < 0.003) {
          // Only horizontal/vertical full lines (5 symbols)
          const fullLines = winningLines.filter(l => l.length === 5);
          line = fullLines[Math.floor(Math.random() * fullLines.length)];
        } else {
          // 99.7% chance for 3-4 symbol lines (shorter patterns)
          const partialLines = winningLines.filter(l => l.length < 5);
          line = partialLines[Math.floor(Math.random() * partialLines.length)];
        }
        
        chosenLine = line;
        const winSymbol = this.pickRandomSymbol(isFreeSpinMode, gridSize);
        for (const idx of line) {
          picks[idx] = { ...winSymbol };
        }
      }

      // Place free spin symbols
      if (freeSpinCount > 0) {
        const exclude = new Set<number>(chosenLine ?? []);
        const positions = this.getRandomPositions(freeSpinCount, count, exclude);
        freeSpinPositions.push(...positions);
        for (const pos of positions) {
          picks[pos] = { ...FREE_SPIN_SYMBOL };
        }
      }

      protectedPositions = chosenLine ? [...chosenLine] : [];
      return { symbols: picks.map(symbol => ({ ...symbol })), freeSpinPositions, protectedPositions };
    }
    
    // Expanded mode (3x3)
    if (count === 9) {
      const winningLines = this.getExpandedLines();
      let chosenLine: number[] | undefined;

      // Base fill with random symbols
      while (picks.length < count) {
        picks.push(this.pickRandomSymbol(isFreeSpinMode, gridSize));
      }

      // Force at least one winning line when запрошено
      if (forceMatch) {
        const line = winningLines[Math.floor(Math.random() * winningLines.length)];
        chosenLine = line;
        const winSymbol = this.pickRandomSymbol(isFreeSpinMode, gridSize);
        for (const idx of line) {
          picks[idx] = { ...winSymbol };
        }
      }

      // Place free spin symbols, avoid overwriting winning line to keep it intact
      if (freeSpinCount > 0) {
        const exclude = new Set<number>(chosenLine ?? []);
        const positions = this.getRandomPositions(freeSpinCount, count, exclude);
        freeSpinPositions.push(...positions);
        for (const pos of positions) {
          picks[pos] = { ...FREE_SPIN_SYMBOL };
        }
      }

      protectedPositions = chosenLine ? [...chosenLine] : [];
      return { symbols: picks.map(symbol => ({ ...symbol })), freeSpinPositions, protectedPositions };
    }

    // Classic 1x3 mode
    while (picks.length < count) {
      picks.push(this.pickRandomSymbol(isFreeSpinMode, gridSize));
    }

    // Force match for classic mode
    if (forceMatch && count === 3) {
      const selected = picks[0];
      picks[1] = { ...selected };
      picks[2] = { ...selected };
    }

    // Prevent accidental matches in classic mode when not supposed to win (по imageUrl)
    if (!forceMatch && count === 3 && this.allSame(picks)) {
      picks[2] = this.pickDifferentSymbol(picks[0].imageUrl);
    }

    return { symbols: picks.map(symbol => ({ ...symbol })), freeSpinPositions, protectedPositions };
  }

  private getRandomPositions(count: number, total: number, exclude: Set<number> = new Set()): number[] {
    const positions: number[] = [];
    while (positions.length < count) {
      const pos = Math.floor(Math.random() * total);
      if (!positions.includes(pos) && !exclude.has(pos)) {
        positions.push(pos);
      }
    }
    return positions.sort((a, b) => a - b);
  }

  private getExpandedLines(gridSize: number = 3): number[][] {
    const lines: number[][] = [];
    
    // Horizontal lines
    for (let row = 0; row < gridSize; row++) {
      const line: number[] = [];
      for (let col = 0; col < gridSize; col++) {
        line.push(row * gridSize + col);
      }
      lines.push(line);
    }
    
    return lines;
  }

  /**
   * Pick random symbol from weighted reel strip
   * High value symbols appear less frequently (realistic slot behavior)
   * EXACT SPEC: In free spins, Wild frequency is 3× higher
   */
  private pickRandomSymbol(isFreeSpinMode: boolean = false, gridSize: 3 | 5 = 3): NftGameSymbol {
    // Category weights pulled from spec
    const baseWeights = gridSize === 5
      ? { common: 0.55, rare: 0.22, epic: 0.12, wild: 0.07, multiplier: 0.02, nft: 0.02 }
      : { common: 0.60, rare: 0.20, epic: 0.10, wild: 0.06, multiplier: 0.02, nft: 0.02 };
    
    // Slightly increase small-win symbols during free spins
    if (isFreeSpinMode) {
      baseWeights.common *= 1.08;
      baseWeights.rare *= 1.08;
      baseWeights.multiplier *= 1.5; // Used downstream for multiplier spawn probability, not symbol placement
    }
    
    // Prepare rarity pools
    const rarityPools = this.selectedPool.reduce<{ common: NftGameSymbol[]; rare: NftGameSymbol[]; epic: NftGameSymbol[] }>((acc, symbol) => {
      if (symbol.rarity === "common") acc.common.push(symbol);
      else if (symbol.rarity === "rare") acc.rare.push(symbol);
      else acc.epic.push(symbol); // legendary treated as epic bucket
      return acc;
    }, { common: [], rare: [], epic: [] });

    // NFT pool = top 20% most expensive symbols (fallback to full pool)
    const nftPool = [...this.selectedPool]
      .sort((a, b) => b.priceValue - a.priceValue)
      .slice(0, Math.max(1, Math.ceil(this.selectedPool.length * 0.2)));

    // Boost Wild visibility so FREE symbols show more often
    const wildBoost = isFreeSpinMode ? 1.8 : 1.4;
    baseWeights.wild *= wildBoost;

    const weightSum = baseWeights.common + baseWeights.rare + baseWeights.epic + baseWeights.wild + baseWeights.nft;
    let roll = Math.random() * weightSum;
    const reelFallback = this.weightedReelStrip[Math.floor(Math.random() * this.weightedReelStrip.length)];
    
    if (roll < baseWeights.wild) {
      return { ...FREE_SPIN_SYMBOL };
    }
    roll -= baseWeights.wild;
    
    const chooseFromPool = (pool: NftGameSymbol[], fallback: NftGameSymbol[]): NftGameSymbol => {
      const source = pool.length ? pool : (fallback.length ? fallback : this.weightedReelStrip);
      const idx = Math.floor(Math.random() * source.length);
      return source[idx];
    };
    
    if (roll < baseWeights.common) {
      return { ...chooseFromPool(rarityPools.common, this.selectedPool) };
    }
    roll -= baseWeights.common;
    
    if (roll < baseWeights.rare) {
      return { ...chooseFromPool(rarityPools.rare, rarityPools.common.length ? rarityPools.common : this.selectedPool) };
    }
    roll -= baseWeights.rare;
    
    if (roll < baseWeights.epic) {
      return { ...chooseFromPool(rarityPools.epic, this.selectedPool) };
    }
    roll -= baseWeights.epic;
    
    // NFT bucket
    return { ...chooseFromPool(nftPool, [reelFallback]) };
  }

  // Выбирает символ с другим imageUrl
  private pickDifferentSymbol(excludeImageUrl: string): NftGameSymbol {
    const alternatives = this.selectedPool.filter(item => item.imageUrl !== excludeImageUrl);
    if (!alternatives.length) {
      return this.selectedPool[0];
    }
    const index = Math.floor(Math.random() * alternatives.length);
    return alternatives[index];
  }

  // Проверяет совпадение всех символов по imageUrl
  private allSame(symbols: NftGameSymbol[]): boolean {
    return symbols.every(symbol => this.symbolsEqual(symbol, symbols[0]));
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
