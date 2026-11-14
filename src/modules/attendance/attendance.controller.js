const attendanceService = require("./attendance.service");
const attendanceCronStatus = require("./attendanceCronStatus");
const attendanceScheduler = require("./attendanceScheduler");
const {
  generateAttendanceExcel,
} = require("./attendanceExport.service");

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

// ATTENDANCE CRON STATUS (Admin / HR only)
const getAttendanceCronStatus = async (req, res) => {
  const userType = Number(req.user.userType);

  if (userType !== 1 && userType !== 2) {
    return res.status(403).json({
      success: false,
      message: "Only Admin and HR can view attendance cron status",
    });
  }

  await attendanceScheduler.ensureDueFinalization();
  const data = attendanceCronStatus.getStatus();
  return res.status(200).json({
    success: true,
    message: data.scheduled
      ? "Attendance cron is scheduled"
      : "Attendance cron is not scheduled",
    data,
  });
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

    const finalization =
      await attendanceScheduler.ensureDueFinalization();
    if (finalization.error) {
      return next(finalization.error);
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

const requireReviewer = (req, res) => {
  const userType = Number(req.user.userType);
  if (userType === 1 || userType === 2) return true;

  res.status(403).json({
    success: false,
    message: "Only HR or Admin can review attendance",
  });
  return false;
};

const getAttendanceApprovals = async (req, res, next) => {
  if (!requireReviewer(req, res)) return;

  try {
    const approvals =
      await attendanceService.getAttendanceApprovals();
    return res.status(200).json({
      success: true,
      message: "Pending attendance approvals fetched successfully",
      data: approvals,
    });
  } catch (error) {
    next(error);
  }
};

const reviewAttendance = async (req, res, next) => {
  if (!requireReviewer(req, res)) return;

  try {
    const { attendanceId, decision } = req.body;
    if (
      typeof attendanceId !== "string" ||
      !attendanceId.trim() ||
      !["Approved", "Rejected"].includes(decision)
    ) {
      return res.status(400).json({
        success: false,
        message: "Attendance ID and an Approved/Rejected decision are required",
      });
    }

    const attendance = await attendanceService.reviewAttendance(
      attendanceId.trim(),
      decision,
      req.user.user_id
    );

    return res.status(200).json({
      success: true,
      message: `Attendance ${decision.toLowerCase()} successfully`,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

const correctAttendanceStatus = async (req, res, next) => {
  if (!requireReviewer(req, res)) return;

  try {
    const {
      user_id,
      date,
      currentStatus,
      attendanceStatus,
      reason,
    } = req.body;
    if (
      typeof user_id !== "string" ||
      !user_id.trim() ||
      typeof date !== "string" ||
      !date.trim() ||
      typeof currentStatus !== "string" ||
      typeof attendanceStatus !== "string" ||
      typeof reason !== "string" ||
      !reason.trim() ||
      reason.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee ID, date, attendance status, and a correction reason of 1 to 1000 characters are required",
      });
    }

    const attendance = await attendanceService.correctAttendanceStatus(
      user_id,
      date,
      currentStatus,
      attendanceStatus,
      reason,
      req.user.user_id
    );

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

const exportAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const isValidDate = (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(new Date(`${value}T00:00:00.000Z`).getTime()) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value);

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Valid startDate and endDate are required in YYYY-MM-DD format",
      });
    }

    const leaveType = req.query.leaveType || "ALL";
    if (!["ALL", "CL", "SL", "COMP_OFF", "PERMISSION"].includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leaveType filter",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate must be on or before endDate",
      });
    }

    const rows = await attendanceService.getAttendanceExportRows(
      startDate,
      endDate,
      leaveType
    );
    const workbook = await generateAttendanceExcel(rows, leaveType);

    res
      .status(200)
      .type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .set(
        "Content-Disposition",
        `attachment; filename="Employee_Attendance_${startDate}_to_${endDate}.xlsx"`
      )
      .send(Buffer.from(workbook));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAttendanceCronStatus,
  getDailyAttendance,
  getAttendanceHistory,
  getEmployeeAttendance,
  getAttendanceApprovals,
  reviewAttendance,
  correctAttendanceStatus,
  exportAttendance,
};