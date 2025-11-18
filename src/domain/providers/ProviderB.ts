import { BaseSlotProvider } from "./BaseSlotProvider";
import { ISlotGame } from "../interfaces/ISlotProvider";
import { GameResult, GameResultType } from "../entities/GameResult";

const SYMBOLS_B = ["⚡", "🔥", "💫", "🌟", "🎯", "🎲", "🏆", "👑"];

export class ProviderB extends BaseSlotProvider {
  readonly id = "provider-b";
  readonly name = "Provider B";
  readonly description = "Экшн слоты с высокими выплатами";

  getGames(): ISlotGame[] {
    return [
      {
        id: "thunder-strike",
        name: "Thunder Strike",
        minBet: 2,
        maxBet: 200,
        description: "Мощные удары молнии",
        imageUrl: "/images/thunder-strike.jpg"
      },
      {
        id: "royal-crown",
        name: "Royal Crown",
        minBet: 10,
        maxBet: 1000,
        description: "Королевские слоты",
        imageUrl: "/images/royal-crown.jpg"
      },
      {
        id: "lucky-wheel",
        name: "Lucky Wheel",
        minBet: 1,
        maxBet: 500,
        description: "Колесо удачи",
        imageUrl: "/images/lucky-wheel.jpg"
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
      this.getRandomSymbol(),
      this.getRandomSymbol() // 4 барабана для этого провайдера
    ];
  }

  private getRandomSymbol(): string {
    return SYMBOLS_B[Math.floor(Math.random() * SYMBOLS_B.length)];
  }

  private calculatePayout(betAmount: number, reels: string[], gameId: string): number {
    // Проверка на 4 одинаковых
    if (reels[0] === reels[1] && reels[1] === reels[2] && reels[2] === reels[3]) {
      const symbol = reels[0];
      const symbolIndex = SYMBOLS_B.indexOf(symbol);
      
      if (gameId === "royal-crown") {
        if (symbol === "👑") {
          return betAmount * 200;
        }
        return betAmount * (symbolIndex + 1) * 5;
      }
      
      if (symbol === "👑") {
        return betAmount * 100;
      }
      return betAmount * (symbolIndex + 1) * 4;
    }

    // Проверка на 3 одинаковых
    const counts: Record<string, number> = {};
    for (const symbol of reels) {
      counts[symbol] = (counts[symbol] || 0) + 1;
    }
    
    for (const [symbol, count] of Object.entries(counts)) {
      if (count >= 3) {
        const symbolIndex = SYMBOLS_B.indexOf(symbol);
        return betAmount * (symbolIndex + 1) * 2;
      }
    }

    // Проверка на 2 одинаковых
    for (const [_symbol, count] of Object.entries(counts)) {
      if (count >= 2) {
        return betAmount * 1.2;
      }
    }

    return 0;
  }
}
