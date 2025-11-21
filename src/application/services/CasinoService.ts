import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../../domain/entities/User";
import { GameResult } from "../../domain/entities/GameResult";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { IGameResultRepository } from "../../domain/interfaces/IGameResultRepository";
import { IGame } from "../../domain/interfaces/IGame";
import { ISlotProvider, ISlotGame } from "../../domain/interfaces/ISlotProvider";
import { AppDataSource } from "../../infrastructure/database/data-source";
import { TypeOrmUserRepository } from "../../infrastructure/repositories/TypeOrmUserRepository";
import { TypeOrmGameResultRepository } from "../../infrastructure/repositories/TypeOrmGameResultRepository";

const PASSWORD_SALT_ROUNDS = process.env.PASSWORD_SALT_ROUNDS 
  ? parseInt(process.env.PASSWORD_SALT_ROUNDS, 10) 
  : 10;

export class CasinoService {
  constructor(
    private userRepository: IUserRepository,
    private gameResultRepository: IGameResultRepository,
    private games: IGame[],
    private slotProviders: ISlotProvider[] = []
  ) {}

  async registerUser(name: string, password: string, initialBalance: number = 1000): Promise<User> {
    const normalizedName = this.normalizeName(name);
    this.ensurePasswordStrength(password);
    if (initialBalance < 0) {
      throw new Error("Initial balance cannot be negative");
    }

    const existingUser = await this.userRepository.findByName(normalizedName);
    if (existingUser) {
      throw new Error("User with this name already exists");
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = new User(
      this.generateId(),
      normalizedName,
      initialBalance,
      passwordHash
    );
    await this.userRepository.save(user);
    return user;
  }

  async authenticateUser(name: string, password: string): Promise<User> {
    const normalizedName = this.normalizeName(name);
    const user = await this.userRepository.findByName(normalizedName);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

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
    return this.userRepository.findByName(this.normalizeName(name));
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
    
    let game = this.games.find(g => g.id === gameId);
    
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

    user.withdraw(betAmount);
    const result = await game.play(userId, betAmount, gameData);

    if (result.payout > 0) {
      user.deposit(result.payout);
    }

    await this.persistGameSession(user, result);

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

    user.withdraw(betAmount);
    const result = await provider.playGame(slotGame.id, userId, betAmount, gameData);

    if (result.payout > 0) {
      user.deposit(result.payout);
    }

    await this.persistGameSession(user, result);

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

  private normalizeName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Name is required");
    }
    return trimmed;
  }

  private ensurePasswordStrength(password: string): void {
    if (!password || password.trim().length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
  }

  private generateId(): string {
    return randomUUID();
  }

  private async persistGameSession(user: User, result: GameResult): Promise<void> {
    const isTypeOrmRepos =
      this.userRepository instanceof TypeOrmUserRepository &&
      this.gameResultRepository instanceof TypeOrmGameResultRepository;

    if (isTypeOrmRepos && AppDataSource.isInitialized) {
      const userRepo = this.userRepository as TypeOrmUserRepository;
      const resultRepo = this.gameResultRepository as TypeOrmGameResultRepository;
      await AppDataSource.manager.transaction(async manager => {
        await userRepo.saveWithManager(manager, user);
        await resultRepo.saveWithManager(manager, result);
      });
      return;
    }

    await this.userRepository.save(user);
    await this.gameResultRepository.save(result);
  }
}
