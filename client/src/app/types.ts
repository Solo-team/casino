import type { GameResultType } from "../types/api";

export type PanelId = "games" | "slots" | "history" | "wallet";

export type ToastKind = "info" | "success" | "error";

export interface ToastState {
  message: string;
  type: ToastKind;
}

export interface GameContext {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
  providerName?: string;
}

export interface GameResultView {
  title: string;
  betAmount: number;
  payout: number;
  resultType: GameResultType;
  description: string;
}
