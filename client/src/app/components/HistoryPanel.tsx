import React from "react";
import type { ApiGameResult } from "../../types/api";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  history: ApiGameResult[];
  active: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  className?: string;
}

const HistoryPanel: React.FC<Props> = ({ history, active, onRefresh, isRefreshing, className }) => {
  const panelClasses = ["history-panel", className, active ? "active" : ""].filter(Boolean).join(" ");
  const recentItems = [...history].slice(-8).reverse();

  return (
    <section className={panelClasses}>
      <div className="history-panel__header">
        <div>
          <p className="eyebrow">Recent sessions</p>
          <h3>Round history</h3>
        </div>
        <button className="button button-ghost" type="button" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {recentItems.length === 0 ? (
        <div className="history-empty">Your games history is empty. Place your first bet to unlock rewards.</div>
      ) : (
        <ul className="history-panel__list">
          {recentItems.map(item => (
            <li key={`${item.timestamp}-${item.gameId}`} className="history-row" data-result={item.resultType.toLowerCase()}>
              <div className="history-row__main">
                <strong>{item.gameType}</strong>
                <span>{formatDate(item.timestamp)}</span>
              </div>
              <div className="history-row__meta">
                <span className="history-row__bet">Bet {formatCurrency(item.betAmount)}</span>
                <span className="history-row__payout">
                  {item.resultType === "WIN"
                    ? `+${formatCurrency(item.payout)}`
                    : item.resultType === "DRAW"
                    ? "Push"
                    : formatCurrency(-item.betAmount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default HistoryPanel;
