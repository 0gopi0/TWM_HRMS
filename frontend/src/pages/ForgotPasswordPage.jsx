import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ThemeSwitch } from "../ThemeSwitch.jsx";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

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

      <div className="login-layout" style={{ display: "flex", justifyContent: "center" }}>
        <form
          className="login-panel"
          style={{ width: "min(420px, 100%)" }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/v1/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email }),
              });
              setSent(true);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="login-panel-head">
            <h2>Forgot password</h2>
            <p>Enter your account email and we'll send a link to reset your password.</p>
          </div>

          {sent ? (
            <p className="success">
              If an account exists for that email, we've sent a reset link. It expires in 30 minutes.
            </p>
          ) : (
            <>
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
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}

          <p className="muted" style={{ marginTop: 8 }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
