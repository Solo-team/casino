import React, { useState } from "react";
import type { ApiUser } from "../../types/api";
import GoogleAuthButton from "./GoogleAuthButton";

interface Props {
  user: ApiUser | null;
  onLogout: () => void;
  onLogin: (name: string) => Promise<void>;
  onRegister: (name: string, balance: number) => Promise<void>;
  onGoogleLogin: (payload: { email: string; name: string }) => Promise<void>;
  isBusy: boolean;
}

const AccountPanel: React.FC<Props> = ({ user, onLogout, onLogin, onRegister, onGoogleLogin, isBusy }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(1000);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Enter nickname or email");
      return;
    }
    try {
      setError(null);
      if (mode === "login") {
        await onLogin(name.trim());
      } else {
        await onRegister(name.trim(), balance);
      }
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to proceed");
    }
  };

  return (
    <section className="account-card">
      {user ? (
        <>
          <p className="label">Personal account</p>
          <h3>{user.name}</h3>
          <p className="muted">Balance: {user.balance.toFixed(2)} credits</p>
          <button className="button button-secondary" type="button" onClick={onLogout}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <div className="account-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Register
            </button>
          </div>
          <label>
            Nickname or email
            <input
              className="input"
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="player@example.com"
            />
          </label>
          {mode === "register" && (
            <label>
              Starting balance
              <input
                className="input"
                type="number"
                min={0}
                value={balance}
                onChange={event => setBalance(Number(event.target.value))}
              />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="button button-primary" type="button" disabled={isBusy} onClick={handleSubmit}>
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          <div className="divider">
            <span>or</span>
          </div>
          <GoogleAuthButton disabled={isBusy} onCredential={payload => onGoogleLogin(payload)} />
        </>
      )}
    </section>
  );
};

export default AccountPanel;
