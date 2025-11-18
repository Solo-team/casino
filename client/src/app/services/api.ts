import type { ApiGame, ApiGameResult, ApiProvider, ApiSlotGame, ApiUser } from "../../types/api";

const API_BASE = "/api";

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  allowStatuses?: number[];
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { allowStatuses = [], ...fetchOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, fetchOptions);

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
      // ignore parsing errors
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const ApiService = {
  getUserByName: (name: string) => request<ApiUser>(`/users/name/${encodeURIComponent(name)}`),
  findUserByName: (name: string) =>
    request<ApiUser | null>(`/users/name/${encodeURIComponent(name)}`, { allowStatuses: [404] }),
  getUser: (id: string) => request<ApiUser>(`/users/${id}`),
  createUser: (name: string, initialBalance: number) =>
    request<ApiUser>(`/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, initialBalance })
    }),
  deposit: (userId: string, amount: number) =>
    request<ApiUser>(`/users/${userId}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    }),
  getGames: () => request<ApiGame[]>(`/games`),
  getProviders: () => request<ApiProvider[]>(`/providers`),
  getProviderGames: (providerId: string) => request<ApiSlotGame[]>(`/providers/${providerId}/games`),
  getAllSlotGames: () => request<ApiSlotGame[]>(`/slots`),
  playGame: (payload: { userId: string; gameId: string; betAmount: number; gameData?: Record<string, unknown> }) =>
    request<ApiGameResult>(`/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  getHistory: (userId: string) => request<ApiGameResult[]>(`/users/${userId}/history`)
};
