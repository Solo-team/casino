import { BaseSlotProvider } from "./BaseSlotProvider";
import { ISlotGame } from "../interfaces/ISlotProvider";
import { GameResult, GameResultType } from "../entities/GameResult";

type TrailVolatilityKey = "steady" | "balanced" | "berserk";
type TrailLaneKey = "left" | "center" | "right";

interface TrailVolatility {
  readonly bustChance: number;
  readonly jackpotChance: number;
  readonly featureChance: number;
  readonly minBoost: number;
  readonly maxBoost: number;
}

interface TrailLane {
  readonly label: string;
  readonly modifier: number;
}

interface TrailSegment {
  readonly step: number;
  readonly event: "boost" | "jackpot" | "drift" | "glitch";
  readonly deltaMultiplier: number;
  readonly totalMultiplier: number;
}

const VOLATILITY: Record<TrailVolatilityKey, TrailVolatility> = {
  steady: {
    bustChance: 0.1,
    jackpotChance: 0.05,
    featureChance: 0.25,
    minBoost: 1.05,
    maxBoost: 1.4
  },
  balanced: {
    bustChance: 0.18,
    jackpotChance: 0.07,
    featureChance: 0.18,
    minBoost: 1.1,
    maxBoost: 1.9
  },
  berserk: {
    bustChance: 0.28,
    jackpotChance: 0.1,
    featureChance: 0.2,
    minBoost: 1.2,
    maxBoost: 2.7
  }
};

const LANES: Record<TrailLaneKey, TrailLane> = {
  left: { label: "Glitch Lane", modifier: 0.92 },
  center: { label: "Neon Lane", modifier: 1 },
  right: { label: "Overdrive Lane", modifier: 1.12 }
};

export class InteractiveProvider extends BaseSlotProvider {
  readonly id = "interactive-labs";
  readonly name = "Interactive Labs";
  readonly description = "Story-led crash slots where players pick the ride before spinning.";

  getGames(): ISlotGame[] {
    return [
      {
        id: "neon-trails",
        name: "Neon Trails",
        minBet: 2,
        maxBet: 250,
        description: "Pick a lane and ride neon waves. Stack multipliers, dodge glitches.",
        imageUrl: "/images/neon-trails.jpg"
      },
      {
        id: "vault-heist",
        name: "Vault Heist",
        minBet: 5,
        maxBet: 400,
        description: "Crack the vault, bank multipliers, and bail before security locks you out.",
        imageUrl: "/images/vault-heist.jpg"
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

    const volatilityKey = this.pickVolatility(gameData?.volatility);
    const laneKey = this.pickLane(gameData?.lane);
    const volatility = VOLATILITY[volatilityKey];
    const lane = LANES[laneKey];
    const trailLength = gameId === "vault-heist" ? 4 : 3;

    const { segments, busted, finalMultiplier, summary } = this.runTrail(
      trailLength,
      laneKey,
      lane.modifier,
      volatility
    );

    const payout = busted ? 0 : Number((betAmount * finalMultiplier).toFixed(2));
    const resultType = payout > 0 ? GameResultType.WIN : GameResultType.LOSS;

    return new GameResult(
      this.generateGameId(),
      userId,
      `${this.name} - ${game.name}`,
      betAmount,
      resultType,
      payout,
      {
        provider: this.id,
        gameId: game.id,
        lane: laneKey,
        laneLabel: lane.label,
        volatility: volatilityKey,
        segments,
        finalMultiplier: Number(finalMultiplier.toFixed(2)),
        busted,
        summary
      }
    );
  }

  private pickVolatility(value?: string): TrailVolatilityKey {
    if (!value) return "balanced";
    const key = value.toLowerCase() as TrailVolatilityKey;
    return VOLATILITY[key] ? key : "balanced";
  }

  private pickLane(value?: string): TrailLaneKey {
    if (!value) return "center";
    const key = value.toLowerCase() as TrailLaneKey;
    return LANES[key] ? key : "center";
  }

  private runTrail(
    trailLength: number,
    lane: TrailLaneKey,
    laneModifier: number,
    volatility: TrailVolatility
  ): {
    segments: TrailSegment[];
    busted: boolean;
    finalMultiplier: number;
    summary: string;
  } {
    const segments: TrailSegment[] = [];
    let multiplier = 1;
    let busted = false;

    for (let step = 1; step <= trailLength; step += 1) {
      const roll = Math.random();

      if (roll < volatility.bustChance) {
        segments.push({
          step,
          event: "glitch",
          deltaMultiplier: -1,
          totalMultiplier: 0
        });
        multiplier = 0;
        busted = true;
        break;
      }

      if (roll < volatility.bustChance + volatility.jackpotChance) {
        const boost = this.randomInRange(volatility.maxBoost + 0.6, volatility.maxBoost + 1.4);
        multiplier = Number((multiplier * boost * laneModifier).toFixed(3));
        segments.push({
          step,
          event: "jackpot",
          deltaMultiplier: boost - 1,
          totalMultiplier: multiplier
        });
        continue;
      }

      const isDrift = roll < volatility.bustChance + volatility.jackpotChance + volatility.featureChance;
      const boost = isDrift
        ? this.randomInRange(1.02, volatility.minBoost)
        : this.randomInRange(volatility.minBoost, volatility.maxBoost);

      multiplier = Number((multiplier * boost * laneModifier).toFixed(3));
      segments.push({
        step,
        event: isDrift ? "drift" : "boost",
        deltaMultiplier: boost - 1,
        totalMultiplier: multiplier
      });
    }

    const summary = busted
      ? "A glitch cut the ride short. Pick a calmer mode or switch lanes to stay in."
      : `You threaded the ${LANES[lane].label.toLowerCase()} for ${trailLength} segments and cashed out at ${multiplier.toFixed(2)}x.`;

    return {
      segments,
      busted,
      finalMultiplier: multiplier,
      summary
    };
  }

  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
