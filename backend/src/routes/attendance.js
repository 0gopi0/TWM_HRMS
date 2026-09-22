import { Router } from "express";
import { z } from "zod";
import { PERMISSIONS } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { getStore } from "../store/index.js";
import { assertCanSeeEmployee } from "../services/scope.js";
import { HttpError } from "../utils/httpError.js";
import * as attendance from "../services/attendanceService.js";

export const attendanceRouter = Router();
attendanceRouter.use(authenticate, attachEmployee);
attendanceRouter.use(authorize(PERMISSIONS.ATTENDANCE_CLOCK_SELF));

attendanceRouter.get("/", async (req, res, next) => {
  try {
    res.json(await attendance.getAttendanceStatus(req.employee));
  } catch (err) {
    next(err);
  }
});

// Every employee's clock in/out times — People page only (HR / admin / owner).
attendanceRouter.get(
  "/all",
  authorize(PERMISSIONS.EMPLOYEE_READ_COMPANY),
  async (req, res, next) => {
    try {
      res.json({ data: await attendance.listAllAttendance() });
    } catch (err) {
      next(err);
    }
  },
);

attendanceRouter.post("/clock-in", async (req, res, next) => {
  try {
    res.json(await attendance.clockIn(req.employee));
  } catch (err) {
    next(err);
  }
});

attendanceRouter.post("/clock-out", async (req, res, next) => {
  try {
    res.json(await attendance.clockOut(req.employee));
  } catch (err) {
    next(err);
  }
});

// Team members visible to the caller (same scope as leave approval), with
// today's clock status — for a reporting manager/team lead to see who's
// missing a punch. Closed to plain team members.
attendanceRouter.get("/team", authorize(PERMISSIONS.ATTENDANCE_CLOCK_TEAM), async (req, res, next) => {
  try {
    res.json({ data: await attendance.getTeamAttendanceStatus(req.employee, req.user.role) });
  } catch (err) {
    next(err);
  }
});

// A reporting manager/team lead clocking a team member in for a missed
// punch, backdated only to a specific time today (never a past day).
attendanceRouter.post(
  "/:employeeId/clock-in-for",
  authorize(PERMISSIONS.ATTENDANCE_CLOCK_TEAM),
  validate({
    params: z.object({ employeeId: z.string().min(1) }),
    body: z.object({
      clockInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm"),
    }),
  }),
  async (req, res, next) => {
    try {
      const target = await getStore().getEmployeeById(req.params.employeeId);
      if (!target) throw new HttpError(404, "Employee not found");
      assertCanSeeEmployee(req, target);
      const result = await attendance.manualClockIn({
        actor: req.user,
        targetEmployee: target,
        clockInTime: req.body.clockInTime,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
