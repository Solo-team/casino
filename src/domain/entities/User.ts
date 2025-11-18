export class User {
  constructor(
    public readonly id: string,
    public name: string,
    private _balance: number,
    public readonly createdAt: Date = new Date()
  ) {
    if (_balance < 0) {
      throw new Error("Balance cannot be negative");
    }
  }

  get balance(): number {
    return this._balance;
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
}
