import { Router } from "express";
import { z } from "zod";
import { ASSIGNABLE_ROLES, PERMISSIONS, hasPermission, permissionsForRole } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { getStore } from "../store/index.js";
import { assertCanSeeEmployee, canSeeEmployee } from "../services/scope.js";
import { paginated, parsePagination } from "../utils/pagination.js";
import { HttpError } from "../utils/httpError.js";
import { getOrgChart } from "../services/orgService.js";
import * as employeeService from "../services/employeeService.js";

export const meRouter = Router();
meRouter.use(authenticate, attachEmployee);

meRouter.get("/", (req, res) => {
  res.json({
    user: req.user,
    employee: req.employee,
    permissions: permissionsForRole(req.user.role),
  });
});

export const employeesRouter = Router();
employeesRouter.use(authenticate, attachEmployee);

employeesRouter.get("/org", authorize(PERMISSIONS.EMPLOYEE_READ_SELF), async (req, res, next) => {
  try {
    res.json(await getOrgChart());
  } catch (err) {
    next(err);
  }
});

employeesRouter.get("/", authorize(PERMISSIONS.EMPLOYEE_READ_SELF), async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const all = await getStore().listEmployees();
    const visible = all.filter((e) => canSeeEmployee(req.employee, req.user.role, e));
    let slice = visible.slice(offset, offset + pageSize);
    // Email is only needed for the edit-employee form; don't hand every
    // coworker's login email to whoever can merely see the directory.
    if (!hasPermission(req.user.role, PERMISSIONS.EMPLOYEE_WRITE_COMPANY)) {
      slice = slice.map(({ email, ...rest }) => rest);
    }
    res.json(paginated(slice, visible.length, { page, pageSize }));
  } catch (err) {
    next(err);
  }
});

// Reference lookups for the create-employee form. Registered before
// "/:id" so "departments"/"teams" aren't swallowed as an employee id.
employeesRouter.get("/departments", authorize(PERMISSIONS.EMPLOYEE_READ_SELF), async (req, res, next) => {
  try {
    res.json({ data: await employeeService.listDepartments() });
  } catch (err) {
    next(err);
  }
});

employeesRouter.get("/teams", authorize(PERMISSIONS.EMPLOYEE_READ_SELF), async (req, res, next) => {
  try {
    res.json({ data: await employeeService.listTeams() });
  } catch (err) {
    next(err);
  }
});

employeesRouter.post(
  "/",
  authorize(PERMISSIONS.EMPLOYEE_WRITE_COMPANY, PERMISSIONS.USER_PROVISION_COMPANY),
  validate({
    body: z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8).max(128),
      legalName: z.string().trim().min(1).max(255),
      jobTitle: z.string().trim().max(128).optional(),
      role: z.enum(ASSIGNABLE_ROLES),
      departmentId: z.string().min(1),
      teamId: z.string().min(1).optional(),
      managerId: z.string().min(1).optional(),
      leaveApproverId: z.string().min(1).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const created = await employeeService.createEmployee({
        actorUser: req.user,
        ...req.body,
        requestId: req.requestId,
        ip: req.ip,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  },
);

employeesRouter.get(
  "/:id",
  validate({ params: z.object({ id: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      const emp = await getStore().getEmployeeById(req.params.id);
      if (!emp) throw new HttpError(404, "Employee not found");
      assertCanSeeEmployee(req, emp);
      res.json({ data: emp });
    } catch (err) {
      next(err);
    }
  },
);

employeesRouter.patch(
  "/:id",
  authorize(PERMISSIONS.EMPLOYEE_WRITE_COMPANY),
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      legalName: z.string().trim().min(1).max(255),
      email: z.string().trim().toLowerCase().email().optional(),
      jobTitle: z.string().trim().max(128).optional(),
      role: z.enum(ASSIGNABLE_ROLES).optional(),
      departmentId: z.string().min(1),
      teamId: z.string().min(1).optional(),
      managerId: z.string().min(1).optional(),
      leaveApproverId: z.string().min(1).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const updated = await employeeService.updateEmployee({
        actorUser: req.user,
        id: req.params.id,
        ...req.body,
        requestId: req.requestId,
        ip: req.ip,
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

employeesRouter.delete(
  "/:id",
  authorize(PERMISSIONS.EMPLOYEE_WRITE_COMPANY),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      await employeeService.deleteEmployee({
        actorUser: req.user,
        id: req.params.id,
        requestId: req.requestId,
        ip: req.ip,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
