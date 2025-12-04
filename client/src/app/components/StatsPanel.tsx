import React, { useMemo } from "react";
import type { ApiGameResult } from "../../types/api";
import { formatCurrency } from "../utils/format";

interface Props {
  history: ApiGameResult[];
  className?: string;
}

const StatsPanel: React.FC<Props> = ({ history, className }) => {
  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalWon: 0,
        totalLost: 0,
        netProfit: 0,
        averageBet: 0,
        biggestWin: 0,
        biggestLoss: 0
      };
    }

    const wins = history.filter(item => item.resultType === "WIN");
    const losses = history.filter(item => item.resultType === "LOSS");
    const draws = history.filter(item => item.resultType === "DRAW");

    const totalWon = wins.reduce((sum, item) => sum + item.payout, 0);
    const totalLost = losses.reduce((sum, item) => sum + item.betAmount, 0);
    const totalBets = history.reduce((sum, item) => sum + item.betAmount, 0);
    const netProfit = totalWon - totalBets;

    const winRate = wins.length + losses.length > 0
      ? Math.round((wins.length / (wins.length + losses.length)) * 100)
      : 0;

    const biggestWin = wins.length > 0
      ? Math.max(...wins.map(item => item.payout))
      : 0;

    const biggestLoss = losses.length > 0
      ? Math.max(...losses.map(item => item.betAmount))
      : 0;

    return {
      totalGames: history.length,
      wins: wins.length,
      losses: losses.length,
      draws: draws.length,
      winRate,
      totalWon,
      totalLost,
      netProfit,
      averageBet: totalBets / history.length,
      biggestWin,
      biggestLoss
    };
  }, [history]);

  if (history.length === 0) {
    return null;
  }

  return (
    <section className={`account-card stats-panel ${className || ""}`}>
      <div className="stats-panel__header">
        <div>
          <p className="eyebrow">Performance</p>
          <h3>Statistics</h3>
        </div>
      </div>

      <div className="account-stats-grid">
        <div className="account-stat-card" data-trend={stats.netProfit >= 0 ? "positive" : "negative"}>
          <p className="account-stat-card__label">Net profit</p>
          <p className="account-stat-card__value">
            {stats.netProfit >= 0 ? "+" : ""}{formatCurrency(stats.netProfit)}
          </p>
          <p className="account-stat-card__helper">
            {stats.totalWon > 0 ? `Won ${formatCurrency(stats.totalWon)}` : "No wins yet"}
          </p>
        </div>

        <div className="account-stat-card">
          <p className="account-stat-card__label">Win rate</p>
          <p className="account-stat-card__value">{stats.winRate}%</p>
          <p className="account-stat-card__helper">
            {stats.wins} wins / {stats.losses} losses
          </p>
        </div>

        <div className="account-stat-card">
          <p className="account-stat-card__label">Average bet</p>
          <p className="account-stat-card__value">{formatCurrency(stats.averageBet)}</p>
          <p className="account-stat-card__helper">
            {stats.totalGames} total rounds
          </p>
        </div>

        <div className="account-stat-card" data-trend="positive">
          <p className="account-stat-card__label">Biggest win</p>
          <p className="account-stat-card__value">
            {stats.biggestWin > 0 ? formatCurrency(stats.biggestWin) : "-"}
          </p>
          <p className="account-stat-card__helper">
            {stats.biggestWin > 0 ? "Best payout" : "No wins yet"}
          </p>
        </div>
      </div>
    </section>
  );
};

export default StatsPanel;
