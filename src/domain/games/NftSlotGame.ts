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

// Win chances configuration
const DEFAULT_WIN_CHANCE = 0.02;  // 2% базовый шанс (показываем юзерам)
const NEWBIE_WIN_CHANCE_MIN = 0.03; // 3% минимум для новичков
const NEWBIE_WIN_CHANCE_MAX = 0.07; // 7% максимум для новичков
const NEWBIE_SPINS_THRESHOLD = 20;  // первые 20 спинов

// Near miss rewards
const NEAR_MISS_REFUND = 0.10;    // 10% возврат при near miss

const DEFAULT_MIN_BET = 5;
const DEFAULT_MAX_BET = 500;

// Free spin chances by count
const FREE_SPIN_1_CHANCE = 0.10;  // 10% for 1 free spin symbol
const FREE_SPIN_2_CHANCE = 0.01;  // 1% for 2 free spin symbols
const FREE_SPIN_3_CHANCE_NORMAL = 0.002; // 0.2% for 3 free spin symbols
const FREE_SPIN_3_CHANCE_IN_FREE = 0.005; // 0.5% for 3 during free spins

const FREE_SPINS_AWARDED = 10;
const FREE_SPINS_RETRIGGER = 3;

// Early boost for free-spin trigger in expanded mode (first 20 spins)
const NEWBIE_FREE_SPIN_CHANCE_MIN = 0.02; // 2%
const NEWBIE_FREE_SPIN_CHANCE_MAX = 0.07; // 7%

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
    
    // Select 10 cards: 8 cheap + 2 expensive; keep only symbols with valid image URLs for spins/UI
    const pool = this.selectPoolCards(config.items);
    const filteredPool = pool.filter(item => isValidImageUrl(item.imageUrl));
    this.selectedPool = filteredPool.length ? filteredPool : pool;
    this.selectedPoolImageUrls = new Set(this.selectedPool.map(item => item.imageUrl));
    
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

  // Вычисляет реальный шанс выигрыша в зависимости от количества спинов
  private calculateRealWinChance(userSpinCount: number): number {
    if (userSpinCount < NEWBIE_SPINS_THRESHOLD) {
      // Для новичков: случайный шанс между 3-7%
      return NEWBIE_WIN_CHANCE_MIN + Math.random() * (NEWBIE_WIN_CHANCE_MAX - NEWBIE_WIN_CHANCE_MIN);
    }
    return this.winChance; // Базовые 2%
  }

  // Ранний буст шанса триггера фриспинов в расширенном режиме
  private calculateFreeSpinTriggerChance(userSpinCount: number, isFreeSpinMode: boolean): number {
    if (isFreeSpinMode) {
      return FREE_SPIN_3_CHANCE_IN_FREE;
    }
    if (userSpinCount < NEWBIE_SPINS_THRESHOLD) {
      const progress = userSpinCount / NEWBIE_SPINS_THRESHOLD; // 0..1
      // Линейно спускаемся с 7% к 2% за первые 20 спинов
      return NEWBIE_FREE_SPIN_CHANCE_MAX - progress * (NEWBIE_FREE_SPIN_CHANCE_MAX - NEWBIE_FREE_SPIN_CHANCE_MIN);
    }
    return FREE_SPIN_3_CHANCE_NORMAL;
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

  async play(
    userId: string,
    betAmount: number,
    gameData?: Record<string, unknown>
  ): Promise<GameResult> {
    const mode = (gameData?.mode as string) ?? "classic";
    const isFreeSpinMode = Boolean(gameData?.freeSpinMode);
    const cellCount = mode === "expanded" ? 9 : 3;
    const userSpinCount = (gameData?.userSpinCount as number) ?? 999; // По умолчанию считаем "опытным"
    
    // Вычисляем реальный шанс выигрыша
    const realWinChance = this.calculateRealWinChance(userSpinCount);
    
    // Determine how many free spin symbols to show (only in expanded mode)
    let freeSpinCount = 0;
    if (mode === "expanded") {
      const roll = Math.random();
      const chance3 = this.calculateFreeSpinTriggerChance(userSpinCount, isFreeSpinMode);
      
      if (roll < chance3) {
        freeSpinCount = 3; // Triggers free spins!
      } else if (roll < chance3 + FREE_SPIN_2_CHANCE) {
        freeSpinCount = 2; // Just visual, no trigger
      } else if (roll < chance3 + FREE_SPIN_2_CHANCE + FREE_SPIN_1_CHANCE) {
        freeSpinCount = 1; // Just visual, no trigger
      }
    }
    
    const triggerFreeSpins = freeSpinCount === 3;
    const shouldMatch = Math.random() < realWinChance;

    let { symbols, freeSpinPositions } = this.spinSymbols(shouldMatch, cellCount, freeSpinCount);
    
    // Проверяем есть ли FREE символы для ре-спина (не 3 подряд = не триггер)
    const shouldTriggerReSpin = cellCount === 9 && freeSpinPositions.length > 0 && freeSpinPositions.length < 3;
    
    // Определяем колонки с FREE для фронтенда
    const reSpinColumns: number[] = [];
    if (shouldTriggerReSpin) {
      const freeColumns = new Set<number>();
      for (const pos of freeSpinPositions) {
        const col = pos % 3;
        freeColumns.add(col);
      }
      reSpinColumns.push(...Array.from(freeColumns));
    }
    
    // Используем новую логику анализа для 3x3, старую для классики
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
    
    if (isWin && allMatchedSymbols.length > 0) {
      // Считаем выплату за КАЖДУЮ выигрышную линию
      let totalPayout = 0;
      let totalMultiplier = 0;
      
      for (const symbol of allMatchedSymbols) {
        const multiplier = this.computeMultiplier(symbol);
        totalPayout += effectiveBet * multiplier;
        totalMultiplier += multiplier;
      }
      
      payout = Number(totalPayout.toFixed(2));
      payoutMultiplier = Number((totalMultiplier).toFixed(2));
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
    }

    const result = new GameResult(
      `${this.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      this.name,
      effectiveBet,
      isWin ? GameResultType.WIN : (isNearMiss ? GameResultType.LOSS : GameResultType.LOSS),
      payout,
      {
        collectionId: this.id,
        collectionName: this.name,
        sourcePath: this.sourcePath,
        symbols,
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
        shouldTriggerReSpin, // Флаг что нужен ре-спин (есть FREE но не 3)
        reSpinColumns, // Колонки которые нужно ре-спинить
        winningLines,
        matchedSymbols: allMatchedSymbols, // Все выигрышные символы
        matchedSymbol: matchedSymbol, // Первый для обратной совместимости
        nearMissCount: cellCount === 9 ? (this.analyzeGrid(symbols).nearMissCount || 0) : 0, // Количество near-miss строк
        freeSpinsAwarded: triggerFreeSpins 
          ? (isFreeSpinMode ? FREE_SPINS_RETRIGGER : FREE_SPINS_AWARDED) 
          : 0
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
    
    // Expanded mode (3x3)
    if (count === 9) {
      const winningLines = this.getExpandedLines();
      let chosenLine: number[] | undefined;

      // Base fill with random symbols
      while (picks.length < count) {
        picks.push(this.pickRandomSymbol());
      }

      // Force at least one winning line when запрошено
      if (forceMatch) {
        const line = winningLines[Math.floor(Math.random() * winningLines.length)];
        chosenLine = line;
        const winSymbol = this.pickRandomSymbol();
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

      return { symbols: picks.map(symbol => ({ ...symbol })), freeSpinPositions };
    }

    // Classic 1x3 mode
    while (picks.length < count) {
      picks.push(this.pickRandomSymbol());
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

    return { symbols: picks.map(symbol => ({ ...symbol })), freeSpinPositions };
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

  private getExpandedLines(): number[][] {
    // Только горизонтали для 3x3
    return [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ];
  }

  private pickRandomSymbol(): NftGameSymbol {
    const index = Math.floor(Math.random() * this.selectedPool.length);
    return this.selectedPool[index];
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
