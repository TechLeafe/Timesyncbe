const dashboardService = require("./dashboard.service");
const validateDashboard = require("./dashboard.validation");

const getAdminDashboard = async (req, res, next) => {
  try {
    // Admin = 1
    // Humanresource = 2

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

    const dashboard = await dashboardService.getAdminDashboard(
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

    const dashboard = await dashboardService.getEmployeeDashboard(
      req.user.user_id,
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

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};