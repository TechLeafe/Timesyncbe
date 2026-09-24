const express = require("express");
const { applyLeave, getLeaveList, updateLeave, reviewLeave,getLeaveBalance } = require("./leaveApply.controller");
const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

// POST endpoints
router.post("/apply", applyLeave);
router.post("/list", getLeaveList);
router.post("/update", updateLeave);
router.post("/review", reviewLeave);
router.post("/balance", getLeaveBalance);
module.exports = router;