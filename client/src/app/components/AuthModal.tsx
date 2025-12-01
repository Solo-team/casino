import React, { useEffect, useId, useRef, useState } from "react";
import GoogleAuthButton from "./GoogleAuthButton";

interface Props {
  open: boolean;
  initialMode?: "login" | "register" | "forgot-password" | "reset-password";
  onClose: () => void;
  onLogin: (payload: { name: string; password: string }) => Promise<void>;
  onRegister: (payload: { name: string; password: string; balance?: number }) => Promise<void>;
  onGoogleAuth: (payload: { email: string; name: string; googleId: string }) => Promise<void>;
  onForgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  onResetPassword: (token: string, password: string) => Promise<void>;
  isBusy: boolean;
  resetToken?: string | null;
}

const perks = ["Daily cashback missions", "Priority withdrawals", "Live hosts 24/7"];

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

const AuthModal: React.FC<Props> = ({ 
  open, 
  initialMode = "login", 
  onClose, 
  onLogin, 
  onRegister, 
  onGoogleAuth,
  onForgotPassword,
  onResetPassword,
  isBusy,
  resetToken: initialResetToken 
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [balance, setBalance] = useState(1000);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState(initialResetToken || "");
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(null);
      setShowPassword(false);
      if (initialResetToken) {
        setResetToken(initialResetToken);
      }
      const focusField = () => firstFieldRef.current?.focus();
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(focusField);
      } else {
        focusField();
      }
    }
  }, [open, initialMode, initialResetToken]);

  if (!open) return null;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "forgot-password") {
      if (!email.trim()) {
        setError("Enter your email address");
        return;
      }
      try {
        const result = await onForgotPassword(email.trim());
        setSuccess(result.message);
        if (result.resetToken) {
          // In development mode, token is returned - auto-switch to reset mode
          setResetToken(result.resetToken);
          setTimeout(() => setMode("reset-password"), 2000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send reset email");
      }
      return;
    }

    if (mode === "reset-password") {
      if (!resetToken.trim()) {
        setError("Reset token is required");
        return;
      }
      if (!password.trim()) {
        setError("Enter new password");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      try {
        await onResetPassword(resetToken.trim(), password.trim());
        setSuccess("Password reset successfully! You can now sign in.");
        setTimeout(() => {
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setResetToken("");
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reset password");
      }
      return;
    }

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

  const handleGoogleAuth = async (payload: { email: string; name: string; googleId: string }) => {
    try {
      setError(null);
      await onGoogleAuth(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
    }
  };

  const handleModeSwitch = (nextMode: AuthMode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setConfirmPassword("");
  };

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const isRegister = mode === "register";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";

  const getTitle = () => {
    switch (mode) {
      case "forgot-password": return "Forgot Password";
      case "reset-password": return "Reset Password";
      case "register": return "Create account";
      default: return "Sign in";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "forgot-password": return "Enter your email to receive a password reset link.";
      case "reset-password": return "Enter your new password below.";
      case "register": return "Claim a complimentary bankroll and personalize your limits.";
      default: return "Resume your progress and keep your streak alive.";
    }
  };

  const getButtonText = () => {
    if (isBusy) return "Processing...";
    switch (mode) {
      case "forgot-password": return "Send reset link";
      case "reset-password": return "Reset password";
      case "register": return "Create account";
      default: return "Sign in";
    }
  };

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
              <p className="eyebrow">
                {isForgotPassword ? "Password recovery" : isResetPassword ? "Set new password" : isRegister ? "Create your lounge pass" : "Welcome back"}
              </p>
              <h2 id={dialogTitleId}>{getTitle()}</h2>
              <p className="auth-subtitle" id={dialogDescriptionId}>
                {getSubtitle()}
              </p>
            </div>
            
            {!isForgotPassword && !isResetPassword && (
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
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              {isForgotPassword && (
                <label>
                  Email address
                  <input
                    ref={firstFieldRef}
                    className="input"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="player@example.com"
                    autoComplete="email"
                  />
                </label>
              )}

              {isResetPassword && (
                <>
                  <label>
                    Reset token
                    <input
                      ref={firstFieldRef}
                      className="input"
                      type="text"
                      value={resetToken}
                      onChange={event => setResetToken(event.target.value)}
                      placeholder="Paste your reset token"
                    />
                  </label>
                  <label>
                    New password
                    <div className="password-input-wrapper">
                      <input
                        className="input"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
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
                  <label>
                    Confirm new password
                    <input
                      className="input"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                    />
                  </label>
                </>
              )}

              {!isForgotPassword && !isResetPassword && (
                <>
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
                </>
              )}
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
              
              {success && (
                <div className="success-message" role="status">
                  <span>✓</span>
                  <span>{success}</span>
                </div>
              )}
              {error && (
                <div className="error-message" role="alert">
                  <span>!</span>
                  <span>{error}</span>
                </div>
              )}
              <button className="button button-primary" type="submit" disabled={isBusy}>
                {getButtonText()}
              </button>

              {mode === "login" && (
                <button 
                  type="button" 
                  className="auth-link" 
                  onClick={() => handleModeSwitch("forgot-password")}
                >
                  Forgot password?
                </button>
              )}

              {(isForgotPassword || isResetPassword) && (
                <button 
                  type="button" 
                  className="auth-link" 
                  onClick={() => handleModeSwitch("login")}
                >
                  Back to sign in
                </button>
              )}
            </form>

            {!isForgotPassword && !isResetPassword && (
              <>
                <div className="auth-divider">
                  <span>or continue with</span>
                </div>
                <GoogleAuthButton onCredential={handleGoogleAuth} disabled={isBusy} />
              </>
            )}

            <p className="auth-note">By continuing you accept the fair play policy and privacy terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
