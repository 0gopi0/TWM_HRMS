import { Navigate, Route, Routes } from "react-router-dom";
import { PERMISSIONS, ROLES } from "@twm/shared";
import { useAuth } from "./auth.jsx";
import { AppShell } from "./AppShell.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ApprovalsPage } from "./pages/ApprovalsPage.jsx";
import { EmployeesPage } from "./pages/EmployeesPage.jsx";
import { LeavePage } from "./pages/LeavePage.jsx";
import { PayrollPage } from "./pages/PayrollPage.jsx";
import { OrgPage } from "./pages/OrgPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";

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

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
      </Route>
    </Routes>
  );
}
