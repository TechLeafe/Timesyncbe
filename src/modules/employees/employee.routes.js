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

// ==========================================
// PUBLIC ROUTE (No token required)
// ==========================================

// CREATE EMPLOYEE
// POST /api/employees/create
router.post("/create", createEmployee);


// ==========================================
// PROTECTED ROUTES (JWT token required)
// ==========================================
router.use(authMiddleware);

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