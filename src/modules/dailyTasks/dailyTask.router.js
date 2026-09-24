const express = require("express");
const {
  createTask,
  getTaskList,
  updateTask,
  changeTaskStatus,
  addComment,
  deleteTask,
} = require("./dailyTask.controller");

const authMiddleware = require("../../middleware/auth.middleware");


const router = express.Router();

// JWT authentication middleware for all Daily Task APIs
router.use(authMiddleware);

// Dedicated Post Routes (Payload via Request Body)
router.post("/create", createTask);
router.post("/list", getTaskList);
router.post("/update", updateTask);
router.post("/change-status", changeTaskStatus);
router.post("/add-comment", addComment);
router.post("/delete", deleteTask);

module.exports = router;