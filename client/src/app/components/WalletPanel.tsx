import React, { useState } from "react";

interface Props {
  active: boolean;
  onDeposit: (amount: number) => Promise<void>;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000];

const WalletPanel: React.FC<Props> = ({ active, onDeposit }) => {
  const [amount, setAmount] = useState(250);
  const [isProcessing, setProcessing] = useState(false);

  const handleDeposit = async () => {
    if (!amount || amount <= 0) return;
    setProcessing(true);
    try {
      await onDeposit(amount);
      setAmount(250);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className={`panel ${active ? "active" : ""}`}>
      <div className="wallet-card card">
        <h3>Instant top up</h3>
        <p className="muted">Pick a quick amount or enter your own stake boost.</p>
        <div className="quick-amounts">
          {QUICK_AMOUNTS.map(value => (
            <button key={value} onClick={() => setAmount(value)}>
              +{value}
            </button>
          ))}
        </div>
        <label>
          Amount
          <input
            className="input"
            type="number"
            min={50}
            value={amount}
            onChange={event => setAmount(Number(event.target.value))}
          />
        </label>
        <button className="button button-primary" onClick={handleDeposit} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Top up balance"}
        </button>
      </div>
    </section>
  );
};

export default WalletPanel;
