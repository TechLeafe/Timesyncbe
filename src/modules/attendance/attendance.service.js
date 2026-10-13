const Attendance = require("./attendance.model");
const Employee = require("../employees/employee.model");
const LeaveApply = require("../leaveApply/leaveApply.model");
const Holiday = require("../holidays/holiday.model");

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

const getPreviousDay = () => {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const getDayBounds = (day) => ({
  start: new Date(`${day}T00:00:00.000+05:30`),
  end: new Date(`${day}T23:59:59.999+05:30`),
});

const getSuggestedAttendanceStatus = (
  attendance,
  permissionHours,
  dayEnd
) => {
  const firstCheckIn = attendance.checkInTime;
  const firstCheckInParts = firstCheckIn
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(firstCheckIn)
    : [];
  const firstCheckInHour = Number(
    firstCheckInParts.find((part) => part.type === "hour")?.value
  );
  const firstCheckInMinute = Number(
    firstCheckInParts.find((part) => part.type === "minute")?.value
  );

  if (
    firstCheckInHour > 11 ||
    (firstCheckInHour === 11 && firstCheckInMinute > 0)
  ) {
    return "Present Late";
  }

  const sessions = attendance.sessions || [];
  const totalSeconds = sessions.length
    ? sessions.reduce((total, session) => {
        const endTime = session.checkOutTime || dayEnd;
        return total + calculateWorkingSeconds(session.checkInTime, endTime);
      }, 0)
    : attendance.checkOutTime
      ? attendance.totalWorkingSeconds || 0
      : calculateWorkingSeconds(attendance.checkInTime, dayEnd);
  const creditedHours = totalSeconds / 3600 + permissionHours;

  return creditedHours >= 9 ? "Present" : "Present Late";
};

const ensurePreviousDayAttendance = async () => {
  const day = getPreviousDay();
  const date = new Date(`${day}T12:00:00.000Z`);
  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return day;
  }

  const holiday = await Holiday.findOne({
    holidayDate: day,
    status: "Active",
  });
  if (holiday) return day;

  const { start, end } = getDayBounds(day);
  const approvedLeaves = await LeaveApply.find({
    status: "Approved",
    $or: [
      {
        fromDate: { $lte: end },
        toDate: { $gte: start },
      },
      {
        compOffDate: { $gte: start, $lte: end },
      },
    ],
  }).lean();

  const leavesByUser = new Map();
  for (const leave of approvedLeaves) {
    const userLeaves = leavesByUser.get(leave.user_id) || [];
    userLeaves.push(leave);
    leavesByUser.set(leave.user_id, userLeaves);
  }

  const employees = await Employee.find({
    status: "Active",
    userType: 3,
  }).select("user_id employeeId email");
  const attendances = await Attendance.find({ day });
  const attendanceByUser = new Map(
    attendances.map((attendance) => [attendance.user_id, attendance])
  );

  for (const employee of employees) {
    const userLeaves = leavesByUser.get(employee.user_id) || [];
    const hasFullDayLeave = userLeaves.some(
      (leave) => String(leave.leaveType).toUpperCase() !== "PERMISSION"
    );
    if (hasFullDayLeave) continue;

    const permissionHours = userLeaves
      .filter(
        (leave) =>
          String(leave.leaveType).toUpperCase() === "PERMISSION"
      )
      .reduce((total, leave) => total + Number(leave.totalHours || 0), 0);

    let attendance = attendanceByUser.get(employee.user_id);
    if (!attendance) {
      try {
        attendance = await Attendance.create({
          day,
          user_id: employee.user_id,
          employeeId: employee.employeeId,
          email: employee.email,
          checkInTime: null,
          checkOutTime: null,
          totalWorkingSeconds: 0,
          attendanceStatus: "Absent",
          approvalStatus: "Pending",
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        attendance = await Attendance.findOne({
          user_id: employee.user_id,
          day,
        });
        if (!attendance) throw error;
      }
      attendanceByUser.set(employee.user_id, attendance);
    }

    if (
      attendance.approvalStatus === "Approved" ||
      attendance.approvalStatus === "Rejected"
    ) {
      continue;
    }

    const attendanceStatus = attendance.checkInTime
      ? getSuggestedAttendanceStatus(
          attendance,
          permissionHours,
          end < new Date() ? end : new Date()
        )
      : "Absent";

    attendance.attendanceStatus = attendanceStatus;
    attendance.approvalStatus = "Pending";
    await attendance.save();
  }

  return day;
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

  const existingAttendance = await Attendance.findOne({
    user_id,
    day,
  });
  const checkInTime = new Date();

  if (!existingAttendance) {
    return Attendance.create({
      day,
      user_id: employee.user_id,
      employeeId: employee.employeeId,
      email: employee.email,
      checkInTime,
      checkOutTime: null,
      totalWorkingSeconds: 0,
      sessions: [{ checkInTime }],
    });
  }

  if (!existingAttendance.checkOutTime) {
    const error = new Error(
      "Employee is already checked in"
    );
    error.statusCode = 400;
    throw error;
  }

  const previousSessions = existingAttendance.sessions || [];
  const sessionsToAppend = previousSessions.length
    ? [{ checkInTime }]
    : [
        {
          checkInTime: existingAttendance.checkInTime,
          checkOutTime: existingAttendance.checkOutTime,
          totalWorkingSeconds:
            existingAttendance.totalWorkingSeconds,
        },
        { checkInTime },
      ];

  const attendance = await Attendance.findOneAndUpdate(
    {
      _id: existingAttendance._id,
      checkOutTime: { $ne: null },
    },
    {
      $set: {
        checkOutTime: null,
      },
      $push: {
        sessions: { $each: sessionsToAppend },
      },
    },
    { new: true }
  );

  if (!attendance) {
    const error = new Error(
      "Employee is already checked in"
    );
    error.statusCode = 400;
    throw error;
  }

  const data = attendance.toObject
    ? attendance.toObject()
    : attendance;

  return {
    ...data,
    activeCheckInTime: checkInTime,
  };
};

// CHECK OUT
const checkOut = async (user_id) => {
  const day = getToday();

  const attendance = await Attendance.findOne({
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
      "Employee is not currently checked in"
    );
    error.statusCode = 400;
    throw error;
  }

  const checkOutTime = new Date();

  const sessions = attendance.sessions || [];
  const activeSessionIndex = sessions.findIndex(
    (session) => !session.checkOutTime
  );
  const activeCheckInTime =
    activeSessionIndex >= 0
      ? sessions[activeSessionIndex].checkInTime
      : attendance.checkInTime;

  const totalWorkingSeconds =
    calculateWorkingSeconds(
      activeCheckInTime,
      checkOutTime
    );

  const update = {
    checkOutTime,
    totalWorkingSeconds:
      (attendance.totalWorkingSeconds || 0) +
      totalWorkingSeconds,
  };

  if (activeSessionIndex >= 0) {
    sessions[activeSessionIndex].checkOutTime = checkOutTime;
    sessions[activeSessionIndex].totalWorkingSeconds =
      totalWorkingSeconds;
    update.sessions = sessions;
  } else {
    update.sessions = [
      {
        checkInTime: attendance.checkInTime,
        checkOutTime,
        totalWorkingSeconds,
      },
    ];
  }

  const updatedAttendance =
    await Attendance.findOneAndUpdate(
      {
        _id: attendance._id,
        checkOutTime: null,
      },
      { $set: update },
      { new: true }
    );

  if (!updatedAttendance) {
    const error = new Error(
      "Employee is not currently checked in"
    );
    error.statusCode = 400;
    throw error;
  }

  return updatedAttendance;
};

// FORMAT ATTENDANCE
const formatAttendance = (attendance) => {
  if (!attendance) {
    return null;
  }

  const data = attendance.toObject
    ? attendance.toObject()
    : attendance;
  if (!data.checkInTime) {
    data.currentWorkingSeconds = 0;
    data.isCheckedIn = false;
    data.isCheckedOut = false;
    return data;
  }

  const sessions = data.sessions || [];
  const activeSession = sessions.find(
    (session) => !session.checkOutTime
  );
  const activeCheckInTime =
    activeSession?.checkInTime ||
    (!data.checkOutTime ? data.checkInTime : null);

  data.activeCheckInTime = activeCheckInTime;

  // Employee has checked in but not checked out
  if (!data.checkOutTime) {
    data.currentWorkingSeconds =
      (data.totalWorkingSeconds || 0) +
      calculateWorkingSeconds(
        activeCheckInTime || data.checkInTime,
        new Date()
      );

    data.isCheckedIn = true;
    data.isCheckedOut = false;
  } else {
    // Employee has checked out
    data.currentWorkingSeconds = data.totalWorkingSeconds || 0;

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

  await ensurePreviousDayAttendance();

  const attendance =
    await Attendance.find(filter).sort({
      day: -1,
      employeeId: 1,
    });

  return attendance.map(formatAttendance);
};

const getAttendanceApprovals = async () => {
  await ensurePreviousDayAttendance();
  return Attendance.find({
    approvalStatus: "Pending",
    day: { $lt: getToday() },
  })
    .sort({ day: -1, employeeId: 1 })
    .lean();
};

const reviewAttendance = async (
  attendanceId,
  decision,
  reviewerId
) => {
  if (!["Approved", "Rejected"].includes(decision)) {
    const error = new Error("Decision must be Approved or Rejected");
    error.statusCode = 400;
    throw error;
  }

  const attendance = await Attendance.findOneAndUpdate(
    {
      _id: attendanceId,
      approvalStatus: "Pending",
      day: { $lt: getToday() },
    },
    {
      $set: {
        approvalStatus: decision,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!attendance) {
    const error = new Error(
      "Pending attendance was not found or has already been reviewed"
    );
    error.statusCode = 404;
    throw error;
  }

  return attendance;
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
  getAttendanceApprovals,
  reviewAttendance,
};