const express = require("express");

const {
  applyLeave,
} = require("./leaveApply.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/apply",
  authMiddleware,
  applyLeave
);

module.exports = router;