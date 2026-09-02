import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, LEAVE_ENTITLEMENT_LIST, LEAVE_ENTITLEMENTS, PERMISSIONS, ROLE_PERMISSIONS } from "@twm/shared";

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

const DEPARTMENTS = [
  { id: "dept-sales", name: "Sales Team" },
  { id: "dept-admin", name: "Administration" },
  { id: "dept-hr", name: "HR Department" },
  { id: "dept-web", name: "Web Development" },
  { id: "dept-marketing", name: "Marketing & Media" },
];

const TEAMS = [
  { id: "team-sales", name: "Sales", departmentId: "dept-sales", leaderEmployeeId: "emp-naveen" },
  { id: "team-admin", name: "Administration", departmentId: "dept-admin", leaderEmployeeId: "emp-prashanth" },
  { id: "team-hr", name: "HR", departmentId: "dept-hr", leaderEmployeeId: "emp-chai" },
  { id: "team-web-hari", name: "Web - Hari", departmentId: "dept-web", leaderEmployeeId: "emp-hari" },
  { id: "team-web-gopi", name: "Web - Gopi", departmentId: "dept-web", leaderEmployeeId: "emp-gopi" },
  { id: "team-web-prajwal", name: "Web - Prajwal", departmentId: "dept-web", leaderEmployeeId: "emp-prajwal" },
  { id: "team-marketing", name: "Marketing & Media", departmentId: "dept-marketing", leaderEmployeeId: "emp-meghna" },
];

function salaryFor(employee) {
  // Simple deterministic banding by job title for demo salaries.
  if (employee.role === "owner") return 200000;
  if (employee.jobTitle?.includes("Director") || employee.jobTitle?.includes("Vice President")) return 150000;
  if (employee.jobTitle?.includes("Senior")) return 100000;
  if (employee.jobTitle?.includes("Team Lead")) return 85000;
  if (employee.jobTitle?.includes("Manager")) return 80000;
  if (employee.jobTitle?.includes("Developer") || employee.jobTitle?.includes("Designer") || employee.jobTitle?.includes("Editor")) return 60000;
  if (employee.jobTitle?.includes("Accountant") || employee.jobTitle?.includes("Content")) return 55000;
  if (employee.jobTitle?.includes("Associate") || employee.jobTitle?.includes("Intern")) return 40000;
  return 50000;
}

export async function buildSeed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = DEMO_ACCOUNTS.map((a) => ({
    id: a.userId,
    email: a.email,
    passwordHash,
    role: a.role,
    isActive: true,
  }));

  const employees = DEMO_ACCOUNTS.map((a) => ({
    id: a.employeeId,
    userId: a.userId,
    employeeNumber: a.employeeNumber,
    legalName: a.name,
    jobTitle: a.jobTitle,
    departmentId: a.departmentId,
    teamId: a.teamId,
    managerId: a.managerId,
    leaveApproverId: a.leaveApproverId || null,
    employmentStatus: "active",
  }));

  const salaries = DEMO_ACCOUNTS.map((a) => ({
    id: randomUUID(),
    employeeId: a.employeeId,
    currency: "INR",
    baseAmount: salaryFor(a),
    effectiveFrom: "2026-01-01",
  }));

  return {
    demoPassword: DEMO_PASSWORD,
    departments: DEPARTMENTS,
    teams: TEAMS,
    users,
    employees,
    salaries,
    holidays: [
      { id: "hol-pongal", name: "Pongal", date: "2026-01-14", kind: "festival" },
      { id: "hol-republic", name: "Republic Day", date: "2026-01-26", kind: "festival" },
      { id: "hol-holi", name: "Holi", date: "2026-03-03", kind: "festival" },
      { id: "hol-tamil-new-year", name: "Tamil New Year", date: "2026-04-14", kind: "festival" },
      { id: "hol-independence", name: "Independence Day", date: "2026-08-15", kind: "festival" },
      { id: "hol-ganesh", name: "Ganesh Chaturthi", date: "2026-09-14", kind: "optional" },
      { id: "hol-gandhi", name: "Gandhi Jayanti", date: "2026-10-02", kind: "festival" },
      { id: "hol-diwali", name: "Diwali", date: "2026-11-08", kind: "festival" },
      { id: "hol-christmas", name: "Christmas", date: "2026-12-25", kind: "festival" },
    ],
    leaveRequests: [],
    leaveEntitlements: DEMO_ACCOUNTS.flatMap((emp) =>
      LEAVE_ENTITLEMENT_LIST.map((leaveType) => ({
        employeeId: emp.employeeId,
        year: 2026,
        leaveType,
        days: LEAVE_ENTITLEMENTS[leaveType] ?? 0,
      })),
    ),
    permissions: Object.values(PERMISSIONS),
    rolePermissions: ROLE_PERMISSIONS,
  };
}
