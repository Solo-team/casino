import React from "react";
import type { ApiGameResult } from "../../types/api";
import { formatDate } from "../utils/format";

interface Props {
  history: ApiGameResult[];
  active: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const HistoryPanel: React.FC<Props> = ({ history, active, onRefresh, isRefreshing }) => (
  <section className={`panel ${active ? "active" : ""}`}>
    <div className="panel-header">
      <h3>Latest sessions</h3>
      <button className="button button-ghost" disabled={isRefreshing} onClick={onRefresh}>
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
    {history.length === 0 ? (
      <div className="history-empty">Your games history is empty. Place your first bet to unlock rewards.</div>
    ) : (
      <div className="timeline">
        {[...history].slice(-10).reverse().map(item => (
          <div key={item.timestamp + item.gameId} className={`timeline-item ${item.resultType.toLowerCase()}`}>
            <div className="timeline-head">
              <strong>{item.gameType}</strong>
              <span>{formatDate(item.timestamp)}</span>
            </div>
            <p>
              Bet: {item.betAmount} | Payout: {item.payout}
            </p>
            <small>{item.resultType === "WIN" ? "Win" : item.resultType === "DRAW" ? "Push" : "Loss"}</small>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default HistoryPanel;
