const Attendance = require("./attendance.model");
const Employee = require("../employees/employee.model");

// Get today's date in India
const getToday = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};

// Validate date format
const isValidDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  return (
    !isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().startsWith(date)
  );
};

// Calculate working seconds
const calculateWorkingSeconds = (
  checkInTime,
  endTime
) => {
  return Math.max(
    0,
    Math.floor(
      (new Date(endTime).getTime() -
        new Date(checkInTime).getTime()) /
        1000
    )
  );
};

// CHECK IN
const checkIn = async (user_id) => {
  const employee = await Employee.findOne({
    user_id,
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  if (employee.status === "Inactive") {
    const error = new Error(
      "Employee account is inactive"
    );
    error.statusCode = 400;
    throw error;
  }

  const day = getToday();

  const existingAttendance =
    await Attendance.findOne({
      user_id,
      day,
    });

  if (existingAttendance) {
    const error = new Error(
      "Employee has already checked in today"
    );
    error.statusCode = 400;
    throw error;
  }

  const attendance = await Attendance.create({
    day,
    user_id: employee.user_id,
    employeeId: employee.employeeId,
    email: employee.email,
    checkInTime: new Date(),
    checkOutTime: null,
    totalWorkingSeconds: null,
  });

  return attendance;
};

// CHECK OUT
const checkOut = async (user_id) => {
  const day = getToday();

  const attendance =
    await Attendance.findOne({
      user_id,
      day,
    });

  if (!attendance) {
    const error = new Error(
      "No check-in record found for today"
    );
    error.statusCode = 400;
    throw error;
  }

  if (attendance.checkOutTime) {
    const error = new Error(
      "Employee has already checked out today"
    );
    error.statusCode = 400;
    throw error;
  }

  const checkOutTime = new Date();

  const totalWorkingSeconds =
    calculateWorkingSeconds(
      attendance.checkInTime,
      checkOutTime
    );

  attendance.checkOutTime = checkOutTime;

  attendance.totalWorkingSeconds =
    totalWorkingSeconds;

  await attendance.save();

  return attendance;
};

// FORMAT ATTENDANCE
const formatAttendance = (attendance) => {
  if (!attendance) {
    return null;
  }

  const data = attendance.toObject
    ? attendance.toObject()
    : attendance;

  // Employee has checked in but not checked out
  if (!data.checkOutTime) {
    data.currentWorkingSeconds =
      calculateWorkingSeconds(
        data.checkInTime,
        new Date()
      );

    data.isCheckedIn = true;
    data.isCheckedOut = false;
  } else {
    // Employee has checked out
    data.currentWorkingSeconds =
      data.totalWorkingSeconds;

    data.isCheckedIn = true;
    data.isCheckedOut = true;
  }

  return data;
};

// DAILY ATTENDANCE
//
// user_id = ""              → all users
// user_id = "USR000001"     → particular user
//
// date = "" / not provided  → today's date
// date = "2026-09-18"       → selected date
//
const getDailyAttendance = async (
  user_id,
  date
) => {
  const selectedDate =
    date && date.trim() !== ""
      ? date.trim()
      : getToday();

  if (!isValidDate(selectedDate)) {
    const error = new Error(
      "Invalid date. Use YYYY-MM-DD format"
    );
    error.statusCode = 400;
    throw error;
  }

  const filter = {
    day: selectedDate,
  };

  if (
    user_id &&
    user_id.trim() !== ""
  ) {
    filter.user_id = user_id.trim();
  }

  const attendance =
    await Attendance.find(filter).sort({
      employeeId: 1,
    });

  return attendance.map(formatAttendance);
};

// ATTENDANCE HISTORY
//
// user_id = ""              → all users
// user_id = "USR000001"     → particular user
//
// date = "" / not provided  → all dates
// date = "2026-09-18"       → selected date
//
const getAttendanceHistory = async (
  user_id,
  date
) => {
  const filter = {};

  if (
    user_id &&
    user_id.trim() !== ""
  ) {
    filter.user_id = user_id.trim();
  }

  if (
    date &&
    date.trim() !== ""
  ) {
    const selectedDate = date.trim();

    if (!isValidDate(selectedDate)) {
      const error = new Error(
        "Invalid date. Use YYYY-MM-DD format"
      );
      error.statusCode = 400;
      throw error;
    }

    filter.day = selectedDate;
  }

  const attendance =
    await Attendance.find(filter).sort({
      day: -1,
      employeeId: 1,
    });

  return attendance.map(formatAttendance);
};

// PARTICULAR EMPLOYEE ATTENDANCE
// Used for Admin / HR employee view
//
// user_id is received through payload
//
const getEmployeeAttendance = async (
  user_id,
  date
) => {
  if (!user_id || user_id.trim() === "") {
    const error = new Error(
      "User ID is required"
    );
    error.statusCode = 400;
    throw error;
  }

  return getAttendanceHistory(
    user_id.trim(),
    date
  );
};

module.exports = {
  checkIn,
  checkOut,
  getDailyAttendance,
  getAttendanceHistory,
  getEmployeeAttendance,
};