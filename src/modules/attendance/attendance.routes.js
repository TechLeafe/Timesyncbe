const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");

const {
  checkIn,
  checkOut,
  getAttendanceCronStatus,
  getDailyAttendance,
  getAttendanceHistory,
  getEmployeeAttendance,
  getAttendanceApprovals,
  reviewAttendance,
  correctAttendanceStatus,
  exportAttendance,
} = require("./attendance.controller");

const router = express.Router();

// JWT authentication
router.use(authMiddleware);

const authorizeAdminHR = (req, res, next) => {
  if ([1, 2].includes(Number(req.user.userType))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Only Admin and HR can export attendance",
  });
};

router.get(
  "/export",
  authorizeAdminHR,
  exportAttendance
);

// Check-in
router.post("/check-in", checkIn);

// Check-out
router.post("/check-out", checkOut);

// Cron health/status (Admin / HR only)
router.get("/cron-status", getAttendanceCronStatus);

// Daily attendance
router.post("/daily", getDailyAttendance);

// Attendance history
router.post("/history", getAttendanceHistory);

// Particular employee attendance
router.post("/employee", getEmployeeAttendance);

// Previous-day attendance approval queue (Admin / HR only)
router.post("/approvals", getAttendanceApprovals);
router.post("/review", reviewAttendance);
router.post("/correct", correctAttendanceStatus);

module.exports = router;