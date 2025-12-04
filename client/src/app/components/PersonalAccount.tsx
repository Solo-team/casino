import React, { useState } from "react";
import type { ApiGameResult, ApiUser } from "../../types/api";
import { formatCurrency, formatDate } from "../utils/format";
import AuthModal from "./AuthModal";
import HistoryPanel from "./HistoryPanel";
interface Props {
  user: ApiUser | null;
  history: ApiGameResult[];
  onLogin: (name: string, password: string) => Promise<void>;
  onRegister: (name: string, password: string, balance: number) => Promise<void>;
  onGoogleAuth: (payload: { email: string; name: string; googleId: string }) => Promise<void>;
  onForgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  onResetPassword: (token: string, password: string) => Promise<void>;
  onOpenDeposit: () => void;
  onRefreshHistory: () => Promise<void>;
  onLogout?: () => void;
  isBusy: boolean;
  isHistoryRefreshing: boolean;
}

const PersonalAccount: React.FC<Props> = ({
  user,
  history,
  onLogin,
  onRegister,
  onGoogleAuth,
  onForgotPassword,
  onResetPassword,
  onOpenDeposit,
  onRefreshHistory,
  onLogout,
  isBusy,
  isHistoryRefreshing
}) => {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const lastResult = history.length ? history[history.length - 1] : null;

  if (!user) {
    return (
      <>
        <section className="section-panel account-shell account-shell--empty">
          <div className="account-placeholder">
            <p className="eyebrow">Personal account</p>
            <h2>Unlock your player hub</h2>
            <p className="muted">
              Track every wager, unlock loyalty boosts and manage your bankroll from a single dashboard.
            </p>
            <ul className="account-placeholder__list">
              <li>Realtime balance sync with the lobby</li>
              <li>Detailed history with win / loss insights</li>
              <li>Custom limits, deposit presets and missions</li>
            </ul>
            <div className="account-placeholder__actions">
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthModalOpen(true);
                }}
              >
                Sign in
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthModalOpen(true);
                }}
              >
                Create account
              </button>
            </div>
          </div>
        </section>
        <AuthModal
          open={isAuthModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onLogin={({ name, password }) => onLogin(name, password)}
          onRegister={({ name, password, balance }) => onRegister(name, password, balance ?? 1000)}
          onGoogleAuth={onGoogleAuth}
          onForgotPassword={onForgotPassword}
          onResetPassword={onResetPassword}
          isBusy={isBusy}
        />
      </>
    );
  }

  const totalGames = history.length;
  const lastResultText = lastResult
    ? lastResult.resultType === "WIN"
      ? `Won ${formatCurrency(lastResult.payout)}`
      : lastResult.resultType === "DRAW"
      ? "Push - bet returned"
      : `Lost ${formatCurrency(lastResult.betAmount)}`
    : "Play your first round";
  const lastResultTrend = lastResult
    ? lastResult.resultType === "WIN"
      ? "positive"
      : lastResult.resultType === "LOSS"
      ? "negative"
      : "neutral"
    : "neutral";
  return (
    <>
      <section className="section-panel account-shell">
        <header className="account-hero">
          <div className="account-hero__content">
            <p className="eyebrow">Personal account</p>
            <h2>{user.name}</h2>
            {user.email && (
              <p className="muted">{user.email}</p>
            )}
            <p className="muted">Member since {formatDate(user.createdAt)}</p>
            {user.provider && user.provider !== "local" && (
              <div className="account-provider-badge">Signed in with {user.provider}</div>
            )}
            <div className="account-meta">Rounds • {totalGames || 0}</div>
          </div>
          <div className="account-hero__balance">
            <div>
              <p className="eyebrow">Balance</p>
              <h3>{formatCurrency(user.balance)}</h3>
            </div>
            <div className="account-balance-pill" data-trend={lastResultTrend}>
              <span>Last result</span>
              <strong>{lastResult ? lastResultText : "No rounds yet"}</strong>
            </div>
            <button
              className="button button-primary account-cta"
              type="button"
              onClick={onOpenDeposit}
            >
              Add funds
            </button>
            <button
              className="button button-secondary account-cta"
              type="button"
              onClick={() => {
                console.debug("PersonalAccount: Sign out clicked", { hasHandler: !!onLogout });
                onLogout && onLogout();
              }}
              style={{ marginLeft: 8 }}
            >
              Sign out
            </button>
            <small className="muted">Instant deposits with no extra fees.</small>
          </div>
        </header>

        <div className="account-layout single-column">
          <div className="account-main">
            <HistoryPanel
              className="account-card history-panel-card"
              history={history}
              active={true}
              onRefresh={onRefreshHistory}
              isRefreshing={isHistoryRefreshing}
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default PersonalAccount;
