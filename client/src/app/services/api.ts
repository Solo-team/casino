import type {
  ApiGame,
  ApiGameResult,
  ApiPayment,
  ApiProvider,
  ApiSlotGame,
  ApiUser,
  CreateDepositResponse
} from "../../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_STORAGE_KEY = "casinoToken";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  allowStatuses?: number[];
  requireAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { allowStatuses = [], requireAuth = true, ...fetchOptions } = options;
  
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  
  if (requireAuth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  
  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers
  });

  if (!response.ok) {
    if (allowStatuses.includes(response.status)) {
      return null as T;
    }

    let message = response.statusText;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
}

export const ApiService = {
  getCurrentUser: () => request<ApiUser>(`/users/me`),
  registerUser: (payload: { name: string; password: string; initialBalance: number }) =>
    request<AuthResponse>(`/auth/register`, {
      method: "POST",
      body: JSON.stringify(payload),
      requireAuth: false
    }),
  login: (payload: { name: string; password: string }) =>
    request<AuthResponse>(`/auth/login`, {
      method: "POST",
      body: JSON.stringify(payload),
      requireAuth: false
    }),
  googleAuth: (payload: { email: string; name: string; googleId: string }) =>
    request<AuthResponse>(`/auth/google`, {
      method: "POST",
      body: JSON.stringify(payload),
      requireAuth: false
    }),
  logout: () =>
    request<{ message: string }>(`/auth/logout`, {
      method: "POST"
    }),
  forgotPassword: (email: string) =>
    request<{ message: string; resetToken?: string }>(`/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
      requireAuth: false
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>(`/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token, password }),
      requireAuth: false
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>(`/auth/change-password`, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    }),
  deposit: (amount: number) =>
    request<ApiUser>(`/users/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount })
    }),
  getGames: () => request<ApiGame[]>(`/games`, { requireAuth: false }),
  getProviders: () => request<ApiProvider[]>(`/providers`, { requireAuth: false }),
  getProviderGames: (providerId: string) => request<ApiSlotGame[]>(`/providers/${providerId}/games`, { requireAuth: false }),
  getAllSlotGames: () => request<ApiSlotGame[]>(`/slots`, { requireAuth: false }),
  playGame: (payload: { gameId: string; betAmount: number; gameData?: Record<string, unknown> }) =>
    request<ApiGameResult>(`/play`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getHistory: () => request<ApiGameResult[]>(`/users/history`),
  createCryptoDeposit: (payload: { amount: number; currency?: string }) =>
    request<CreateDepositResponse>(`/payments/crypto/deposits`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createPaypalDeposit: (payload: { amount: number; currency?: string }) =>
    request<CreateDepositResponse>(`/payments/paypal/deposits`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getPayment: (paymentId: string) => request<ApiPayment>(`/payments/${paymentId}`),
  getPayments: () => request<ApiPayment[]>(`/payments`)
};
