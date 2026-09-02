import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { ThemeSwitch } from "../ThemeSwitch.jsx";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api(`/api/v1/auth/reset-password/${encodeURIComponent(token)}`)
      .then((data) => setValid(Boolean(data.valid)))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

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
        <div className="login-panel" style={{ width: "min(420px, 100%)" }}>
          <div className="login-panel-head">
            <h2>Reset password</h2>
          </div>

          {checking ? (
            <p className="muted">Checking your link…</p>
          ) : done ? (
            <>
              <p className="success">
                Your password has been reset. You've been signed out everywhere — sign in again with your
                new password.
              </p>
              <p className="muted" style={{ marginTop: 8 }}>
                <Link to="/login">Go to sign in</Link>
              </p>
            </>
          ) : !valid || !token ? (
            <>
              <p className="error">This reset link is invalid or has expired.</p>
              <p className="muted" style={{ marginTop: 8 }}>
                <Link to="/forgot-password">Request a new link</Link>
              </p>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                if (password !== confirm) {
                  setError("Passwords don't match");
                  return;
                }
                setBusy(true);
                try {
                  await api("/api/v1/auth/reset-password", {
                    method: "POST",
                    body: JSON.stringify({ token, password }),
                  });
                  setDone(true);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                New password
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirm password
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Retype password"
                  minLength={8}
                  required
                />
              </label>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
