import React, { useEffect, useState } from "react";

const jackpots = [
  { title: "Mega Spin Drop", amount: 1789432 },
  { title: "Lightning Roulette Pot", amount: 524389 },
  { title: "Daily Wheel Boost", amount: 231040 }
];

const JackpotTicker: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex(prev => (prev + 1) % jackpots.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, []);

  const current = jackpots[index];

  return (
    <section className="jackpot-ticker">
      <span className="ticker-label">Live jackpots</span>
      <div className="ticker-content">
        <strong>{current.title}</strong>
        <span>${current.amount.toLocaleString()}</span>
      </div>
      <button className="button button-ghost" type="button">
        Explore drops
      </button>
    </section>
  );
};

export default JackpotTicker;
