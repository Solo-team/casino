import React from "react";

const tiers = [
  { name: "Bronze", threshold: 0 },
  { name: "Silver", threshold: 1200 },
  { name: "Gold", threshold: 4000 },
  { name: "Black", threshold: 10000 }
];

const LoyaltyCard: React.FC = () => {
  const currentXp = 3200;
  const currentTier = tiers.filter(tier => currentXp >= tier.threshold).slice(-1)[0];
  const nextTier = tiers.find(tier => tier.threshold > currentXp);
  const nextThreshold = nextTier?.threshold ?? 10000;
  const progress = Math.min(100, Math.round((currentXp / nextThreshold) * 100));

  return (
    <section className="card loyalty-card">
      <div>
        <p className="label">Loyalty tier</p>
        <h3>{currentTier.name}</h3>
        <p className="muted">Earn XP from every wager to unlock bespoke hosts and cash drops.</p>
      </div>
      <div className="progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>{currentXp.toLocaleString()} XP</span>
          <span>{nextTier ? `${nextTier.name} at ${nextThreshold.toLocaleString()} XP` : "Top tier"}</span>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyCard;
