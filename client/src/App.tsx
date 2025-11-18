import React, { useState } from "react";
import CategoryTabs from "./app/components/CategoryTabs";
import GameFilters from "./app/components/GameFilters";
import GameModal from "./app/components/GameModal";
import HeroCarousel from "./app/components/HeroCarousel";
import MainNav from "./app/components/MainNav";
import PromoAside from "./app/components/PromoAside";
import SidebarNav from "./app/components/SidebarNav";
import Toast from "./app/components/Toast";
import TopGamesSection from "./app/components/TopGamesSection";
import AuthModal from "./app/components/AuthModal";
import { useCasino } from "./app/hooks/useCasino";
import { useToast } from "./app/hooks/useToast";

const App: React.FC = () => {
  const casino = useCasino();
  const { toast, showToast } = useToast();
  const [search, setSearch] = useState("");
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const handleAuthError = (error: unknown, fallback: string) => {
    showToast(error instanceof Error ? error.message : fallback, "error");
  };

  const filteredGames = search
    ? casino.games.filter(game => game.name.toLowerCase().includes(search.toLowerCase()))
    : casino.games;

  const selectedProviderName =
    casino.selectedProvider && casino.providers.length
      ? casino.providers.find(provider => provider.id === casino.selectedProvider)?.name ?? "Selected provider"
      : undefined;

  return (
    <>
      <div className="noise-overlay" />
      <div className="app-shell">
        <MainNav
          user={casino.user}
          onSignInClick={() => {
            setAuthMode("login");
            setAuthModalOpen(true);
          }}
          onRegisterClick={() => {
            setAuthMode("register");
            setAuthModalOpen(true);
          }}
        />
        <CategoryTabs />
        <div className="lobby-layout">
          <SidebarNav />
          <section className="lobby-main">
            <HeroCarousel />
            <GameFilters
              search={search}
              onSearch={value => setSearch(value)}
              providers={casino.providers}
              selectedProvider={casino.selectedProvider}
              onProviderChange={providerId => {
                void casino.selectProvider(providerId);
              }}
            />
            <TopGamesSection games={filteredGames} onSelect={casino.openGame} />
            {casino.slots.length > 0 && (
              <section className="slots-teaser">
                <div className="section-header">
                  <h3>{casino.selectedProvider ? `Slots from ${selectedProviderName}` : "Popular slots"}</h3>
                  <button className="button button-secondary" type="button" onClick={() => void casino.selectProvider(null)}>
                    View all
                  </button>
                </div>
                <div className="game-grid">
                  {casino.slots.slice(0, 6).map(slot => (
                    <article
                      key={slot.id}
                      className="slot-card"
                      onClick={() =>
                        casino.openGame({
                          id: slot.id,
                          name: slot.name,
                          minBet: slot.minBet,
                          maxBet: slot.maxBet,
                          providerName: casino.selectedProvider ? selectedProviderName : undefined
                        })
                      }
                    >
                      <h4>{slot.name}</h4>
                      <p className="muted">{slot.description ?? "Instant access, no download required."}</p>
                      <small>
                        Bets {slot.minBet} - {slot.maxBet}
                      </small>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
          <PromoAside />
        </div>
      </div>

      {casino.currentGame && (
        <GameModal
          game={casino.currentGame}
          result={casino.lastGameResult}
          isPlaying={casino.isPlaying}
          onClose={casino.closeGame}
          onPlay={async bet => {
            try {
              await casino.playGame(bet);
            } catch (error) {
              handleAuthError(error, "Unable to play");
            }
          }}
        />
      )}
      <AuthModal
        open={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async ({ name, password }) => {
          try {
            await casino.login(name);
            showToast("Signed in successfully", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Sign in error");
            throw error;
          }
        }}
        onRegister={async ({ name, password, balance }) => {
          try {
            await casino.register(name, balance ?? 1000);
            showToast("Registration successful", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Registration error");
            throw error;
          }
        }}
        onGoogle={async payload => {
          try {
            await casino.loginWithGoogle(payload);
            showToast("Signed in with Google", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Google sign-in failed");
            throw error;
          }
        }}
        isBusy={casino.isAuthBusy}
      />
      <Toast toast={toast} />
    </>
  );
};

export default App;
