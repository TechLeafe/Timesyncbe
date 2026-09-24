const express = require("express");

const {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
} = require("./employee.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

// JWT authentication for all employee APIs
router.use(authMiddleware);

// CREATE EMPLOYEE
// POST /api/employees/create
router.post("/create", createEmployee);

// GET ALL EMPLOYEES
// GET /api/employees/list
router.get("/list", getEmployees);

// VIEW EMPLOYEE
// POST /api/employees/view
router.post("/view", getEmployee);

// UPDATE EMPLOYEE
// POST /api/employees/update
router.post("/update", updateEmployee);

// DELETE EMPLOYEE
// POST /api/employees/delete
router.post("/delete", deleteEmployee);

module.exports = router;