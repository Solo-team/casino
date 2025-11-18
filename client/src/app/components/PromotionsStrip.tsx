import React from "react";

interface Promotion {
  title: string;
  description: string;
  badge: string;
}

const PROMOTIONS: Promotion[] = [
  {
    title: "High Roller Cashback",
    description: "10% weekly cashback on live tables above $5k turnover.",
    badge: "VIP"
  },
  {
    title: "Neon Nights Drops",
    description: "Hourly slot jackpots, guaranteed every evening.",
    badge: "Daily"
  },
  {
    title: "Invite & Elevate",
    description: "Refer a friend and both receive $200 bonus chips.",
    badge: "New"
  }
];

const PromotionsStrip: React.FC = () => (
  <section className="section-panel promotions-strip">
    <h3>Current highlights</h3>
    <div className="promotions-grid">
      {PROMOTIONS.map(promo => (
        <article key={promo.title} className="promo-card">
          <span className="promo-badge">{promo.badge}</span>
          <h4>{promo.title}</h4>
          <p>{promo.description}</p>
        </article>
      ))}
    </div>
  </section>
);

export default PromotionsStrip;
