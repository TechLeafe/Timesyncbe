
const dashboardService = require("./dashboard.service");
const validateDashboard = require("./dashboard.validation");

// ==========================================
// ADMIN & HR DASHBOARD
// ==========================================

const getAdminDashboard = async (req, res, next) => {
  try {
    // Admin = 1, HR = 2
    if (![1, 2].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const validation = validateDashboard(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const dashboard =
      await dashboardService.getAdminDashboard(
        req.body.date
      );

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYEE DASHBOARD
// ==========================================

const getEmployeeDashboard = async (req, res, next) => {
  try {
    // Employee = 3
    if (req.user.userType !== 3) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const validation = validateDashboard(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Use authenticated MongoDB employee ID
    const employeeMongoId = req.user.id;

    if (!employeeMongoId) {
      return res.status(401).json({
        success: false,
        message: "Invalid employee ID. Please login again",
      });
    }

    const dashboard =
      await dashboardService.getEmployeeDashboard(
        employeeMongoId,
        req.body.date
      );

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};
