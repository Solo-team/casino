import { BaseSlotProvider } from "./BaseSlotProvider";
import { ISlotGame } from "../interfaces/ISlotProvider";
import { GameResult, GameResultType } from "../entities/GameResult";

type SkySymbol = "crown" | "mask" | "fruit" | "gem" | "bolt" | "idol" | "orb" | "scatter";
type VolatilityKey = "calm" | "standard" | "fever";

interface SymbolConfig {
  readonly id: SkySymbol;
  readonly weight: number;
  readonly baseMultiplier: number;
  readonly label: string;
  readonly tier: "low" | "mid" | "high" | "scatter";
}

interface VolatilityConfig {
  readonly minCascades: number;
  readonly maxCascades: number;
  readonly bombChance: number;
  readonly maxBombs: number;
}

interface CascadeHit {
  readonly symbol: SkySymbol;
  readonly label: string;
  readonly count: number;
  readonly baseMultiplier: number;
  readonly win: number;
}

interface CascadeStep {
  readonly step: number;
  readonly grid: SkySymbol[][];
  readonly hits: CascadeHit[];
  readonly scatterCount: number;
  readonly bombMultipliers: number[];
  readonly baseWin: number;
  readonly multiplierTotal: number;
  readonly payout: number;
  readonly runningTotal: number;
  readonly flavor: string;
}

const GRID_COLUMNS = 6;
const GRID_ROWS = 5;
const HIT_THRESHOLD = 8;
const BOMB_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 25];

const SYMBOLS: SymbolConfig[] = [
  { id: "fruit", weight: 5, baseMultiplier: 0.35, label: "Ambrosia Fruit", tier: "low" },
  { id: "mask", weight: 5, baseMultiplier: 0.45, label: "Oracle Mask", tier: "low" },
  { id: "gem", weight: 4, baseMultiplier: 0.55, label: "Aether Gem", tier: "mid" },
  { id: "crown", weight: 3, baseMultiplier: 0.7, label: "Sky Crown", tier: "mid" },
  { id: "idol", weight: 2, baseMultiplier: 0.9, label: "Marble Idol", tier: "high" },
  { id: "bolt", weight: 2, baseMultiplier: 1.1, label: "Zeus Bolt", tier: "high" },
  { id: "orb", weight: 1, baseMultiplier: 1.6, label: "Golden Orb", tier: "high" },
  { id: "scatter", weight: 1, baseMultiplier: 0, label: "Lantern Scatter", tier: "scatter" }
];

const VOLATILITY: Record<VolatilityKey, VolatilityConfig> = {
  calm: {
    minCascades: 1,
    maxCascades: 2,
    bombChance: 0.45,
    maxBombs: 1
  },
  standard: {
    minCascades: 2,
    maxCascades: 3,
    bombChance: 0.58,
    maxBombs: 2
  },
  fever: {
    minCascades: 2,
    maxCascades: 3,
    bombChance: 0.7,
    maxBombs: 3
  }
};

export class MythicSlotsProvider extends BaseSlotProvider {
  readonly id = "mythic-forge";
  readonly name = "Mythic Forge";
  readonly description = "Olympus-grade cascade slots with candy bombs and thunder multipliers.";

  getGames(): ISlotGame[] {
    return [
      {
        id: "aether-bonanza",
        name: "Aether Bonanza",
        minBet: 2,
        maxBet: 750,
        description: "Scatter-pay tumbles with lightning bombs and ambrosia sweets.",
        imageUrl: "/images/aether-bonanza.jpg"
      }
    ];
  }

