const express = require("express");

const router = express.Router();

const {
    createLeave,
    getLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave
} = require("./leave.controller");

router.post("/", createLeave);

router.get("/", getLeaves);

router.get("/:id", getLeaveById);

router.put("/:id", updateLeave);

router.delete("/:id", deleteLeave);

module.exports = router;