import { useTheme } from "./theme.jsx";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M18.01 18.01l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M18.01 5.99l1.06-1.06" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 14.2A7.2 7.2 0 0 1 10 6.4 5.8 5.8 0 1 0 17.5 14.2Z" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="5" width="16" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 19h8" />
    </svg>
  );
}

const OPTIONS = [
  { id: "light", label: "Light", Icon: SunIcon },
  { id: "dark", label: "Dark", Icon: MoonIcon },
  { id: "system", label: "Auto", Icon: AutoIcon },
];

export function ThemeSwitch() {
  const ctx = useTheme();
  if (!ctx) return null;
  const { theme, setTheme } = ctx;
  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`theme-opt${theme === id ? " on" : ""}`}
          aria-pressed={theme === id}
          aria-label={label}
          title={label}
          onClick={() => setTheme(id)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}

export function SignOutButton({ onSignOut }) {
  return (
    <button className="signout-btn" type="button" title="Sign out" aria-label="Sign out" onClick={onSignOut}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 5h7.5A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5H10" />
      </svg>
    </button>
  );
}
