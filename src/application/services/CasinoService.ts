import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { User, AuthProvider } from "../../domain/entities/User";
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

const RESET_TOKEN_EXPIRY_HOURS = 1;

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

    // If user provided an email as the 'name' (UI accepts nickname or email), treat it as email
    const isEmail = /@/.test(normalizedName);
    if (isEmail) {
      const existingByEmail = await this.userRepository.findByEmail(normalizedName);
      if (existingByEmail) {
        throw new Error(`Email ${normalizedName} is already registered. Sign in using ${existingByEmail.provider === 'local' ? 'password' : existingByEmail.provider}.`);
      }
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = new User(
      this.generateId(),
      normalizedName,
      initialBalance,
      passwordHash,
      new Date(),
      isEmail ? normalizedName : null,
      'local',
      null
    );
    await this.userRepository.save(user);
    return user;
  }

  async registerOrLoginWithOAuth(
    provider: AuthProvider,
    providerId: string,
    email: string,
    name: string,
    initialBalance: number = 1000
  ): Promise<User> {
    // Check if user already exists with this OAuth provider
    let user = await this.userRepository.findByProviderId(provider, providerId);
    if (user) {
      return user;
    }

    // Check if user exists with this email
    user = await this.userRepository.findByEmail(email);
    if (user) {
      // If a user exists with this email but a different auth provider, reject
      if (user.provider !== provider) {
        const existingProvider = user.provider === 'local' ? 'password' : user.provider;
        throw new Error(
          `Email ${email} is already registered with ${existingProvider}. Sign in using ${existingProvider}.`
        );
      }

      // If provider matches but providerId differs, return existing user
      return user;
    }

    // Create new user
    const normalizedName = await this.generateUniqueName(name || email.split('@')[0]);
    const newUser = new User(
      this.generateId(),
      normalizedName,
      initialBalance,
      '', // No password for OAuth users
      new Date(),
      email,
      provider,
      providerId
    );
    await this.userRepository.save(newUser);
    return newUser;
  }

  private async generateUniqueName(baseName: string): Promise<string> {
    let name = baseName;
    let counter = 1;
    while (await this.userRepository.findByName(name)) {
      name = `${baseName}${counter}`;
      counter++;
    }
    return name;
  }

  async authenticateUser(name: string, password: string): Promise<User> {
    const normalizedName = this.normalizeName(name);
    // Try finding by name first
    let user = await this.userRepository.findByName(normalizedName);
    // If not found and input looks like an email, try lookup by email
    if (!user && /@/.test(normalizedName)) {
      user = await this.userRepository.findByEmail(normalizedName);
    }

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // If account is OAuth-only, disallow password login
    if (user.provider !== 'local') {
      throw new Error(`This account is registered with ${user.provider}. Please sign in using ${user.provider}.`);
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

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return null;
    }

    if (user.provider !== 'local') {
      throw new Error("Cannot reset password for OAuth accounts. Please sign in with " + user.provider);
    }

    const resetToken = randomUUID();
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
    user.setResetToken(resetToken, expiry);
    await this.userRepository.save(user);
    
    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.ensurePasswordStrength(newPassword);

    const user = await this.userRepository.findByResetToken(token);
    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    if (!user.isResetTokenValid(token)) {
      throw new Error("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    user.updatePasswordHash(passwordHash);
    user.clearResetToken();
    await this.userRepository.save(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.getUser(userId);
    
    if (user.provider !== 'local') {
      throw new Error("Cannot change password for OAuth accounts");
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new Error("Current password is incorrect");
    }

    this.ensurePasswordStrength(newPassword);
    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    user.updatePasswordHash(passwordHash);
    await this.userRepository.save(user);
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
