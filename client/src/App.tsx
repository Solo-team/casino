import React, { useEffect, useState } from "react";
import GameModal from "./app/components/GameModal";
import HeroCarousel from "./app/components/HeroCarousel";
import MainNav from "./app/components/MainNav";
import PromoAside from "./app/components/PromoAside";
import SidebarNav from "./app/components/SidebarNav";
import Toast from "./app/components/Toast";
import AuthModal from "./app/components/AuthModal";
import PersonalAccount from "./app/components/PersonalAccount";
import DepositModal from "./app/components/DepositModal";
import GamesGrid from "./app/components/GamesGrid";
import { useCasino } from "./app/hooks/useCasino";
import { useToast } from "./app/hooks/useToast";
import { setToken } from "./app/services/api";

const App: React.FC = () => {
  const casino = useCasino();
  const { toast, showToast } = useToast();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showAccount, setShowAccount] = useState(false);
  const [isDepositOpen, setDepositOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    
    if (paymentStatus === "success" || paymentStatus === "cancelled") {
      setShowAccount(true);
      
      if (paymentStatus === "success") {
        showToast("Returned from PayPal. Checking payment status...", "success");
        if (casino.user) {
          casino.refreshUser();
          casino.refreshHistory();
        }
        setDepositOpen(true);
      } else if (paymentStatus === "cancelled") {
        showToast("Payment was cancelled", "error");
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [casino.user, showToast, casino.refreshUser, casino.refreshHistory]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const error = urlParams.get("error");
    if (token) {
      setToken(token);
      // refresh user data
      void (async () => {
        try {
          await casino.refreshUser();
          await casino.refreshHistory();
          showToast("Signed in with Google", "success");
        } catch (err) {
          console.error("Failed to refresh after Google sign-in", err);
        }
      })();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      try {
        showToast(decodeURIComponent(error), "error");
      } catch {
        showToast(error, "error");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [casino, showToast]);

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
          onLogout={async () => {
            try {
              await casino.logout();
              showToast("Signed out", "success");
              setShowAccount(false);
            } catch (err) {
              handleAuthError(err, "Logout failed");
            }
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
              onGoogleAuth={async (payload) => {
                await casino.loginWithGoogle(payload);
              }}
              onForgotPassword={async (email) => {
                return await casino.forgotPassword(email);
              }}
              onResetPassword={async (token, password) => {
                await casino.resetPassword(token, password);
              }}
              onOpenDeposit={() => setDepositOpen(true)}
              onRefreshHistory={casino.refreshHistory}
              onLogout={async () => {
                try {
                  await casino.logout();
                  showToast("Signed out", "success");
                  setShowAccount(false);
                } catch (err) {
                  handleAuthError(err, "Logout failed");
                }
              }}
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
                <GamesGrid
                  games={casino.games}
                  onSelect={casino.openGame}
                />
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
          userBalance={casino.user?.balance ?? 0}
        />
      )}
      <DepositModal
        open={isDepositOpen}
        onClose={() => setDepositOpen(false)}
        onCreateDeposit={async ({ amount, method }) => {
          try {
            const response =
              method === "paypal"
                ? await casino.createPaypalDeposit(amount)
                : await casino.createCryptoDeposit(amount);
            const methodLabel = response.payment.method === "PAYPAL" ? "PayPal" : "crypto";
            showToast(`Deposit created. Follow the ${methodLabel} instructions.`, "success");
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
            const res = await casino.register(name, password, balance ?? 1000);
            // If registration required email verification, backend returns { message, verificationToken? }
            if (res && (res.verificationToken || res.message)) {
              showToast(res.message || 'Verification email sent', 'success');
              // keep modal open so user can enter code (UI not yet implemented)
              return;
            }
            showToast("Registration successful", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Registration error");
            throw error;
          }
        }}
        onGoogleAuth={async (payload) => {
          try {
            await casino.loginWithGoogle(payload);
            showToast("Signed in with Google", "success");
            setAuthModalOpen(false);
          } catch (error) {
            handleAuthError(error, "Google sign-in error");
            throw error;
          }
        }}
        onForgotPassword={async (email) => {
          try {
            return await casino.forgotPassword(email);
          } catch (error) {
            handleAuthError(error, "Forgot password error");
            throw error;
          }
        }}
        onResetPassword={async (token, password) => {
          try {
            await casino.resetPassword(token, password);
          } catch (error) {
            handleAuthError(error, "Reset password error");
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
