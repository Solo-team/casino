import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";

interface SymbolConfig {
  id: string;
  label: string;
  weight: number;
  multipliers: Record<number, number>;
  feature?: "lightning" | "ember";
}

interface HitDetail {
  symbol: string;
  label: string;
  count: number;
  multiplier: number;
  payout: number;
}

interface Evaluation {
  hits: HitDetail[];
  baseMultiplier: number;
  lightningCount: number;
  emberCount: number;
  zeusCount: number;
  hadesCount: number;
}

const GRID_COLUMNS = 5;
const GRID_ROWS = 4;
const SYMBOLS: SymbolConfig[] = [
  { id: "zeus", label: "Zeus", weight: 8, multipliers: { 3: 1.8, 4: 4.2, 5: 9, 6: 15 } },
  { id: "hades", label: "Hades", weight: 8, multipliers: { 3: 1.6, 4: 3.8, 5: 8.5, 6: 14 } },
  { id: "pegasus", label: "Pegasus", weight: 10, multipliers: { 3: 1.2, 4: 2.4, 5: 5.2, 6: 9 } },
  { id: "cerberus", label: "Cerberus", weight: 10, multipliers: { 3: 1.1, 4: 2.1, 5: 4.4, 6: 7.5 } },
  { id: "helm", label: "Olympus Helm", weight: 12, multipliers: { 3: 0.8, 4: 1.4, 5: 2.5, 6: 4 } },
  { id: "laurel", label: "Laurel", weight: 12, multipliers: { 3: 0.7, 4: 1.2, 5: 2.1, 6: 3.4 } },
  { id: "coin", label: "Drachma", weight: 14, multipliers: { 3: 0.5, 4: 0.9, 5: 1.5, 6: 2.5 } },
  { id: "wild", label: "Twin Wild", weight: 5, multipliers: { 3: 3, 4: 8, 5: 20, 6: 30 } },
  { id: "lightning", label: "Lightning", weight: 4, multipliers: {}, feature: "lightning" },
  { id: "ember", label: "Ember", weight: 4, multipliers: {}, feature: "ember" }
];

export class ZewsAndHidesGame implements IGame {
  readonly name = "Zews and Hides";
  readonly id = "zews-hides";
  private readonly minBet = 10;
  private readonly maxBet = 500;

  validateBet(betAmount: number, userBalance: number): boolean {
    return betAmount >= this.minBet && betAmount <= this.maxBet && betAmount <= userBalance;
  }

  getMinBet(): number {
    return this.minBet;
  }

  getMaxBet(): number {
    return this.maxBet;
  }

  async play(
    userId: string,
    betAmount: number,
    _gameData?: Record<string, any>
  ): Promise<GameResult> {
    const grid = this.generateGrid();
    const evaluation = this.evaluateGrid(grid, betAmount);
    const lightningBoost = this.calculateLightningBoost(evaluation.lightningCount);
    const emberBoost = this.calculateEmberBoost(evaluation.emberCount);
    const duelTriggered = evaluation.zeusCount >= 4 && evaluation.hadesCount >= 4;
    const duelBonus = duelTriggered ? this.randomBetween(4, 9.5) : 0;

    const paddedBase = evaluation.baseMultiplier || (lightningBoost ? 0.75 : emberBoost ? 0.5 : 0);
    const boostedMultiplier = paddedBase * Math.max(1, lightningBoost) * Math.max(1, emberBoost);
    const finalMultiplier = boostedMultiplier + duelBonus;
    const payout = this.roundAmount(betAmount * finalMultiplier);

    const resultType = payout > 0 ? GameResultType.WIN : GameResultType.LOSS;
    const zeusMeter = Math.min(100, evaluation.zeusCount * 12 + evaluation.lightningCount * 14 + this.randomBetween(4, 9));
    const hadesMeter = Math.min(100, evaluation.hadesCount * 12 + evaluation.emberCount * 14 + this.randomBetween(4, 9));

    const segments = this.buildSegments({
      baseMultiplier: paddedBase,
      lightningBoost,
      emberBoost,
      duelBonus,
      finalMultiplier
    });

    const summary = this.buildSummary({
      payout,
      betAmount,
      lightningBoost,
      emberBoost,
      duelTriggered
    });

    return new GameResult(
      this.generateGameId(),
      userId,
      this.name,
      betAmount,
      resultType,
      payout,
      {
        grid,
        hits: evaluation.hits,
        segments,
        summary,
        zeusMeter,
        hadesMeter,
        duelTriggered,
        lightningBoost,
        emberBoost,
        finalMultiplier
      }
    );
  }

