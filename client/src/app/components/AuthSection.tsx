import React, { useState } from "react";

interface Props {
  onLogin: (name: string) => Promise<void>;
  onRegister: (name: string, balance: number) => Promise<void>;
  isBusy: boolean;
}

const AuthSection: React.FC<Props> = ({ onLogin, onRegister, isBusy }) => {
  const [loginName, setLoginName] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerBalance, setRegisterBalance] = useState(1000);

  return (
    <section className="section-panel">
      <div className="auth-grid">
        <article className="card">
          <h2>Sign in</h2>
          <p className="muted">Pick up where you left off and access your live tables.</p>
          <label>
            Никнейм
            <input
              className="input"
              type="text"
              placeholder="e.g. luckyfox"
              value={loginName}
              onChange={event => setLoginName(event.target.value)}
            />
          </label>
          <button
            className="button button-primary"
            disabled={isBusy}
            onClick={() => onLogin(loginName)}
          >
            Continue
          </button>
        </article>

        <article className="card">
          <h2>Create account</h2>
          <p className="muted">Open a Venom Lounge profile with a complimentary bankroll.</p>
          <label>
            Никнейм
            <input
              className="input"
              type="text"
              placeholder="Enter nickname"
              value={registerName}
              onChange={event => setRegisterName(event.target.value)}
            />
          </label>
          <label>
            Starting balance
            <input
              className="input"
              type="number"
              min={100}
              value={registerBalance}
              onChange={event => setRegisterBalance(Number(event.target.value))}
            />
          </label>
          <button
            className="button button-secondary"
            disabled={isBusy}
            onClick={() => onRegister(registerName, registerBalance)}
          >
            Create profile
          </button>
        </article>
      </div>
    </section>
  );
};

export default AuthSection;
