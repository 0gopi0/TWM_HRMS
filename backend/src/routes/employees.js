import { Router } from "express";
import { z } from "zod";
import { PERMISSIONS, permissionsForRole } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { getStore } from "../store/index.js";
import { assertCanSeeEmployee, canSeeEmployee } from "../services/scope.js";
import { paginated, parsePagination } from "../utils/pagination.js";
import { HttpError } from "../utils/httpError.js";
import { getOrgChart } from "../services/orgService.js";

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
    const slice = visible.slice(offset, offset + pageSize);
    res.json(paginated(slice, visible.length, { page, pageSize }));
  } catch (err) {
    next(err);
  }
});

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
