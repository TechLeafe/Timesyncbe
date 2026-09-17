const express = require("express");

const {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
} = require("./employee.controller");

const router = express.Router();

// CREATE employee
// POST /api/employees/create
router.post("/create", createEmployee);

// LIST employees
// GET /api/employees/list
router.get("/list", getEmployees);

// VIEW single employee
// GET /api/employees/view/:id
router.get("/view/:id", getEmployee);

// UPDATE employee
// POST /api/employees/update/:id
router.post("/update/:id", updateEmployee);

// DELETE employee
// POST /api/employees/delete/:id
router.post("/delete/:id", deleteEmployee);

module.exports = router;