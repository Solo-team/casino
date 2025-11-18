import React from "react";
import type { ApiUser } from "../../types/api";
import { formatCurrency } from "../utils/format";

interface Props {
  user: ApiUser | null;
  onLogout: () => void;
}

const HeroSection: React.FC<Props> = ({ user, onLogout }) => (
  <header className="hero">
    <div className="hero__content">
      <p className="eyebrow">Venom Lounge</p>
      <h1>Premier online casino with live thrills</h1>
      <p className="hero-subtitle">
        Play real blackjack, roulette and branded slots with instant payouts, curated promos and a luxury VIP
        experience inspired by iconic Vegas lounges.
      </p>
      <div className="hero__actions">
        <button className="button button-primary">Browse Games</button>
        <button className="button button-secondary">View Promotions</button>
      </div>
    </div>
    {user && (
      <div className="hero__user">
        <div className="user-badge card">
          <div>
            <p className="label">Player</p>
            <h3>{user.name}</h3>
          </div>
          <div>
            <p className="label">Balance</p>
            <h3>{formatCurrency(user.balance)}</h3>
          </div>
          <button className="button button-ghost" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    )}
  </header>
);

export default HeroSection;
