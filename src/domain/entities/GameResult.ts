export enum GameResultType {
  WIN = "WIN",
  LOSS = "LOSS",
  DRAW = "DRAW"
}

export class GameResult {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
    public readonly gameType: string,
    public readonly betAmount: number,
    public readonly resultType: GameResultType,
    public readonly payout: number,
    public readonly gameData: Record<string, any>,
    public readonly timestamp: Date = new Date()
  ) {
    if (betAmount <= 0) {
      throw new Error("Bet amount must be positive");
    }
  }

  get netProfit(): number {
    return this.payout - this.betAmount;
  }
}
