import React from "react";
import type { ApiGameResult, ApiUser } from "../../types/api";
import { formatCurrency } from "../utils/format";

interface Props {
  user: ApiUser;
  history: ApiGameResult[];
}

const StatsPanel: React.FC<Props> = ({ user, history }) => {
  const wins = history.filter(item => item.resultType === "WIN").length;
  const losses = history.filter(item => item.resultType === "LOSS").length;
  const lastResult = history.length ? history[history.length - 1] : null;

  return (
    <div className="section-panel">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Welcome back</p>
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
    </div>
  );
};

export default StatsPanel;
