const express = require("express");

const router = express.Router();

const {
    createLeave,
    getLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave
} = require("./leave.controller");

const authMiddleware = require("../../middleware/auth.middleware");

// JWT authentication for all leave APIs
router.use(authMiddleware);

// Create leave policy
router.post("/create", createLeave);

// Get all leave policies
router.post("/list", getLeaves);

// Get leave policy by ID
router.post("/view", getLeaveById);

// Update leave policy
router.post("/update", updateLeave);

// Delete leave policy
router.post("/delete", deleteLeave);

module.exports = router;