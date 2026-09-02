import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { PERMISSIONS } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as payroll from "../services/payrollService.js";

export const payrollRouter = Router();
payrollRouter.use(authenticate, attachEmployee);

payrollRouter.get("/payslips", authorize(PERMISSIONS.PAYROLL_READ_SELF), async (req, res, next) => {
  try {
    const data = await payroll.listPayslips(req.user, req.employee);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post(
  "/payslips",
  authorize(PERMISSIONS.PAYROLL_WRITE_COMPANY),
  validate({
    body: z.object({
      employeeId: z.string().min(1),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      baseSalary: z.number().positive().max(10_000_000),
      extras: z
        .array(z.object({ label: z.string().trim().min(1).max(120), amount: z.number().min(0).max(10_000_000) }))
        .max(50)
        .default([]),
    }),
  }),
  async (req, res, next) => {
    try {
      const created = await payroll.createPayslip({
        user: req.user,
        actorEmployeeId: req.employee?.id,
        employeeId: req.body.employeeId,
        period: req.body.period,
        baseSalary: req.body.baseSalary,
        extras: req.body.extras,
        requestId: req.requestId,
        ip: req.ip,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  },
);

payrollRouter.delete(
  "/payslips/:id",
  authorize(PERMISSIONS.PAYROLL_WRITE_COMPANY),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      await payroll.deletePayslip({
        user: req.user,
        actorEmployeeId: req.employee?.id,
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

payrollRouter.post(
  "/payments",
  authorize(PERMISSIONS.PAYROLL_WRITE_COMPANY),
  async (req, res, next) => {
    try {
      const key = req.headers["idempotency-key"] || randomUUID();
      const run = await payroll.runPayment({ user: req.user, actorEmployeeId: req.employee?.id, idempotencyKey: String(key) });
      res.status(201).json({ data: run });
    } catch (err) {
      next(err);
    }
  },
);
