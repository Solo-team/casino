import React, { useState } from "react";
import GameModal from "./app/components/GameModal";
import HeroCarousel from "./app/components/HeroCarousel";
import MainNav from "./app/components/MainNav";
import PromoAside from "./app/components/PromoAside";
import SidebarNav from "./app/components/SidebarNav";
import Toast from "./app/components/Toast";
import AuthModal from "./app/components/AuthModal";
import PersonalAccount from "./app/components/PersonalAccount";
import DepositModal from "./app/components/DepositModal";
import { useCasino } from "./app/hooks/useCasino";
import { useToast } from "./app/hooks/useToast";

const App: React.FC = () => {
  const casino = useCasino();
  const { toast, showToast } = useToast();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showAccount, setShowAccount] = useState(false);
  const [isDepositOpen, setDepositOpen] = useState(false);

  const handleAuthError = (error: unknown, fallback: string) => {
    showToast(error instanceof Error ? error.message : fallback, "error");
  };

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
          onAccountClick={() => setShowAccount(true)}
          onLobbyClick={() => {
            setShowAccount(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        {showAccount ? (
          <div className="lobby-layout account-view">
            <PersonalAccount
              user={casino.user}
              history={casino.history}
              onLogin={async (name, password) => {
                await casino.login(name, password);
              }}
              onRegister={async (name, password, balance) => {
                await casino.register(name, password, balance);
              }}
              onOpenDeposit={() => setDepositOpen(true)}
              onRefreshHistory={casino.refreshHistory}
              isBusy={casino.isAuthBusy}
              isHistoryRefreshing={casino.isHistoryRefreshing}
            />
          </div>
        ) : (
          <>
            <div className="lobby-layout">
              <SidebarNav />
              <section className="lobby-main">
                <HeroCarousel />
                <section className="section-panel">
                  <h3>Content coming soon</h3>
                  <p className="muted">
                    Providers and games will be added later by another teammate. For now, explore other sections or stay tuned.
                  </p>
                </section>
              </section>
              <PromoAside />
            </div>
          </>
        )}
      </div>

      {casino.currentGame && (
        <GameModal
          game={casino.currentGame}
          result={casino.lastGameResult}
          isPlaying={casino.isPlaying}
          onClose={casino.closeGame}
          onPlay={async (bet, gameData) => {
            try {
              await casino.playGame(bet, gameData);
            } catch (error) {
              handleAuthError(error, "Unable to play");
            }
          }}
        />
      )}
      <DepositModal
        open={isDepositOpen}
        onClose={() => setDepositOpen(false)}
        onCreateDeposit={async (amount) => {
          try {
            const response = await casino.createCryptoDeposit(amount);
            showToast("Deposit created. Follow the crypto instructions.", "success");
            return response;
          } catch (error) {
            handleAuthError(error, "Unable to create deposit");
            throw error;
          }
        }}
        onRefreshPayment={async (paymentId) => {
          try {
            return await casino.fetchPayment(paymentId);
          } catch (error) {
            handleAuthError(error, "Unable to refresh payment");
            throw error;
          }
        }}
        onBalanceRefresh={async () => {
          await casino.refreshUser();
          await casino.refreshHistory();
        }}
      />
      <AuthModal
        open={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async ({ name, password }) => {
          try {
            await casino.login(name, password);
            showToast("Signed in successfully", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Sign in error");
            throw error;
          }
        }}
        onRegister={async ({ name, password, balance }) => {
          try {
            await casino.register(name, password, balance ?? 1000);
            showToast("Registration successful", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Registration error");
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
