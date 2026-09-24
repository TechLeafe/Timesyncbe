const attendanceService = require("./attendance.service");

const {
  validateAttendancePayload,
} = require("./attendance.validation");

// Get target user ID based on logged-in user's role
const getTargetUserId = (req) => {
  const loggedInUserId = req.user.user_id;
  const userType = Number(req.user.userType);

  const requestedUserId =
    typeof req.body.user_id === "string"
      ? req.body.user_id.trim()
      : "";

  // Admin = 1
  // HR = 2
  // Can filter by employee or view all employees
  if (userType === 1 || userType === 2) {
    return requestedUserId;
  }

  // Employee = 3
  // Always use user_id from JWT
  return loggedInUserId;
};

// CHECK IN
const checkIn = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    const attendance =
      await attendanceService.checkIn(user_id);

    return res.status(201).json({
      success: true,
      message: "Check-in successful",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// CHECK OUT
const checkOut = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    const attendance =
      await attendanceService.checkOut(user_id);

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// DAILY ATTENDANCE
const getDailyAttendance = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateAttendancePayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id =
      getTargetUserId(req);

    const date =
      typeof req.body.date === "string"
        ? req.body.date.trim()
        : "";

    const attendance =
      await attendanceService.getDailyAttendance(
        user_id,
        date
      );

    return res.status(200).json({
      success: true,
      message:
        "Daily attendance fetched successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// ATTENDANCE HISTORY
const getAttendanceHistory = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateAttendancePayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id =
      getTargetUserId(req);

    const date =
      typeof req.body.date === "string"
        ? req.body.date.trim()
        : "";

    const attendance =
      await attendanceService.getAttendanceHistory(
        user_id,
        date
      );

    return res.status(200).json({
      success: true,
      message:
        "Attendance history fetched successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// PARTICULAR EMPLOYEE ATTENDANCE
// Admin / HR only
const getEmployeeAttendance = async (
  req,
  res,
  next
) => {
  try {
    const userType =
      Number(req.user.userType);

    // Only Admin and HR
    if (
      userType !== 1 &&
      userType !== 2
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view employee attendance",
      });
    }

    const validation =
      validateAttendancePayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id =
      typeof req.body.user_id === "string"
        ? req.body.user_id.trim()
        : "";

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const date =
      typeof req.body.date === "string"
        ? req.body.date.trim()
        : "";

    const attendance =
      await attendanceService.getEmployeeAttendance(
        user_id,
        date
      );

    return res.status(200).json({
      success: true,
      message:
        "Employee attendance fetched successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getDailyAttendance,
  getAttendanceHistory,
  getEmployeeAttendance,
};