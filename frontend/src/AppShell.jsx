import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { labelForRole, PERMISSIONS, ROLES } from "@twm/shared";
import { useAuth } from "./auth.jsx";
import { SignOutButton, ThemeSwitch } from "./ThemeSwitch.jsx";

/* ─── Icons (inline, stroke-based) ─────────────────────────────────────── */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16" />
      <path d="M9 15.5l2 2 4-4" />
    </svg>
  ),
  approvals: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.6" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.4a3.4 3.4 0 0 1 0 5.4M18.5 19a5 5 0 0 0-3.4-4.7" />
    </svg>
  ),
  org: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <rect x="8.5" y="3.5" width="7" height="4" rx="1.2" />
      <rect x="3.5" y="16.5" width="7" height="4" rx="1.2" />
      <rect x="13.5" y="16.5" width="7" height="4" rx="1.2" />
      <path d="M12 7.5v4M7 16.5v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M12 11.5v3" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16" />
      <path d="M8 14h0M12 14h0M16 14h0M8 17.5h0M12 17.5h0" />
    </svg>
  ),
  payroll: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <rect x="3" y="6" width="18" height="13" rx="2.2" />
      <circle cx="12" cy="12.5" r="2.6" />
      <path d="M6.5 9.5h0M17.5 15.5h0" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
      <path d="M4 12h4l2-7 4 14 2-7h4" />
    </svg>
  ),
};

/* ─── Navigation definitions ──────────────────────────────────────────── */
const TOP_NAV = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true, perm: null },
  // The top of the org (owner) doesn't request leave, so hide the Leave nav for them.
  { to: "/leave", label: "Leave", icon: "leave", perm: PERMISSIONS.LEAVE_READ_SELF, hideForOwner: true },
  { to: "/approvals", label: "Approvals", icon: "approvals", perm: PERMISSIONS.LEAVE_APPROVE_TEAM },
  // People (everyone's directory, attendance, and LOP) is HR/owner only —
  // not the generic Admin Access role.
  { to: "/employees", label: "People", icon: "people", perm: PERMISSIONS.EMPLOYEE_READ_COMPANY },
  { to: "/org", label: "Org Chart", icon: "org", perm: PERMISSIONS.EMPLOYEE_READ_SELF },
  { to: "/calendar", label: "Calendar", icon: "calendar", perm: PERMISSIONS.LEAVE_READ_SELF },
  { to: "/payroll", label: "Payroll", icon: "payroll", perm: PERMISSIONS.PAYROLL_READ_SELF },
  // Who did what, to whom — HR/owner only.
  { to: "/activity", label: "Activity Log", icon: "activity", perm: PERMISSIONS.AUDIT_READ_COMPANY },
];

function navAllowed(can, item, isOwner) {
  if (item.hideForOwner && isOwner) return false;
  if (!item.perm) return true;
  return can(item.perm);
}

export function AppShell() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  const name = user?.employee?.legalName || user?.email || "";
  const roleLabel = user?.employee?.jobTitle || labelForRole(user?.role);
  const roleBadge = labelForRole(user?.role);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isOwner = user?.role === ROLES.OWNER;
  const visibleNav = TOP_NAV.filter((l) => navAllowed(can, l, isOwner));

  return (
    <div className="app-shell">
      {/* Slim top bar shown only below the desktop breakpoint (hamburger + brand) */}
      <header className="mobile-topbar">
        <button className="menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <img className="mobile-topbar-logo" src="/twm-logo.jpg" alt="TWM HRMS" />
        <div className="mobile-topbar-actions">
          <span className="role-pill" title={roleBadge}>{roleBadge}</span>
        </div>
      </header>

      {/* Dimmed scrim behind the drawer on mobile */}
      <div className={`sidebar-scrim${open ? " on" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={`sidebar${open ? " open" : ""}`} aria-label="Primary">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/twm-logo.jpg" alt="TWM HRMS" />
          <button className="sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {visibleNav.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <span className="sidebar-ico">{Icons[l.icon]}</span>
              <span className="sidebar-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-avatar" aria-hidden="true">{initials || "?"}</span>
            <span className="sidebar-user-meta">
              <span className="sidebar-user-name">{name}</span>
              <span className="sidebar-user-role">{roleLabel}</span>
            </span>
          </div>
          <div className="sidebar-actions">
            <ThemeSwitch />
            <SignOutButton
              onSignOut={async () => {
                await logout();
                navigate("/login");
              }}
            />
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