  async playGame(
    gameId: string,
    userId: string,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult> {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (!this.validateBet(betAmount, game)) {
      throw new Error("Invalid bet amount");
    }

    const volatilityKey = this.pickVolatility(gameData?.mode);
    const cascades = this.runCascades(betAmount, volatilityKey);
    const totalPayout = Number(
      cascades.reduce((sum, cascade) => sum + cascade.payout, 0).toFixed(2)
    );
    const finalMultiplier = totalPayout > 0 ? Number((totalPayout / betAmount).toFixed(2)) : 0;
    const maxScatter = cascades.reduce((max, cascade) => Math.max(max, cascade.scatterCount), 0);
    const bonusTriggered = maxScatter >= 4 || finalMultiplier >= 8;
    const resultType = totalPayout > 0 ? GameResultType.WIN : GameResultType.LOSS;

    return new GameResult(
      this.generateGameId(),
      userId,
      `${this.name} - ${game.name}`,
      betAmount,
      resultType,
      totalPayout,
      {
        provider: this.id,
        gameId: game.id,
        cascades,
        finalMultiplier,
        bonusTriggered,
        maxScatter,
        volatility: volatilityKey,
        summary: bonusTriggered
          ? "Sky lanterns erupted and the forge paid a thunder bonus."
          : "Chain tumbles to wake the forge and land four lanterns for free spins."
      }
    );
  }

  private runCascades(betAmount: number, volatilityKey: VolatilityKey): CascadeStep[] {
    const config = VOLATILITY[volatilityKey];
    const cascades: CascadeStep[] = [];
    const cascadeCount = this.randomInt(config.minCascades, config.maxCascades);
    let runningTotal = 0;

    for (let step = 1; step <= cascadeCount; step += 1) {
      const grid = this.buildGrid();
      const { hits, baseWin, scatterCount } = this.scoreGrid(grid, betAmount);
      const bombMultipliers =
        baseWin > 0 ? this.rollBombs(config, scatterCount) : [];
      const multiplierTotal = bombMultipliers.length
        ? bombMultipliers.reduce((sum, value) => sum + value, 0)
        : 1;
      const payout = Number((baseWin * multiplierTotal).toFixed(2));
      runningTotal = Number((runningTotal + payout).toFixed(2));

      cascades.push({
        step,
        grid,
        hits,
        scatterCount,
        bombMultipliers,
        baseWin,
        multiplierTotal,
        payout,
        runningTotal,
        flavor: this.describeCascade(hits, scatterCount, bombMultipliers, payout)
      });

      if (!hits.length && scatterCount < 3 && step >= config.minCascades) {
        break;
      }
    }

    return cascades;
  }

  private buildGrid(): SkySymbol[][] {
    return Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLUMNS }, () => this.weightedSymbol())
    );
  }

  private scoreGrid(
    grid: SkySymbol[][],
    betAmount: number
  ): { hits: CascadeHit[]; baseWin: number; scatterCount: number } {
    const counts: Record<SkySymbol, number> = {
      crown: 0,
      mask: 0,
      fruit: 0,
      gem: 0,
      bolt: 0,
      idol: 0,
      orb: 0,
      scatter: 0
    };

    for (const row of grid) {
      for (const symbol of row) {
        counts[symbol] = (counts[symbol] ?? 0) + 1;
      }
    }

    const hits: CascadeHit[] = [];
    let baseWin = 0;

    for (const symbolConfig of SYMBOLS) {
      if (symbolConfig.id === "scatter") {
        continue;
      }
      const count = counts[symbolConfig.id] ?? 0;
      if (count >= HIT_THRESHOLD) {
        const multiplierSteps = count - HIT_THRESHOLD + 1;
        const win = Number((betAmount * symbolConfig.baseMultiplier * multiplierSteps).toFixed(2));
        baseWin += win;
        hits.push({
          symbol: symbolConfig.id,
          label: symbolConfig.label,
          count,
          baseMultiplier: symbolConfig.baseMultiplier,
          win
        });
      }
    }

    return {
      hits,
      baseWin: Number(baseWin.toFixed(2)),
      scatterCount: counts.scatter ?? 0
    };
  }

  private rollBombs(config: VolatilityConfig, scatterCount: number): number[] {
    const bombs: number[] = [];
    const maxBombs = scatterCount >= 4 ? config.maxBombs + 1 : config.maxBombs;

    for (let index = 0; index < maxBombs; index += 1) {
      const guarantee = scatterCount >= 4 && index === 0;
      if (guarantee || Math.random() < config.bombChance) {
        bombs.push(this.pickBomb());
      }
    }

    return bombs.sort((a, b) => b - a);
  }

  private pickBomb(): number {
    return BOMB_VALUES[this.randomInt(0, BOMB_VALUES.length - 1)];
  }

  private weightedSymbol(): SkySymbol {
    const totalWeight = SYMBOLS.reduce((total, symbol) => total + symbol.weight, 0);
    const roll = Math.random() * totalWeight;
    let accumulator = 0;

    for (const symbol of SYMBOLS) {
      accumulator += symbol.weight;
      if (roll <= accumulator) {
        return symbol.id;
      }
    }

    return SYMBOLS[0].id;
  }

  private describeCascade(
    hits: CascadeHit[],
    scatterCount: number,
    bombs: number[],
    payout: number
  ): string {
    if (payout === 0 && scatterCount >= 3) {
      return "Lanterns are building - keep spinning for the fourth to unlock free spins.";
    }

    if (bombs.length) {
      const headline = `Bombs x${bombs.reduce((sum, value) => sum + value, 0)} exploded`;
      if (hits.length) {
        return `${headline} on ${hits.length} clusters.`;
      }
      return `${headline}, but no clusters landed.`;
    }

    if (hits.length >= 2) {
      return "Double clusters connected. The forge hums louder.";
    }

    if (hits.length === 1) {
      return `${hits[0].label} cluster paid ${hits[0].win.toFixed(2)}.`;
    }

    return "No cluster wins this tumble.";
  }

  private pickVolatility(mode?: string): VolatilityKey {
    if (!mode) return "standard";
    const normalized = mode.toLowerCase() as VolatilityKey;
    return VOLATILITY[normalized] ? normalized : "standard";
  }

  private randomInt(min: number, max: number): number {
    const minValue = Math.ceil(min);
    const maxValue = Math.floor(max);
    return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  }
}
