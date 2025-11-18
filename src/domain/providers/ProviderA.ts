import { BaseSlotProvider } from "./BaseSlotProvider";
import { ISlotGame } from "../interfaces/ISlotProvider";
import { GameResult, GameResultType } from "../entities/GameResult";

const SYMBOLS_A = ["🍎", "🍌", "🍊", "🍇", "🔔", "⭐", "💎", "🎰"];

export class ProviderA extends BaseSlotProvider {
  readonly id = "provider-a";
  readonly name = "Provider A";
  readonly description = "Классические слоты с фруктами";

  getGames(): ISlotGame[] {
    return [
      {
        id: "fruit-slots",
        name: "Fruit Slots",
        minBet: 1,
        maxBet: 100,
        description: "Классические фруктовые слоты",
        imageUrl: "/images/fruit-slots.jpg"
      },
      {
        id: "diamond-riches",
        name: "Diamond Riches",
        minBet: 5,
        maxBet: 500,
        description: "Слоты с алмазами и драгоценностями",
        imageUrl: "/images/diamond-riches.jpg"
      }
    ];
  }

  async playGame(
    gameId: string,
    userId: string,
    betAmount: number,
    _gameData?: Record<string, any>
  ): Promise<GameResult> {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (!this.validateBet(betAmount, game)) {
      throw new Error("Invalid bet amount");
    }

    const reels = this.spinReels();
    const payout = this.calculatePayout(betAmount, reels, gameId);
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
        gameId,
        reels,
        symbols: reels.join(" ")
      }
    );
  }

  private spinReels(): string[] {
    return [
      this.getRandomSymbol(),
      this.getRandomSymbol(),
      this.getRandomSymbol()
    ];
  }

  private getRandomSymbol(): string {
    return SYMBOLS_A[Math.floor(Math.random() * SYMBOLS_A.length)];
  }

  private calculatePayout(betAmount: number, reels: string[], gameId: string): number {
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      const symbol = reels[0];
      const symbolIndex = SYMBOLS_A.indexOf(symbol);
      
      if (gameId === "diamond-riches") {
        // Выше выплаты для Diamond Riches
        if (symbol === "💎") {
          return betAmount * 100;
        }
        if (symbol === "🎰") {
          return betAmount * 50;
        }
        return betAmount * (symbolIndex + 1) * 3;
      } else {
        // Стандартные выплаты для Fruit Slots
        if (symbol === "💎") {
          return betAmount * 50;
        }
        if (symbol === "🎰") {
          return betAmount * 30;
        }
        return betAmount * (symbolIndex + 1) * 2;
      }
    }

    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      return betAmount * 1.5;
    }

    return 0;
  }
}
