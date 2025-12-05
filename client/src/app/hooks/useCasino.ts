import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiGame,
  ApiGameResult,
  ApiPayment,
  ApiProvider,
  ApiSlotGame,
  ApiUser,
  CreateDepositResponse,
  DepositMethod
} from "../../types/api";
import { ApiService, setToken, getToken } from "../services/api";
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

// Clear old cached user on load to force fresh data from server
if (typeof window !== "undefined") {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function useCasino() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [games, setGames] = useState<ApiGame[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [slots, setSlots] = useState<ApiSlotGame[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [history, setHistory] = useState<ApiGameResult[]>([]);
  const [currentGame, setCurrentGame] = useState<GameContext | null>(null);
  const [lastGameResult, setLastGameResult] = useState<ApiGameResult | null>(null);
  const [lastPayment, setLastPayment] = useState<ApiPayment | null>(null);

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

  const loadInitialData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Public data (available without auth)
      const [gamesList, providerList] = await Promise.all([
        ApiService.getGames(),
        ApiService.getProviders()
      ]);
      setGames(gamesList);
      setProviders(providerList);
      if (providerList.length) {
        await selectProvider(providerList[0].id);
      } else {
        setSlots([]);
        setSelectedProvider(null);
      }

      // Authenticated data (history + profile) if token exists
      const token = getToken();
      if (token) {
        try {
          const [userData, historyList] = await Promise.all([
            ApiService.getCurrentUser(),
            ApiService.getHistory()
          ]);
          persistUser(userData);
          setHistory(historyList);
          setLastPayment(null);
        } catch (error) {
          console.error("Failed to load user session, clearing token", error);
          setToken(null);
          persistToStorage(null);
          setHistory([]);
          setLastPayment(null);
        }
      } else {
        persistUser(null);
        setHistory([]);
        setLastPayment(null);
      }
    } finally {
      setDataLoading(false);
    }
  }, [persistUser, selectProvider]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

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
    async (name: string, password: string) => {
      const trimmedName = name.trim();
      const trimmedPassword = password.trim();
      if (!trimmedName) {
        throw new Error("Enter nickname");
      }
      if (!trimmedPassword) {
        throw new Error("Enter password");
      }
      await runAuthAction(async () => {
        const response = await ApiService.login({ name: trimmedName, password: trimmedPassword });
        setToken(response.token);
        persistUser(response.user);
        await loadInitialData();
      });
    },
    [loadInitialData, persistUser, runAuthAction]
  );

  const register = useCallback(
    async (name: string, password: string, balance: number) => {
      const trimmedName = name.trim();
      const trimmedPassword = password.trim();
      if (!trimmedName) {
        throw new Error("Enter nickname");
      }
      if (!trimmedPassword) {
        throw new Error("Enter password");
      }
      if (trimmedPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      let result: any = null;
      await runAuthAction(async () => {
        const response = await ApiService.registerUser({
          name: trimmedName,
          password: trimmedPassword,
          initialBalance: balance || 1000
        });
        if (response && response.token) {
          setToken(response.token);
          persistUser(response.user);
          await loadInitialData();
          result = { success: true };
        } else {
          // verification required or other non-token response
          result = response;
        }
      });
      return result;
    },
    [loadInitialData, persistUser, runAuthAction]
  );

  const loginWithGoogle = useCallback(
    async (payload: { email: string; name: string; googleId: string }) => {
      await runAuthAction(async () => {
        const response = await ApiService.googleAuth(payload);
        setToken(response.token);
        persistUser(response.user);
        await loadInitialData();
      });
    },
    [loadInitialData, persistUser, runAuthAction]
  );

  const logout = useCallback(async () => {
    try {
      await ApiService.logout();
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      setToken(null);
      persistUser(null);
      setHistory([]);
      setLastPayment(null);
      setCurrentGame(null);
      setLastGameResult(null);
    }
  }, [persistUser]);

  const forgotPassword = useCallback(async (email: string) => {
    const response = await ApiService.forgotPassword(email);
    return response;
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await ApiService.resetPassword(token, password);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await ApiService.changePassword(currentPassword, newPassword);
  }, []);

  const deposit = useCallback(
    async (amount: number) => {
      if (!user) return;
      const updated = await ApiService.deposit(amount);
      persistUser(updated);
    },
    [persistUser, user]
  );

  const refreshUser = useCallback(async () => {
    if (!user) return null;
    const updated = await ApiService.getCurrentUser();
    persistUser(updated);
    return updated;
  }, [persistUser, user]);

  const createDeposit = useCallback(
    async (method: DepositMethod, amount: number, currency?: string): Promise<CreateDepositResponse> => {
      if (!user) {
        throw new Error("Sign in to create a deposit");
      }
      const response =
        method === "paypal"
          ? await ApiService.createPaypalDeposit({ amount, currency })
          : await ApiService.createCryptoDeposit({ amount, currency });
      setLastPayment(response.payment);
      return response;
    },
    [user]
  );

  const createCryptoDeposit = useCallback(
    async (amount: number, currency?: string): Promise<CreateDepositResponse> =>
      createDeposit("cryptomus", amount, currency),
    [createDeposit]
  );

  const createPaypalDeposit = useCallback(
    async (amount: number, currency?: string): Promise<CreateDepositResponse> =>
      createDeposit("paypal", amount, currency),
    [createDeposit]
  );

  const fetchPayment = useCallback(
    async (paymentId: string): Promise<ApiPayment> => {
      const payment = await ApiService.getPayment(paymentId);
      if (payment.userId === user?.id) {
        setLastPayment(payment);
      }
      return payment;
    },
    [user]
  );

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    setHistoryRefreshing(true);
    try {
      const historyList = await ApiService.getHistory();
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
    async (betAmount: number, gameData?: Record<string, unknown>) => {
      if (!user || !currentGame) return;
      setPlaying(true);
      try {
        // Track user spin count for newbie boost (first 20 spins get 1.4x win chance)
        const storageKey = `spinCount_${user.id}`;
        const userSpinCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
        
        const result = await ApiService.playGame({
          gameId: currentGame.id,
          betAmount,
          gameData: { ...gameData, userSpinCount }
        });
        
        // Increment spin count
        localStorage.setItem(storageKey, String(userSpinCount + 1));
        
        setLastGameResult(result);
        const updatedUser = await ApiService.getCurrentUser();
        persistUser(updatedUser);
        await refreshHistory();
      } finally {
        setPlaying(false);
      }
    },
    [currentGame, persistUser, refreshHistory, user]
  );

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
      lastPayment,
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
      lastPayment,
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
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    deposit,
    refreshUser,
    selectProvider,
    openGame,
    closeGame,
    playGame,
    refreshHistory,
    createDeposit,
    createCryptoDeposit,
    createPaypalDeposit,
    fetchPayment
  };
}
