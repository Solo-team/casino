export interface CryptoDepositRequest {
  paymentId: string;
  amount: number;
  currency: string;
  userId: string;
  userName?: string;
  description?: string;
}

export interface CryptoDepositResult {
  providerPaymentId: string;
  address?: string;
  memo?: string;
  network?: string;
  expiresAt?: Date | null;
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ICryptoPaymentGateway {
  createDeposit(request: CryptoDepositRequest): Promise<CryptoDepositResult>;
}
