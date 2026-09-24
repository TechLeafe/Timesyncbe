const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");

const {
  checkIn,
  checkOut,
  getDailyAttendance,
  getAttendanceHistory,
  getEmployeeAttendance,
} = require("./attendance.controller");

const router = express.Router();

// JWT authentication
router.use(authMiddleware);

// Check-in
router.post("/check-in", checkIn);

// Check-out
router.post("/check-out", checkOut);

// Daily attendance
router.post("/daily", getDailyAttendance);

// Attendance history
router.post("/history", getAttendanceHistory);

// Particular employee attendance
router.post("/employee", getEmployeeAttendance);

module.exports = router;