export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED"
}

export enum PaymentMethod {
  CRYPTO = "CRYPTO"
}

export enum PaymentType {
  DEPOSIT = "DEPOSIT"
}

export interface PaymentMetadata {
  [key: string]: unknown;
}

export class PaymentTransaction {
  private _status: PaymentStatus;
  private _updatedAt: Date;
  private _completedAt: Date | null;
  private _txHash: string | null;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly type: PaymentType,
    public readonly method: PaymentMethod,
    public readonly provider: string,
    public readonly providerPaymentId?: string,
    public readonly address?: string,
    public readonly memo?: string,
    public readonly network?: string,
    status: PaymentStatus = PaymentStatus.PENDING,
    public readonly metadata: PaymentMetadata = {},
    public readonly createdAt: Date = new Date(),
    updatedAt: Date | null = null,
    public readonly expiresAt: Date | null = null,
    txHash: string | null = null,
    completedAt: Date | null = null
  ) {
    if (amount <= 0) {
      throw new Error("Payment amount must be positive");
    }
    if (!currency) {
      throw new Error("Payment currency is required");
    }
    if (!provider) {
      throw new Error("Payment provider is required");
    }

    this._status = status;
    this._updatedAt = updatedAt ?? new Date();
    this._completedAt = completedAt;
    this._txHash = txHash;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get txHash(): string | null {
    return this._txHash;
  }

  markProcessing(): void {
    if (this._status !== PaymentStatus.PENDING) {
      return;
    }
    this.transitionTo(PaymentStatus.PROCESSING);
  }

  markFailed(): void {
    if (this.isTerminal()) {
      return;
    }
    this.transitionTo(PaymentStatus.FAILED);
  }

  markExpired(): void {
    if (this.isTerminal()) {
      return;
    }
    this.transitionTo(PaymentStatus.EXPIRED);
  }

  markCompleted(txHash?: string | null): void {
    if (this.isTerminal() && this._status !== PaymentStatus.PROCESSING) {
      return;
    }
    this._txHash = txHash ?? this._txHash;
    this.transitionTo(PaymentStatus.COMPLETED);
    this._completedAt = this._completedAt ?? new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
      type: this.type,
      method: this.method,
      provider: this.provider,
      providerPaymentId: this.providerPaymentId,
      address: this.address,
      memo: this.memo,
      network: this.network,
      status: this.status,
      txHash: this.txHash,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      expiresAt: this.expiresAt
    };
  }

  private transitionTo(status: PaymentStatus): void {
    this._status = status;
    this._updatedAt = new Date();
  }

  private isTerminal(): boolean {
    return [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.EXPIRED].includes(this._status);
  }
}
