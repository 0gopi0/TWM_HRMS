import { Router } from "express";
import { z } from "zod";
import { PERMISSIONS } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { getStore } from "../store/index.js";
import * as leaveService from "../services/leaveService.js";
import { paginated, parsePagination } from "../utils/pagination.js";
import { HttpError } from "../utils/httpError.js";
import { assertCanSeeEmployee } from "../services/scope.js";

const leaveTypeSchema = z.enum(["sick", "casual", "unpaid"]);

const leaveBody = z.object({
  leaveType: leaveTypeSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  halfDay: z.boolean().optional(),
  reason: z.string().max(512).optional(),
});

function withNames(rows, byId) {
  return rows.map((row) => ({
    ...row,
    startDate: leaveService.asYmd(row.startDate),
    endDate: leaveService.asYmd(row.endDate),
    employeeName: byId.get(row.employeeId)?.legalName || null,
  }));
}

// Attach the rejection comment (if any) to rejected leaves so applicants
// can see why their request was turned down.
async function withRejectionReasons(rows) {
  const store = getStore();
  const out = [];
  for (const row of rows) {
    if (row.status !== "rejected") {
      out.push(row);
      continue;
    }
    const approvals = await store.listApprovals(row.id);
    const rejection = approvals.find((a) => a.decision === "rejected");
    out.push({ ...row, rejectionReason: rejection?.comment || null });
  }
  return out;
}

export const leaveRouter = Router();
leaveRouter.use(authenticate, attachEmployee);

leaveRouter.get("/", authorize(PERMISSIONS.LEAVE_READ_SELF), async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const store = getStore();
    const items = await store.listLeave();
    const employees = await store.listEmployees();
    const byId = new Map(employees.map((e) => [e.id, e]));
    const visible = leaveService.visibleLeave(req.user.role, req.employee, items, byId);
    const employeeId = typeof req.query.employeeId === "string" ? req.query.employeeId : "";
    const filtered = employeeId ? visible.filter((row) => row.employeeId === employeeId) : visible;
    const named = withNames(filtered.slice(offset, offset + pageSize), byId);
    const slice = await withRejectionReasons(named);
    res.json(paginated(slice, filtered.length, { page, pageSize }));
  } catch (err) {
    next(err);
  }
});

leaveRouter.get("/balances", authorize(PERMISSIONS.LEAVE_READ_SELF), async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const employeeId = typeof req.query.employeeId === "string" && req.query.employeeId
      ? req.query.employeeId
      : req.employee?.id;
    if (!employeeId) throw new HttpError(409, "No employee profile");
    if (employeeId !== req.employee?.id) {
      const target = await getStore().getEmployeeById(employeeId);
      assertCanSeeEmployee(req, target);
    }
    res.json(await leaveService.getLeaveBalances({ employeeId, year }));
  } catch (err) {
    next(err);
  }
});

leaveRouter.get("/entitlements", authorize(PERMISSIONS.LEAVE_POLICY_WRITE), async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    res.json({ data: await leaveService.listEntitlements(year), year });
  } catch (err) {
    next(err);
  }
});

leaveRouter.put(
  "/entitlements",
  authorize(PERMISSIONS.LEAVE_POLICY_WRITE),
  validate({
    body: z.object({
      employeeId: z.string().min(1),
      year: z.coerce.number().int().min(2000).max(2100).optional(),
      casual: z.coerce.number().int().min(0).max(365),
      paid: z.coerce.number().int().min(0).max(365),
      unpaid: z.coerce.number().int().min(0).max(365).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const year = req.body.year || new Date().getFullYear();
      const saved = await leaveService.saveEntitlements({
        actor: req.user,
        employeeId: req.body.employeeId,
        year,
        casual: req.body.casual,
        paid: req.body.paid,
        unpaid: req.body.unpaid,
      });
      res.json({ data: saved });
    } catch (err) {
      next(err);
    }
  },
);

leaveRouter.post(
  "/",
  authorize(PERMISSIONS.LEAVE_CREATE_SELF),
  validate({ body: leaveBody }),
  async (req, res, next) => {
    try {
      if (!req.employee) throw new HttpError(409, "No employee profile");
      const created = await leaveService.createLeaveRequest({
        employee: req.employee,
        ...req.body,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  },
);

leaveRouter.post(
  "/managed",
  authorize(PERMISSIONS.LEAVE_POLICY_WRITE),
  validate({
    body: leaveBody.extend({
      employeeId: z.string().min(1),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const created = await leaveService.createManagedLeave({
        actor: req.user,
        ...req.body,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  },
);

leaveRouter.patch(
  "/:id",
  authorize(PERMISSIONS.LEAVE_POLICY_WRITE),
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: leaveBody.extend({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const updated = await leaveService.updateManagedLeave({
        actor: req.user,
        leaveId: req.params.id,
        ...req.body,
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

leaveRouter.post(
  "/:id/decide",
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      decision: z.enum(["approved", "rejected"]),
      comment: z.string().max(512).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const result = await leaveService.decideLeave({
        user: req.user,
        leaveId: req.params.id,
        decision: req.body.decision,
        comment: req.body.comment,
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);
