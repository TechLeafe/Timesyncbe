const express = require("express");

const {
  getAdminDashboard,
  getEmployeeDashboard,
} = require("./dashboard.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/admin", getAdminDashboard);

router.post("/employee", getEmployeeDashboard);

module.exports = router;