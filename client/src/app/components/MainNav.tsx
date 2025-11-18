import React, { useState } from "react";
import type { ApiUser } from "../../types/api";

interface NavItem {
  label: string;
  href?: string;
  tag?: string;
  children?: Array<{ label: string; description: string }>;
}

interface Props {
  user: ApiUser | null;
  onSignInClick: () => void;
  onRegisterClick: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Lobby", href: "#" },
  {
    label: "Live Casino",
    children: [
      { label: "Blackjack Suites", description: "VIP tables, private hosts" },
      { label: "Roulette Royale", description: "Lightning, immersive variants" },
      { label: "Baccarat Salon", description: "Salon Privé, squeeze tables" }
    ]
  },
  {
    label: "Slots",
    children: [
      { label: "Jackpot Drops", description: "Hourly prize pools" },
      { label: "Branded Hits", description: "Movie & TV tie-ins" },
      { label: "Classic Fruits", description: "3-reel nostalgia picks" }
    ]
  },
  { label: "Promotions", href: "#" },
  { label: "VIP", href: "#", tag: "Elite" }
];

const ACCOUNT_ITEMS = ["My bets", "Deposit", "Responsible play", "Support"];

const MOBILE_TABS = ["Explore", "Account"] as const;

const MainNav: React.FC<Props> = ({ user, onSignInClick, onRegisterClick }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]>("Explore");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <>
      <div className="top-bar">
        <div className="logo">VENOM</div>
        <nav className="primary-nav">
          {NAV_ITEMS.map(item => (
            <div
              key={item.label}
              className={`nav-item ${openDropdown === item.label ? "open" : ""}`}
              onMouseEnter={() => item.children && setOpenDropdown(item.label)}
              onFocus={() => item.children && setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button type="button" onClick={() => setOpenDropdown(prev => (prev === item.label ? null : item.label))}>
                {item.label}
                {item.tag && <span className="nav-tag">{item.tag}</span>}
                {item.children && <span className="caret">⌄</span>}
              </button>
              {item.children && (
                <div className="nav-dropdown">
                  {item.children.map(child => (
                    <div key={child.label}>
                      <strong>{child.label}</strong>
                      <p>{child.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="nav-toggle" type="button" onClick={() => setMobileOpen(true)}>
            Menu
          </button>
          {!user ? (
            <>
              <button className="button button-secondary" type="button" onClick={onSignInClick}>
                Sign in
              </button>
              <button className="button button-primary" type="button" onClick={onRegisterClick}>
                Register
              </button>
            </>
          ) : (
            <button className="button button-primary" type="button">
              Play now
            </button>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-nav">
          <div className="mobile-nav__header">
            <span>Main menu</span>
            <button type="button" onClick={() => setMobileOpen(false)}>
              ×
            </button>
          </div>
          <div className="mobile-nav__tabs">
            {MOBILE_TABS.map(tab => (
              <button
                key={tab}
                type="button"
                className={mobileTab === tab ? "active" : undefined}
                onClick={() => setMobileTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="mobile-nav__sections">
            {mobileTab === "Explore" ? (
              <div>
                <ul>
                  {NAV_ITEMS.map(item => (
                    <li key={item.label}>
                      <strong>{item.label}</strong>
                      {item.children && (
                        <ul>
                          {item.children.map(child => (
                            <li key={child.label}>{child.label}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <ul>
                  {ACCOUNT_ITEMS.map(link => (
                    <li key={link}>{link}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MainNav;
