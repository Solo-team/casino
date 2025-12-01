export type AuthProvider = 'local' | 'google';

export class User {
  constructor(
    public readonly id: string,
    public name: string,
    private _balance: number,
    private _passwordHash: string,
    public readonly createdAt: Date = new Date(),
    public readonly email: string | null = null,
    public readonly provider: AuthProvider = 'local',
    public readonly providerId: string | null = null,
    private _resetToken: string | null = null,
    private _resetTokenExpiry: Date | null = null
  ) {
    if (_balance < 0) {
      throw new Error("Balance cannot be negative");
    }
    if (provider === 'local' && !_passwordHash) {
      throw new Error("Password hash is required for local auth");
    }
  }

  get balance(): number {
    return this._balance;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get resetToken(): string | null {
    return this._resetToken;
  }

  get resetTokenExpiry(): Date | null {
    return this._resetTokenExpiry;
  }

  updatePasswordHash(nextHash: string): void {
    if (!nextHash) {
      throw new Error("Password hash cannot be empty");
    }
    this._passwordHash = nextHash;
  }

  setResetToken(token: string, expiry: Date): void {
    this._resetToken = token;
    this._resetTokenExpiry = expiry;
  }

  clearResetToken(): void {
    this._resetToken = null;
    this._resetTokenExpiry = null;
  }

  isResetTokenValid(token: string): boolean {
    if (!this._resetToken || !this._resetTokenExpiry) return false;
    if (this._resetToken !== token) return false;
    return this._resetTokenExpiry > new Date();
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }
    this._balance += amount;
  }

  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error("Withdraw amount must be positive");
    }
    if (this._balance < amount) {
      throw new Error("Insufficient balance");
    }
    this._balance -= amount;
  }

  canBet(amount: number): boolean {
    return this._balance >= amount && amount > 0;
  }

  toJSON(): { id: string; name: string; balance: number; createdAt: Date; email: string | null; provider: AuthProvider } {
    return {
      id: this.id,
      name: this.name,
      balance: this.balance,
      createdAt: this.createdAt,
      email: this.email,
      provider: this.provider
    };
  }
}