  private generateGrid(): string[][] {
    const rows: string[][] = [];
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const columns: string[] = [];
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        columns.push(this.pickSymbol());
      }
      rows.push(columns);
    }

    if (Math.random() < 0.55) {
      const target = this.pickSymbol(true);
      const targetRow = Math.floor(Math.random() * GRID_ROWS);
      for (let col = 0; col < 3; col += 1) {
        rows[targetRow][col] = target;
      }
    }

    return rows;
  }

  private pickSymbol(avoidFeature = false): string {
    const pool = avoidFeature ? SYMBOLS.filter(symbol => !symbol.feature) : SYMBOLS;
    const totalWeight = pool.reduce((sum, symbol) => sum + symbol.weight, 0);
    const roll = Math.random() * totalWeight;
    let accumulator = 0;
    for (const symbol of pool) {
      accumulator += symbol.weight;
      if (roll <= accumulator) {
        return symbol.id;
      }
    }
    return pool[pool.length - 1]?.id ?? "zeus";
  }

  private evaluateGrid(grid: string[][], betAmount: number): Evaluation {
    const counts: Record<string, number> = {};
    for (const row of grid) {
      for (const symbol of row) {
        counts[symbol] = (counts[symbol] ?? 0) + 1;
      }
    }

    const hits: HitDetail[] = [];
    let baseMultiplier = 0;

    for (const config of SYMBOLS) {
      if (!Object.keys(config.multipliers).length) {
        continue;
      }
      const count = counts[config.id] ?? 0;
      const multiplier = this.resolveMultiplier(config.multipliers, count);
      if (multiplier > 0) {
        const payout = this.roundAmount(betAmount * multiplier);
        baseMultiplier += multiplier;
        hits.push({
          symbol: config.id,
          label: config.label,
          count,
          multiplier,
          payout
        });
      }
    }

    return {
      hits,
      baseMultiplier,
      lightningCount: counts.lightning ?? 0,
      emberCount: counts.ember ?? 0,
      zeusCount: counts.zeus ?? 0,
      hadesCount: counts.hades ?? 0
    };
  }

  private resolveMultiplier(thresholds: Record<number, number>, count: number): number {
    const entries = Object.entries(thresholds)
      .map(([threshold, value]) => ({ threshold: Number(threshold), value }))
      .sort((a, b) => a.threshold - b.threshold);

    let result = 0;
    for (const entry of entries) {
      if (count >= entry.threshold) {
        result = entry.value;
      }
    }
    return result;
  }

  private calculateLightningBoost(lightningCount: number): number {
    if (lightningCount < 2) {
      return 0;
    }
    return 1 + lightningCount * 0.35 + this.randomBetween(0.2, 0.8);
  }

  private calculateEmberBoost(emberCount: number): number {
    if (emberCount < 3) {
      return 0;
    }
    return 1 + emberCount * 0.3 + this.randomBetween(0.15, 0.55);
  }

  private buildSegments(params: {
    baseMultiplier: number;
    lightningBoost: number;
    emberBoost: number;
    duelBonus: number;
    finalMultiplier: number;
  }) {
    const segments: Array<Record<string, any>> = [];
    let runningMultiplier = params.baseMultiplier;

    if (params.baseMultiplier > 0) {
      segments.push({
        step: 1,
        event: "base",
        totalMultiplier: this.roundToDisplay(runningMultiplier),
        summary: "Base hits connected across the reels",
        deltaMultiplier: runningMultiplier
      });
    }

    if (params.lightningBoost > 1) {
      runningMultiplier *= params.lightningBoost;
      segments.push({
        step: segments.length + 1,
        event: "lightning",
        totalMultiplier: this.roundToDisplay(runningMultiplier),
        deltaMultiplier: params.lightningBoost - 1,
        summary: "Zeus charges the board"
      });
    }

    if (params.emberBoost > 1) {
      runningMultiplier *= params.emberBoost;
      segments.push({
        step: segments.length + 1,
        event: "ember",
        totalMultiplier: this.roundToDisplay(runningMultiplier),
        deltaMultiplier: params.emberBoost - 1,
        summary: "Hades ignites bonus flames"
      });
    }

    if (params.duelBonus > 0) {
      segments.push({
        step: segments.length + 1,
        event: "duel",
        totalMultiplier: this.roundToDisplay(runningMultiplier + params.duelBonus),
        deltaMultiplier: params.duelBonus,
        summary: "Zeus and Hades clash for tribute"
      });
    }

    if (!segments.length) {
      segments.push({
        step: 1,
        event: "dry-spin",
        totalMultiplier: 0,
        deltaMultiplier: 0,
        summary: "Dead spin, no features fired"
      });
    }

    segments.push({
      step: segments.length + 1,
      event: "summary",
      totalMultiplier: this.roundToDisplay(params.finalMultiplier),
      deltaMultiplier: 0,
      summary: "Final tally"
    });

    return segments;
  }

  private buildSummary(params: {
    payout: number;
    betAmount: number;
    lightningBoost: number;
    emberBoost: number;
    duelTriggered: boolean;
  }): string {
    const parts: string[] = [];
    if (params.payout === 0) {
      return "No tribute collected this spin.";
    }
    parts.push(`Won ${params.payout.toFixed(2)} on a ${params.betAmount.toFixed(2)} stake.`);
    if (params.lightningBoost > 1) {
      parts.push("Zeus lightning amplified the board.");
    }
    if (params.emberBoost > 1) {
      parts.push("Hades flames stacked extra multipliers.");
    }
    if (params.duelTriggered) {
      parts.push("Dual fury bonus awarded from the clash.");
    }
    return parts.join(" ");
  }

  private roundAmount(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundToDisplay(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private generateGameId(): string {
    return `zews-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
