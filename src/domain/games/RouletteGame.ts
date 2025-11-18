import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";

export enum RouletteBetType {
  NUMBER = "NUMBER",
  RED = "RED",
  BLACK = "BLACK",
  EVEN = "EVEN",
  ODD = "ODD",
  LOW = "LOW", // 1-18
  HIGH = "HIGH" // 19-36
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export class RouletteGame implements IGame {
  readonly name = "Roulette";
  readonly id = "roulette";
  private readonly minBet = 5;
  private readonly maxBet = 500;

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
    gameData?: Record<string, any>
  ): Promise<GameResult> {
    const winningNumber = this.spinWheel();
    const betType = gameData?.betType as RouletteBetType || RouletteBetType.NUMBER;
    const betValue = gameData?.betValue;

    const isWin = this.checkWin(winningNumber, betType, betValue);
    const resultType = isWin ? GameResultType.WIN : GameResultType.LOSS;
    const payout = isWin
      ? this.calculatePayout(betAmount, betType)
      : 0;

    return new GameResult(
      this.generateGameId(),
      userId,
      this.name,
      betAmount,
      resultType,
      payout,
      {
        winningNumber,
        betType,
        betValue,
        isRed: RED_NUMBERS.includes(winningNumber),
        isBlack: BLACK_NUMBERS.includes(winningNumber)
      }
    );
  }

  private spinWheel(): number {
    return Math.floor(Math.random() * 37); // 0-36
  }

  private checkWin(
    winningNumber: number,
    betType: RouletteBetType,
    betValue?: any
  ): boolean {
    switch (betType) {
      case RouletteBetType.NUMBER:
        return winningNumber === betValue;
      case RouletteBetType.RED:
        return RED_NUMBERS.includes(winningNumber);
      case RouletteBetType.BLACK:
        return BLACK_NUMBERS.includes(winningNumber);
      case RouletteBetType.EVEN:
        return winningNumber !== 0 && winningNumber % 2 === 0;
      case RouletteBetType.ODD:
        return winningNumber !== 0 && winningNumber % 2 === 1;
      case RouletteBetType.LOW:
        return winningNumber >= 1 && winningNumber <= 18;
      case RouletteBetType.HIGH:
        return winningNumber >= 19 && winningNumber <= 36;
      default:
        return false;
    }
  }

  private calculatePayout(
    betAmount: number,
    betType: RouletteBetType
  ): number {
    switch (betType) {
      case RouletteBetType.NUMBER:
        return betAmount * 36; // 35:1 payout
      case RouletteBetType.RED:
      case RouletteBetType.BLACK:
      case RouletteBetType.EVEN:
      case RouletteBetType.ODD:
      case RouletteBetType.LOW:
      case RouletteBetType.HIGH:
        return betAmount * 2; // 1:1 payout
      default:
        return 0;
    }
  }

  private generateGameId(): string {
    return `roulette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
