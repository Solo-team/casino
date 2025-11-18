import React from "react";

const dealers = [
  { name: "Ava", game: "Blackjack Suite 7", shift: "Live now" },
  { name: "Noah", game: "Roulette Royale", shift: "Starts in 15m" },
  { name: "Elena", game: "Baccarat Salon", shift: "Live now" },
  { name: "Mason", game: "Lightning Roulette", shift: "Tonight" }
];

const DealerGallery: React.FC = () => (
  <section className="section-panel dealer-gallery">
    <div className="panel-header">
      <h3>Featured live hosts</h3>
      <button className="button button-ghost" type="button">
        See all live tables
      </button>
    </div>
    <div className="dealer-grid">
      {dealers.map(dealer => (
        <article key={dealer.name} className="dealer-card">
          <div className="dealer-avatar">
            <span>{dealer.name[0]}</span>
          </div>
          <div>
            <h4>{dealer.name}</h4>
            <p className="muted">{dealer.game}</p>
            <small>{dealer.shift}</small>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default DealerGallery;
