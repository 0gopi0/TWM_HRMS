import { Router } from "express";
import { PERMISSIONS } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
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
