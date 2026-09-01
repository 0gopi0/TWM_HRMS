import { useState } from "react";
import { Navigate } from "react-router-dom";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@twm/shared";
import { useAuth } from "../auth.jsx";
import { ThemeSwitch } from "../ThemeSwitch.jsx";

const DEMO_GROUPS = [
  { id: "owner", label: "Owner" },
  { id: "dept-sales", label: "Sales" },
  { id: "dept-admin", label: "Administration" },
  { id: "dept-hr", label: "HR" },
  { id: "dept-web", label: "Web Development" },
  { id: "dept-marketing", label: "Marketing & Media" },
];

// Group the demo accounts by department; the owner (top of the org) is kept
// in its own group and listed first. Order within each group follows the
// DEMO_ACCOUNTS array.
function groupDemoAccounts() {
  const groups = DEMO_GROUPS.map((g) => ({ ...g, accounts: [] }));
  const byDept = Object.fromEntries(groups.filter((g) => g.id !== "owner").map((g) => [g.id, g]));
  const ownerGroup = groups.find((g) => g.id === "owner");
  for (const account of DEMO_ACCOUNTS) {
    if (account.roleLabel?.toLowerCase() === "owner") {
      ownerGroup.accounts.push(account);
    } else {
      const bucket = byDept[account.departmentId];
      (bucket || ownerGroup).accounts.push(account);
    }
  }
  return groups.filter((g) => g.accounts.length > 0 || g.id === "owner");
}

export function LoginPage() {
  const { user, login } = useAuth();
  const [selectedKey, setSelectedKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function applyAccount(account) {
    setSelectedKey(account.key);
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

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
            <p>Enter your email and password, or tap a name below to fill them.</p>
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

          <div className="people-tabs-wrap">
            <p className="people-tabs-label">Demo people</p>
            <div className="people-tabs" aria-label="Demo accounts">
              {groupDemoAccounts().map((group) => (
                <div className="people-group" key={group.id}>
                  <p className="people-group-label">{group.label}</p>
                  <div className="people-group-tabs" role="group" aria-label={group.label}>
                    {group.accounts.map((account) => {
                      const selected = selectedKey === account.key;
                      return (
                        <button
                          key={account.key}
                          type="button"
                          aria-pressed={selected}
                          className={`person-tab${selected ? " selected" : ""}`}
                          title={account.jobTitle}
                          onClick={() => applyAccount(account)}
                        >
                          <span className="person-tab-name">{account.name}</span>
                          <span className="person-tab-role">{account.roleLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
