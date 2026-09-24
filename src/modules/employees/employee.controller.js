const employeeService = require("./employee.service");
const validateEmployee = require("./employee.validation");

// CREATE EMPLOYEE
const createEmployee = async (req, res, next) => {
  try {
    const validation = validateEmployee(req.body, true);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const employee = await employeeService.createEmployee(req.body);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL EMPLOYEES
const getEmployees = async (req, res, next) => {
  try {
    const employees = await employeeService.getAllEmployees();

    return res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

// VIEW SINGLE EMPLOYEE
const getEmployee = async (req, res, next) => {
  try {
    const { user_id } = req.body;

    if (!user_id || !user_id.trim()) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const employee = await employeeService.getEmployeeByUserId(user_id);

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE EMPLOYEE
const updateEmployee = async (req, res, next) => {
  try {
    const validation = validateEmployee(req.body, false);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const employee = await employeeService.updateEmployee(req.body);

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE EMPLOYEE
const deleteEmployee = async (req, res, next) => {
  try {
    const { _id } = req.body;

    if (!_id || !_id.trim()) {
      return res.status(400).json({
        success: false,
        message: "_id is required",
      });
    }

    const result = await employeeService.deleteEmployee(_id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
};