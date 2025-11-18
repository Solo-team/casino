export type GameResultType = "WIN" | "LOSS" | "DRAW";

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
