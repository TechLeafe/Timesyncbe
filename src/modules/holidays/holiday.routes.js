const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");

const {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
} = require("./holiday.controller");

const router = express.Router();

// JWT authentication
router.use(authMiddleware);

// Create
router.post(
  "/create",
  createHoliday
);

// List / filter
router.post(
  "/list",
  getHolidays
);

// View
router.post(
  "/view",
  getHolidayById
);

// Update
router.post(
  "/update",
  updateHoliday
);

// Delete
router.post(
  "/delete",
  deleteHoliday
);

module.exports = router;