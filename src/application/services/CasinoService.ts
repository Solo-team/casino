import { User } from "../../domain/entities/User";
import { GameResult } from "../../domain/entities/GameResult";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { IGameResultRepository } from "../../domain/interfaces/IGameResultRepository";
import { IGame } from "../../domain/interfaces/IGame";
import { ISlotProvider, ISlotGame } from "../../domain/interfaces/ISlotProvider";

export class CasinoService {
  constructor(
    private userRepository: IUserRepository,
    private gameResultRepository: IGameResultRepository,
    private games: IGame[],
    private slotProviders: ISlotProvider[] = []
  ) {}

  async createUser(name: string, initialBalance: number = 1000): Promise<User> {
    const existingUser = await this.userRepository.findByName(name);
    if (existingUser) {
      throw new Error("User with this name already exists");
    }

    const user = new User(
      this.generateId(),
      name,
      initialBalance
    );
    await this.userRepository.save(user);
    return user;
  }

  async getUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async getUserByName(name: string): Promise<User | null> {
    return this.userRepository.findByName(name);
  }

  async deposit(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    user.deposit(amount);
    await this.userRepository.save(user);
    return user;
  }

  async playGame(
    userId: string,
    gameId: string,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult> {
    const user = await this.getUser(userId);
    
    // Проверяем обычные игры
    let game = this.games.find(g => g.id === gameId);
    
    // Если не найдено, проверяем провайдеры слотов
    if (!game) {
      const slotGame = this.findSlotGame(gameId);
      if (slotGame) {
        return this.playSlotGame(userId, slotGame.game, slotGame.provider, betAmount, gameData);
      }
      throw new Error("Game not found");
    }

    if (!game.validateBet(betAmount, user.balance)) {
      throw new Error("Invalid bet amount");
    }

    // Withdraw bet amount
    user.withdraw(betAmount);
    await this.userRepository.save(user);

    // Play game
    const result = await game.play(userId, betAmount, gameData);

    // Deposit payout
    if (result.payout > 0) {
      user.deposit(result.payout);
      await this.userRepository.save(user);
    }

    // Save result
    await this.gameResultRepository.save(result);

    return result;
  }

  private async playSlotGame(
    userId: string,
    slotGame: ISlotGame,
    provider: ISlotProvider,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult> {
    const user = await this.getUser(userId);

    if (betAmount < slotGame.minBet || betAmount > slotGame.maxBet) {
      throw new Error("Invalid bet amount");
    }

    if (user.balance < betAmount) {
      throw new Error("Insufficient balance");
    }

    // Withdraw bet amount
    user.withdraw(betAmount);
    await this.userRepository.save(user);

    // Play slot game
    const result = await provider.playGame(slotGame.id, userId, betAmount, gameData);

    // Deposit payout
    if (result.payout > 0) {
      user.deposit(result.payout);
      await this.userRepository.save(user);
    }

    // Save result
    await this.gameResultRepository.save(result);

    return result;
  }

  private findSlotGame(gameId: string): { game: ISlotGame; provider: ISlotProvider } | null {
    for (const provider of this.slotProviders) {
      const game = provider.getGame(gameId);
      if (game) {
        return { game, provider };
      }
    }
    return null;
  }

  async getUserHistory(userId: string): Promise<GameResult[]> {
    return this.gameResultRepository.findByUserId(userId);
  }

  getAvailableGames(): IGame[] {
    return this.games;
  }

  getSlotProviders(): ISlotProvider[] {
    return this.slotProviders;
  }

  getAllSlotGames(): ISlotGame[] {
    const games: ISlotGame[] = [];
    for (const provider of this.slotProviders) {
      games.push(...provider.getGames());
    }
    return games;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
