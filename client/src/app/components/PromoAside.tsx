import React from "react";

const PromoAside: React.FC = () => (
  <aside className="promo-aside">
    <section className="promo-card detail">
      <div>
        <p className="label">Promotions</p>
        <h4>Cashback 4% every deposit</h4>
        <p className="muted">Get instant cashback after each top up via cards or QR.</p>
        <button className="button button-secondary" type="button">
          Details
        </button>
      </div>
      <div className="promo-pagination">02 / 04</div>
    </section>
    <section className="promo-card tournaments">
      <div className="section-header">
        <h4>Tournaments</h4>
        <span>Grid</span>
      </div>
      <div className="tournament-card">
        <p className="label">Arena of Triumph</p>
        <h3>€5 000 prize pool</h3>
        <ul>
          <li>Participants: 572</li>
          <li>Positions paid: 30</li>
          <li>Ends in: 5 days</li>
        </ul>
        <button className="button button-primary" type="button">
          Join
        </button>
      </div>
    </section>
  </aside>
);

export default PromoAside;
