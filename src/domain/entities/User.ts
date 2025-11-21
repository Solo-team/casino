export class User {
  constructor(
    public readonly id: string,
    public name: string,
    private _balance: number,
    private _passwordHash: string,
    public readonly createdAt: Date = new Date()
  ) {
    if (_balance < 0) {
      throw new Error("Balance cannot be negative");
    }
    if (!_passwordHash) {
      throw new Error("Password hash is required");
    }
  }

  get balance(): number {
    return this._balance;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  updatePasswordHash(nextHash: string): void {
    if (!nextHash) {
      throw new Error("Password hash cannot be empty");
    }
    this._passwordHash = nextHash;
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

  toJSON(): { id: string; name: string; balance: number; createdAt: Date } {
    return {
      id: this.id,
      name: this.name,
      balance: this.balance,
      createdAt: this.createdAt
    };
  }
}
