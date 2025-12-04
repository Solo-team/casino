import React, { useState, useMemo } from "react";
import type { ApiGameResult } from "../../types/api";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  history: ApiGameResult[];
  active: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  className?: string;
}

const ITEMS_PER_PAGE = 8;

const HistoryPanel: React.FC<Props> = ({ history, active, onRefresh, isRefreshing, className }) => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  
  const panelClasses = ["history-panel", className, active ? "active" : ""].filter(Boolean).join(" ");
  
  const sortedHistory = useMemo(() => {
    return [...history].reverse();
  }, [history]);

  const displayedItems = sortedHistory.slice(0, displayCount);
  const hasMore = sortedHistory.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <section className={panelClasses}>
      <div className="history-panel__header">
        <div>
          <p className="eyebrow">Recent sessions</p>
          <h3>Round history</h3>
          {history.length > 0 && (
            <span className="history-panel__count">{history.length} total rounds</span>
          )}
        </div>
        <button className="button button-ghost" type="button" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {displayedItems.length === 0 ? (
        <div className="history-empty">Your games history is empty. Place your first bet to unlock rewards.</div>
      ) : (
        <>
          <ul className="history-panel__list">
            {displayedItems.map(item => {
              const resultType = item.resultType.toLowerCase();
              const icon = item.resultType === "WIN" ? "▲" : item.resultType === "DRAW" ? "⟳" : "▼";
              const label = item.resultType === "WIN" ? "Win" : item.resultType === "DRAW" ? "Push" : "Loss";
              const payout = item.resultType === "WIN"
                ? `+${formatCurrency(item.payout)}`
                : item.resultType === "DRAW"
                ? "Push"
                : `-${formatCurrency(item.betAmount)}`;

              return (
                <li key={`${item.timestamp}-${item.gameId}`} className="history-row" data-result={resultType}>
                  <div className="history-row__left">
                    <div className="history-row__badge" data-result={resultType}>
                      <span className="history-row__icon">{icon}</span>
                    </div>
                    <div className="history-row__body">
                      <div className="history-row__title">
                        <strong>{item.gameType}</strong>
                        <span className="history-row__pill" data-result={resultType}>{label}</span>
                      </div>
                      <div className="history-row__meta">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>•</span>
                        <span>Bet {formatCurrency(item.betAmount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="history-row__amount" data-result={resultType}>
                    <span className="history-row__payout">{payout}</span>
                    {item.resultType !== "DRAW" && (
                      <span className="history-row__trend">
                        {item.resultType === "WIN" ? "Payout" : "Lost stake"}
                      </span>
                    )}
                    {item.resultType === "DRAW" && <span className="history-row__trend">Stake returned</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="history-panel__load-more">
              <button
                className="button button-ghost"
                type="button"
                onClick={handleLoadMore}
              >
                Load more ({sortedHistory.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default HistoryPanel;
