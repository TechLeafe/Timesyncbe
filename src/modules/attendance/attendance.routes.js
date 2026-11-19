
const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const desktopOnly = require("../../middleware/desktopOnly.middleware");

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

// ========================================
// JWT Authentication - All Routes
// ========================================
router.use(authMiddleware);

// ========================================
// Admin / HR Authorization
// ========================================
const authorizeAdminHR = (req, res, next) => {
  if ([1, 2].includes(Number(req.user.userType))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Only Admin and HR can export attendance",
  });
};

// ========================================
// Export Attendance - Admin / HR
// ========================================
router.get(
  "/export",
  authorizeAdminHR,
  exportAttendance
);

// ========================================
// Check In - Desktop / Laptop Only
// ========================================
router.post(
  "/check-in",
  desktopOnly,
  checkIn
);

// ========================================
// Check Out - Desktop / Laptop Only
// ========================================
router.post(
  "/check-out",
  desktopOnly,
  checkOut
);

// ========================================
// Cron Health / Status
// ========================================
router.get(
  "/cron-status",
  getAttendanceCronStatus
);

// ========================================
// Daily Attendance
// ========================================
router.post(
  "/daily",
  getDailyAttendance
);

// ========================================
// Attendance History
// ========================================
router.post(
  "/history",
  getAttendanceHistory
);

// ========================================
// Particular Employee Attendance
// ========================================
router.post(
  "/employee",
  getEmployeeAttendance
);

// ========================================
// Attendance Approvals
// ========================================
router.post(
  "/approvals",
  getAttendanceApprovals
);

// ========================================
// Review Attendance
// ========================================
router.post(
  "/review",
  reviewAttendance
);

// ========================================
// Correct Attendance Status
// ========================================
router.post(
  "/correct",
  correctAttendanceStatus
);

module.exports = router;
