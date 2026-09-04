import { Link, Navigate, Route, Routes } from "react-router-dom";
import { PERMISSIONS, ROLES } from "@twm/shared";
import { useAuth } from "./auth.jsx";
import { AppShell } from "./AppShell.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ApprovalsPage } from "./pages/ApprovalsPage.jsx";
import { EmployeesPage } from "./pages/EmployeesPage.jsx";
import { LeavePage } from "./pages/LeavePage.jsx";
import { PayrollPage } from "./pages/PayrollPage.jsx";
import { OrgPage } from "./pages/OrgPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { ActivityLogPage } from "./pages/ActivityLogPage.jsx";

// No matching route (typo, stale bookmark, removed page) — a real page
// instead of react-router-dom silently rendering nothing.
function NotFoundPage() {
  return (
    <div className="page-head" style={{ padding: 24 }}>
      <div>
        <h1 className="page-title">Page not found</h1>
        <p className="muted">
          <Link to="/">Go back home</Link>
        </p>
      </div>
    </div>
  );
}

function Guard({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// The owner sits at the top of the reporting line and has no one to apply
// leave to, so the Leave page (nav link is already hidden) isn't reachable
// by URL either.
function LeaveRoute() {
  const { user } = useAuth();
  if (user?.role === ROLES.OWNER) return <Navigate to="/" replace />;
  return <LeavePage />;
}

// People (clock in/out overview) is restricted to HR/admin/owner.
function EmployeesRoute() {
  const { can } = useAuth();
  if (!can(PERMISSIONS.EMPLOYEE_READ_COMPANY)) return <Navigate to="/" replace />;
  return <EmployeesPage />;
}

// Activity Log is HR/owner only.
function ActivityLogRoute() {
  const { can } = useAuth();
  if (!can(PERMISSIONS.AUDIT_READ_COMPANY)) return <Navigate to="/" replace />;
  return <ActivityLogPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="employees" element={<EmployeesRoute />} />
        <Route path="org" element={<OrgPage />} />
        <Route path="leave" element={<LeaveRoute />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="activity" element={<ActivityLogRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
