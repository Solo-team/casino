import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"];

export class SlotMachineGame implements IGame {
  readonly name = "Slot Machine";
  readonly id = "slot-machine";
  private readonly minBet = 1;
  private readonly maxBet = 100;

  validateBet(betAmount: number, userBalance: number): boolean {
    return (
      betAmount >= this.minBet &&
      betAmount <= this.maxBet &&
      betAmount <= userBalance
    );
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
    const reels = this.spinReels();
    const payout = this.calculatePayout(betAmount, reels);
    const resultType = payout > 0 ? GameResultType.WIN : GameResultType.LOSS;

    return new GameResult(
      this.generateGameId(),
      userId,
      this.name,
      betAmount,
      resultType,
      payout,
      {
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
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  private calculatePayout(betAmount: number, reels: string[]): number {
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      const symbol = reels[0];
      const symbolIndex = SYMBOLS.indexOf(symbol);
      
      const multiplier = (symbolIndex + 1) * 2;
      
      if (symbol === "7️⃣") {
        return betAmount * 50;
      }
      
      if (symbol === "💎") {
        return betAmount * 20;
      }
      
      return betAmount * multiplier;
    }

    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      return betAmount * 1.5;
    }

    return 0;
  }

  private generateGameId(): string {
    return `slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
