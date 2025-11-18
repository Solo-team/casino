import React, { useEffect, useId, useRef, useState } from "react";
import GoogleAuthButton from "./GoogleAuthButton";

interface Props {
  open: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
  onLogin: (payload: { name: string; password: string }) => Promise<void>;
  onRegister: (payload: { name: string; password: string; balance?: number }) => Promise<void>;
  onGoogle: (payload: { email: string; name: string }) => Promise<void>;
  isBusy: boolean;
}

const perks = ["Daily cashback missions", "Priority withdrawals", "Live hosts 24/7"];

const AuthModal: React.FC<Props> = ({ open, initialMode = "login", onClose, onLogin, onRegister, onGoogle, isBusy }) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [balance, setBalance] = useState(1000);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setName("");
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setShowPassword(false);
      const focusField = () => firstFieldRef.current?.focus();
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(focusField);
      } else {
        focusField();
      }
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) {
      setError("Enter nickname or email");
      return;
    }
    if (!password.trim()) {
      setError("Enter password");
      return;
    }
    if (mode === "register") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }
    try {
      setError(null);
      if (mode === "login") {
        await onLogin({ name: name.trim(), password: password.trim() });
      } else {
        await onRegister({ name: name.trim(), password: password.trim(), balance });
      }
      setName("");
      setPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to proceed");
    }
  };

  const handleModeSwitch = (nextMode: "login" | "register") => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setError(null);
    setConfirmPassword("");
  };

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="auth-modal" onClick={closeOnBackdrop}>
      <div
        className="auth-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
      >
        <button className="close-btn" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <div className="auth-modal__body">
          <aside className="auth-showcase">
            <span className="auth-badge">Secure lobby</span>
            <h3>Instant access to tournaments & jackpots.</h3>
            <p>Play across slots, blackjack and live experiences with a single profile.</p>
            <ul className="auth-perks">
              {perks.map(perk => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <div className="auth-meta">
              <div>
                <span className="eyebrow">Live tables</span>
                <strong>40+</strong>
              </div>
              <div>
                <span className="eyebrow">Avg. payout</span>
                <strong>~2 min</strong>
              </div>
            </div>
          </aside>

          <div className="auth-panel">
            <div className="auth-header">
              <p className="eyebrow">{isRegister ? "Create your lounge pass" : "Welcome back"}</p>
              <h2 id={dialogTitleId}>{isRegister ? "Create account" : "Sign in"}</h2>
              <p className="auth-subtitle" id={dialogDescriptionId}>
                {isRegister
                  ? "Claim a complimentary bankroll and personalize your limits."
                  : "Resume your progress and keep your streak alive."}
              </p>
            </div>
            <div className="auth-tabs" role="tablist" aria-label="Authentication type">
              <button
                className={mode === "login" ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => handleModeSwitch("login")}
              >
                Sign in
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => handleModeSwitch("register")}
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Nickname or email
                <input
                  ref={firstFieldRef}
                  className="input"
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="player@example.com"
                  autoComplete="username email"
                />
              </label>
              <label>
                Password
                <div className="password-input-wrapper">
                  <input
                    className="input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={isRegister ? "At least 6 characters" : "Enter your password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {isRegister && (
                <>
                  <label>
                    Confirm password
                    <input
                      className="input"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Starting balance
                    <input
                      className="input"
                      type="number"
                      min={100}
                      value={balance}
                      onChange={event => setBalance(Number(event.target.value))}
                    />
                  </label>
                </>
              )}
              {error && (
                <div className="error-message" role="alert">
                  <span>!</span>
                  <span>{error}</span>
                </div>
              )}
              <button className="button button-primary" type="submit" disabled={isBusy}>
                {isBusy ? "Processing..." : isRegister ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="divider" aria-hidden="true">
              <span>or continue with</span>
            </div>
            <GoogleAuthButton disabled={isBusy} onCredential={payload => onGoogle(payload)} />

            <p className="auth-note">By continuing you accept the fair play policy and privacy terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
