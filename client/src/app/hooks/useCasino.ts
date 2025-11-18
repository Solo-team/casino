import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiGame, ApiGameResult, ApiProvider, ApiSlotGame, ApiUser } from "../../types/api";
import { ApiService } from "../services/api";
import type { GameContext } from "../types";

const STORAGE_KEY = "casinoUser";

const persistToStorage = (value: ApiUser | null) => {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export function useCasino() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [games, setGames] = useState<ApiGame[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [slots, setSlots] = useState<ApiSlotGame[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [history, setHistory] = useState<ApiGameResult[]>([]);
  const [currentGame, setCurrentGame] = useState<GameContext | null>(null);
  const [lastGameResult, setLastGameResult] = useState<ApiGameResult | null>(null);

  const [isAuthBusy, setAuthBusy] = useState(false);
  const [isDataLoading, setDataLoading] = useState(false);
  const [isPlaying, setPlaying] = useState(false);
  const [isHistoryRefreshing, setHistoryRefreshing] = useState(false);

  const persistUser = useCallback((value: ApiUser | null) => {
    setUser(value);
    persistToStorage(value);
  }, []);

  const selectProvider = useCallback(async (providerId: string | null) => {
    setSelectedProvider(providerId);
    try {
      if (!providerId) {
        const allSlots = await ApiService.getAllSlotGames();
        setSlots(allSlots);
        return;
      }
      const providerSlots = await ApiService.getProviderGames(providerId);
      setSlots(providerSlots);
    } catch (error) {
      console.error("Failed to load slots", error);
      setSlots([]);
    }
  }, []);

  const loadInitialData = useCallback(
    async (userId: string) => {
      setDataLoading(true);
      try {
        const [gamesList, providerList, historyList] = await Promise.all([
          ApiService.getGames(),
          ApiService.getProviders(),
          ApiService.getHistory(userId)
        ]);
        setGames(gamesList);
        setProviders(providerList);
        setHistory(historyList);
        if (providerList.length) {
          await selectProvider(providerList[0].id);
        } else {
          setSlots([]);
          setSelectedProvider(null);
        }
      } finally {
        setDataLoading(false);
      }
    },
    [selectProvider]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }
    try {
      const stored = JSON.parse(saved) as ApiUser;
      void ApiService.getUser(stored.id)
        .then(async fetched => {
          persistUser(fetched);
          await loadInitialData(fetched.id);
        })
        .catch(() => {
          persistToStorage(null);
        });
    } catch {
      persistToStorage(null);
    }
  }, [loadInitialData, persistUser]);

  const runAuthAction = useCallback(
    async (task: () => Promise<void>) => {
      setAuthBusy(true);
      try {
        await task();
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const login = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Enter nickname");
      }
      await runAuthAction(async () => {
        const fetched = await ApiService.getUserByName(trimmed);
        persistUser(fetched);
        await loadInitialData(fetched.id);
      });
    },
    [loadInitialData, persistUser, runAuthAction]
  );

  const register = useCallback(
    async (name: string, balance: number) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Enter nickname");
      }
      await runAuthAction(async () => {
        const created = await ApiService.createUser(trimmed, balance || 1000);
        persistUser(created);
        await loadInitialData(created.id);
      });
    },
    [loadInitialData, persistUser, runAuthAction]
  );

  const loginWithGoogle = useCallback(
    async (profile: { email: string; name: string }) => {
      if (!profile.email.trim()) {
        throw new Error("Google profile is missing email");
      }
      await runAuthAction(async () => {
        const emailKey = profile.email.trim().toLowerCase();
        const existing = await ApiService.findUserByName(emailKey);
        const account = existing ?? (await ApiService.createUser(emailKey, 1000));
        persistUser(account);
        await loadInitialData(account.id);
      });
    },
    [loadInitialData, persistUser, runAuthAction]
  );

  const deposit = useCallback(
    async (amount: number) => {
      if (!user) return;
      const updated = await ApiService.deposit(user.id, amount);
      persistUser(updated);
    },
    [persistUser, user]
  );

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    setHistoryRefreshing(true);
    try {
      const historyList = await ApiService.getHistory(user.id);
      setHistory(historyList);
    } finally {
      setHistoryRefreshing(false);
    }
  }, [user]);

  const openGame = useCallback((context: GameContext) => {
    setCurrentGame(context);
    setLastGameResult(null);
  }, []);

  const closeGame = useCallback(() => {
    setCurrentGame(null);
    setLastGameResult(null);
  }, []);

  const playGame = useCallback(
    async (betAmount: number) => {
      if (!user || !currentGame) return;
      setPlaying(true);
      try {
        const result = await ApiService.playGame({
          userId: user.id,
          gameId: currentGame.id,
          betAmount
        });
        setLastGameResult(result);
        const updatedUser = await ApiService.getUser(user.id);
        persistUser(updatedUser);
        await refreshHistory();
      } finally {
        setPlaying(false);
      }
    },
    [currentGame, persistUser, refreshHistory, user]
  );

  const logout = useCallback(() => {
    persistUser(null);
    setGames([]);
    setProviders([]);
    setSlots([]);
    setHistory([]);
    setCurrentGame(null);
    setLastGameResult(null);
    setSelectedProvider(null);
  }, [persistUser]);

  const state = useMemo(
    () => ({
      user,
      games,
      providers,
      slots,
      selectedProvider,
      history,
      currentGame,
      lastGameResult,
      isAuthBusy,
      isDataLoading,
      isPlaying,
      isHistoryRefreshing
    }),
    [
      currentGame,
      games,
      history,
      isAuthBusy,
      isDataLoading,
      isHistoryRefreshing,
      isPlaying,
      lastGameResult,
      providers,
      selectedProvider,
      slots,
      user
    ]
  );

  return {
    ...state,
    login,
    register,
    loginWithGoogle,
    deposit,
    logout,
    selectProvider,
    openGame,
    closeGame,
    playGame,
    refreshHistory
  };
}
