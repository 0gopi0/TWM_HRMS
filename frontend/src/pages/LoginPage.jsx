import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { ThemeSwitch } from "../ThemeSwitch.jsx";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-page">
      <div className="login-aurora" aria-hidden="true" />
      <header className="login-chrome">
        <div className="login-brand">
          <img className="login-logo" src="/twm-logo.jpg" alt="The Website Makers" />
          <div>
            <strong>TWM HRMS</strong>
            <p>People, leave, and payroll</p>
          </div>
        </div>
        <ThemeSwitch />
      </header>

      <div className="login-layout">
        <section className="login-hero">
          <p className="login-kicker">The Website Makers</p>
          <h1>
            We don’t just build websites.
            <span> We build businesses.</span>
          </h1>
          <p className="login-lead">
            TWM HRMS is how we run our own people — the same craft we put into client sites, SEO, Meta ads,
            and remarketing. Build once, market with intent, grow on numbers that hold.
          </p>
          <ul className="login-points">
            <li>Build — software and sites that teams actually use</li>
            <li>Market — SEO, Meta ads, and remarketing that return</li>
            <li>Grow — traffic, leads, and payroll in one honest loop</li>
            <li>Stay — transparent delivery, long after launch</li>
          </ul>
        </section>

        <form
          className="login-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await login(email, password);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="login-panel-head">
            <h2>Sign in</h2>
            <p>Enter your email and password.</p>
          </div>

          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="name@twm.local"
              required
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          <p className="muted" style={{ margin: "-8px 0 0", fontSize: 13 }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>

          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
