export type GameResultType = "WIN" | "LOSS" | "DRAW";
export type PaymentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";
export type PaymentMethod = "CRYPTO" | "PAYPAL";
export type DepositMethod = "cryptomus" | "paypal";

export interface ApiUser {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
}

export interface ApiGame {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
  description?: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  description?: string;
  gamesCount: number;
}

export interface ApiSlotGame extends ApiGame {
  imageUrl?: string;
}

export interface ApiGameResult {
  gameId: string;
  userId: string;
  gameType: string;
  betAmount: number;
  resultType: GameResultType;
  payout: number;
  gameData?: Record<string, unknown>;
  timestamp: string;
  netProfit?: number;
}

export interface ApiPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: string;
  method: PaymentMethod;
  provider: string;
  providerPaymentId?: string;
  address?: string;
  memo?: string;
  network?: string;
  status: PaymentStatus;
  txHash?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
}

export interface DepositInstructions {
  address?: string;
  memo?: string;
  network?: string;
  amount: number;
  currency: string;
  providerPaymentId?: string;
  checkoutUrl?: string;
  expiresAt?: string | null;
}

export interface CreateDepositResponse {
  payment: ApiPayment;
  instructions: DepositInstructions;
}

export type CreateCryptoDepositResponse = CreateDepositResponse;
