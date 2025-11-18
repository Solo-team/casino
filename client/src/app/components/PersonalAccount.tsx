import React, { useState } from "react";
import type { ApiGameResult, ApiUser } from "../../types/api";
import { formatCurrency } from "../utils/format";
import AuthModal from "./AuthModal";

interface Props {
  user: ApiUser | null;
  history: ApiGameResult[];
  onLogin: (name: string) => Promise<void>;
  onRegister: (name: string, balance: number) => Promise<void>;
  onGoogle?: (payload: { email: string; name: string }) => Promise<void>;
  onLogout: () => void;
  isBusy: boolean;
}

const PersonalAccount: React.FC<Props> = ({ user, history, onLogin, onRegister, onGoogle, onLogout, isBusy }) => {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const lastResult = history.length ? history[history.length - 1] : null;
  const handleGoogle = onGoogle ?? (async () => {});

  if (!user) {
    return (
      <>
        <section className="section-panel">
          <div className="account-empty">
            <p className="eyebrow">Personal account</p>
            <h2>Sign in to your account</h2>
            <p className="muted">Sign in or register to access your personal account</p>
            <button className="button button-primary" onClick={() => setAuthModalOpen(true)}>
              Login
            </button>
          </div>
        </section>
        <AuthModal
          open={isAuthModalOpen}
          initialMode="login"
          onClose={() => setAuthModalOpen(false)}
          onLogin={({ name }) => onLogin(name)}
          onRegister={({ name, balance }) => onRegister(name, balance ?? 1000)}
          onGoogle={handleGoogle}
          isBusy={isBusy}
        />
      </>
    );
  }

  const wins = history.filter(item => item.resultType === "WIN").length;
  const losses = history.filter(item => item.resultType === "LOSS").length;

  return (
    <section className="section-panel">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Personal account</p>
          <h2>{user.name}</h2>
        </div>
        <div className="balance-card">
          <div>
            <p className="label">Balance</p>
            <h3>{formatCurrency(user.balance)}</h3>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p>Wins</p>
          <h3>{wins}</h3>
        </div>
        <div className="stat-card">
          <p>Losses</p>
          <h3>{losses}</h3>
        </div>
        <div className="stat-card">
          <p>Sessions</p>
          <h3>{history.length}</h3>
        </div>
        <div className="stat-card highlight">
          <p>Last result</p>
          {lastResult ? (
            <>
              <h3>{lastResult.gameType}</h3>
              <span className="muted">
                {lastResult.resultType === "WIN"
                  ? `Won ${formatCurrency(lastResult.payout)}`
                  : lastResult.resultType === "DRAW"
                  ? "Push - bet returned"
                  : "Try a new strategy"}
              </span>
            </>
          ) : (
            <>
              <h3>-</h3>
              <span className="muted">Play your first round</span>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <button className="button button-secondary" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </section>
  );
};

export default PersonalAccount;

