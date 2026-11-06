const Attendance = require("./attendance.model");
const Employee = require("../employees/employee.model");
const LeaveApply = require("../leaveApply/leaveApply.model");
const Holiday = require("../holidays/holiday.model");

const MONTHLY_PERMISSION_LIMIT_HOURS = 4;

// Get today's date in India
const getToday = (now = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
};

const hasDailyFinalizationWindowOpened = (day, now = new Date()) => {
  const today = getToday(now);
  if (day > today) return false;
  if (day < today) return true;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return value("hour") >= 22;
};

const getDayBounds = (day) => ({
  start: new Date(`${day}T00:00:00.000+05:30`),
  end: new Date(`${day}T23:59:59.999+05:30`),
});

const getTotalWorkingSeconds = (attendance, asOf) => {
  const dayBounds = getDayBounds(attendance.day);
  const asOfTime = asOf.getTime();
  const dayStart = dayBounds.start.getTime();
  const dayEnd = Math.min(dayBounds.end.getTime(), asOfTime);
  const sessions = attendance.sessions?.length
    ? attendance.sessions
    : attendance.checkInTime
      ? [
          {
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
          },
        ]
      : [];

  const intervals = sessions
    .map((session) => {
      const checkIn = new Date(session.checkInTime).getTime();
      const checkOut = session.checkOutTime
        ? new Date(session.checkOutTime).getTime()
        : asOfTime;
      const start = Math.max(checkIn, dayStart);
      const end = Math.min(checkOut, asOfTime, dayEnd);

      return { start, end };
    })
    .filter(
      (interval) =>
        Number.isFinite(interval.start) &&
        Number.isFinite(interval.end) &&
        interval.end > interval.start
    )
    .sort((left, right) => left.start - right.start);

  let totalSeconds = 0;
  let currentInterval = null;

  for (const interval of intervals) {
    if (!currentInterval) {
      currentInterval = { ...interval };
      continue;
    }

    if (interval.start <= currentInterval.end) {
      currentInterval.end = Math.max(
        currentInterval.end,
        interval.end
      );
      continue;
    }

    totalSeconds += calculateWorkingSeconds(
      currentInterval.start,
      currentInterval.end
    );
    currentInterval = { ...interval };
  }

  if (currentInterval) {
    totalSeconds += calculateWorkingSeconds(
      currentInterval.start,
      currentInterval.end
    );
  }

  return totalSeconds;
};

const getUtcDateBounds = (day) => {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const getUtcMonthBounds = (day) => {
  const [year, month] = day.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};

const getMinutesInIndia = (date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return value("hour") * 60 + value("minute");
};

const mergeIntervals = (intervals) =>
  intervals
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start)
    .reduce((merged, interval) => {
      const last = merged[merged.length - 1];
      if (!last || interval.start > last.end) {
        merged.push({ ...interval });
      } else {
        last.end = Math.max(last.end, interval.end);
      }
      return merged;
    }, []);

const getUnworkedSeconds = (requestedIntervals, actualIntervals) => {
  let eligibleSeconds = 0;
  for (const requested of requestedIntervals) {
    let remainingStart = requested.start;
    for (const actual of actualIntervals) {
      if (actual.end <= remainingStart) continue;
      if (actual.start >= requested.end) break;
      eligibleSeconds += Math.max(
        0,
        Math.floor(
          (Math.min(actual.start, requested.end) - remainingStart) / 1000
        )
      );
      remainingStart = Math.max(remainingStart, actual.end);
      if (remainingStart >= requested.end) break;
    }
    if (remainingStart < requested.end) {
      eligibleSeconds += Math.floor((requested.end - remainingStart) / 1000);
    }
  }
  return eligibleSeconds;
};

const getPermissionInterval = (permission, day) => {
  if (!permission.fromTime || !permission.toTime) return null;
  const start = new Date(
    `${day}T${permission.fromTime}:00+05:30`
  ).getTime();
  const end = new Date(
    `${day}T${permission.toTime}:00+05:30`
  ).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return { start, end };
};

const getPermissionCreditInfo = (
  attendance,
  permissions,
  asOf = new Date()
) => {
  const approvedPermissions = permissions.filter(
    (permission) => permission.status === "Approved"
  );
  const dayBounds = getDayBounds(attendance.day);
  const shiftStart = new Date(
    `${attendance.day}T09:00:00+05:30`
  ).getTime();
  const shiftEnd = new Date(
    `${attendance.day}T18:00:00+05:30`
  ).getTime();
  const actualIntervals = mergeIntervals(
    (attendance.sessions?.length
      ? attendance.sessions
      : attendance.checkInTime
        ? [
            {
              checkInTime: attendance.checkInTime,
              checkOutTime: attendance.checkOutTime,
            },
          ]
        : []
    )
      .map((session) => ({
        start: Math.max(
          new Date(session.checkInTime).getTime(),
          dayBounds.start.getTime(),
          shiftStart
        ),
        end: Math.min(
          session.checkOutTime
            ? new Date(session.checkOutTime).getTime()
            : asOf.getTime(),
          dayBounds.end.getTime(),
          shiftEnd,
          asOf.getTime()
        ),
      }))
  );
  const requestedIntervals = mergeIntervals(
    approvedPermissions
      .map((permission) => getPermissionInterval(permission, attendance.day))
      .filter(Boolean)
      .map((interval) => ({
        start: Math.max(interval.start, shiftStart),
        end: Math.min(interval.end, shiftEnd, asOf.getTime()),
      }))
  );

  const eligibleSeconds = getUnworkedSeconds(
    requestedIntervals,
    actualIntervals
  );
  const lateStart = new Date(
    `${attendance.day}T11:00:00+05:30`
  ).getTime();
  const checkIn = attendance.checkInTime
    ? new Date(attendance.checkInTime).getTime()
    : lateStart;
  const lateMinutes = Math.max(0, (checkIn - lateStart) / 60000);
  const eligibleLateSeconds = getUnworkedSeconds(
    requestedIntervals
      .map((interval) => ({
        start: Math.max(interval.start, lateStart),
        end: Math.min(interval.end, checkIn),
      }))
      .filter((interval) => interval.end > interval.start),
    actualIntervals
  );

  const requestedPermissionHours = permissions.reduce(
    (total, permission) =>
      total + (Number(permission.totalHours) || 0),
    0
  );
  const approvedPermissionRequestedHours = approvedPermissions.reduce(
    (total, permission) =>
      total + (Number(permission.totalHours) || 0),
    0
  );
  const approvedPermissionHours = eligibleSeconds / 3600;
  const statuses = [...new Set(permissions.map(({ status }) => status))];

  return {
    requestedPermissionHours,
    approvedPermissionRequestedHours,
    approvedPermissionHours,
    lateArrivalUncoveredMinutes: Math.max(
      0,
      lateMinutes - eligibleLateSeconds / 60
    ),
    permissionStatus:
      statuses.length > 1
        ? "Mixed"
        : statuses[0] || null,
    permissionStatuses: statuses,
    permissionRequests: permissions.map((permission) => ({
      totalHours: Number(permission.totalHours) || 0,
      fromTime: permission.fromTime,
      toTime: permission.toTime,
      status: permission.status,
    })),
  };
};

const getSuggestedAttendanceStatus = (
  attendance,
  asOf,
  approvedPermissionHours = 0,
  lateArrivalUncoveredMinutes
) => {
  if (!attendance.checkInTime) {
    return "Absent";
  }

  const lateMinutes = Math.max(
    0,
    getMinutesInIndia(new Date(attendance.checkInTime)) -
      11 * 60
  );
  const uncoveredLateMinutes =
    lateArrivalUncoveredMinutes === undefined
      ? Math.max(
          0,
          lateMinutes -
            Math.max(0, Number(approvedPermissionHours) || 0) * 60
        )
      : Math.max(0, Number(lateArrivalUncoveredMinutes) || 0);

  if (!attendance.checkOutTime) {
    return lateMinutes > 0 && uncoveredLateMinutes > 0
      ? "Late Present"
      : "Absent";
  }

  // Calculate actual working hours
  const workingSeconds = getTotalWorkingSeconds(
    attendance,
    asOf
  );

  // Only approved permission is passed to this function
  const permissionSeconds =
    Math.max(0, Number(approvedPermissionHours) || 0) * 3600;

  const effectiveSeconds =
    workingSeconds + permissionSeconds;

  // Early departure before 4:30 PM
  if (effectiveSeconds >= 9 * 3600) {
    if (lateMinutes > 0 && uncoveredLateMinutes > 0) {
      return "Late Present";
    }

    return "Present";
  }

  if (lateMinutes > 0 && uncoveredLateMinutes > 0) {
    return "Late Present";
  }

  if (effectiveSeconds >= 6 * 3600 && attendance.checkOutTime) {
    return "Half-Day Present";
  }

  return "Absent";
};


const finalizeAttendanceForDay = async (
  day = getToday(),
  asOf = new Date()
) => {
  if (!hasDailyFinalizationWindowOpened(day)) {
    return day;
  }

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
  const permissionDateBounds = getUtcDateBounds(day);
  const approvedLeaves = await LeaveApply.find({
    status: "Approved",
    $or: [
      {
        fromDate: { $lte: end },
        toDate: { $gte: start },
      },
      {
        leaveType: { $in: ["PERMISSION", "Permission"] },
        fromDate: {
          $gte: permissionDateBounds.start,
          $lt: permissionDateBounds.end,
        },
      },
      {
        compOffDate: { $gte: start, $lte: end },
      },
    ],
  }).lean();
  const permissionRequestsForDay = await LeaveApply.find({
    leaveType: { $in: ["PERMISSION", "Permission"] },
    status: { $in: ["Pending", "Approved", "Rejected"] },
    fromDate: {
      $gte: permissionDateBounds.start,
      $lt: permissionDateBounds.end,
    },
  })
    .select("user_id leaveType fromTime toTime totalHours status")
    .lean();

  const leavesByUser = new Map();
  for (const leave of approvedLeaves) {
    const userLeaves = leavesByUser.get(leave.user_id) || [];
    userLeaves.push(leave);
    leavesByUser.set(leave.user_id, userLeaves);
  }
  const permissionRequestsByUser = new Map();
  for (const permission of permissionRequestsForDay) {
    const userPermissions =
      permissionRequestsByUser.get(permission.user_id) || [];
    userPermissions.push(permission);
    permissionRequestsByUser.set(permission.user_id, userPermissions);
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
    const permissionRequests =
      permissionRequestsByUser.get(employee.user_id) || [];

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

    if (attendance.finalizedAt) {
      continue;
    }

    if (
      attendance.approvalStatus === "Approved" ||
      attendance.approvalStatus === "Rejected"
    ) {
      continue;
    }

    if (attendance.checkOutTime) {
      attendance.totalWorkingSeconds = getTotalWorkingSeconds(
        attendance,
        asOf
      );
    }

    const permissionCredit = getPermissionCreditInfo(
      attendance,
      permissionRequests,
      asOf
    );
    const monthlyPermissionUsedHours =
      await getMonthlyPermissionUsedHours(employee.user_id, day);
    const attendanceStatus = attendance.checkInTime
      ? getSuggestedAttendanceStatus(
          attendance,
          asOf,
          permissionCredit.approvedPermissionHours,
          permissionCredit.lateArrivalUncoveredMinutes
        )
      : "Absent";

    const finalizedAt = new Date();
    const update = {
      totalWorkingSeconds: attendance.totalWorkingSeconds,
      requestedPermissionHours:
        permissionCredit.requestedPermissionHours,
      approvedPermissionRequestedHours:
        permissionCredit.approvedPermissionRequestedHours,
      approvedPermissionHours:
        permissionCredit.approvedPermissionHours,
      totalCreditedWorkingSeconds:
        (Number(attendance.totalWorkingSeconds) || 0) +
        permissionCredit.approvedPermissionHours * 3600,
      permissionStatus: permissionCredit.permissionStatus,
      monthlyPermissionUsedHours,
      monthlyPermissionRemainingHours: Math.max(
        0,
        MONTHLY_PERMISSION_LIMIT_HOURS - monthlyPermissionUsedHours
      ),
      finalizedAt,
      approvalStatus: "Pending",
    };

    await Attendance.updateOne(
      { _id: attendance._id },
      { $set: update }
    );

    if (!attendance.attendanceStatusManuallyCorrected) {
      await Attendance.updateOne(
        {
          _id: attendance._id,
          attendanceStatusManuallyCorrected: { $ne: true },
        },
        { $set: { attendanceStatus } }
      );
    }
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

const getPermissionRequestsForDay = async (user_id, day) => {
  const { start, end } = getUtcDateBounds(day);
  return LeaveApply.find({
    user_id,
    leaveType: { $in: ["PERMISSION", "Permission"] },
    status: { $in: ["Pending", "Approved", "Rejected"] },
    fromDate: { $gte: start, $lt: end },
  })
    .select("fromTime toTime totalHours status")
    .lean();
};

const getMonthlyPermissionUsedHours = async (user_id, day) => {
  const { start, end } = getUtcMonthBounds(day);
  const approvedPermissions = await LeaveApply.find({
    user_id,
    status: "Approved",
    leaveType: { $in: ["PERMISSION", "Permission"] },
    fromDate: { $gte: start, $lt: end },
  })
    .select("totalHours")
    .lean();
  return approvedPermissions.reduce(
    (total, permission) => total + (Number(permission.totalHours) || 0),
    0
  );
};

const refreshAttendanceStatus = async (user_id, day) => {
  const attendance = await Attendance.findOne({ user_id, day });
  if (
    !attendance ||
    (!attendance.finalizedAt && !attendance.checkOutTime)
  ) {
    return attendance;
  }

  const asOf = attendance.checkOutTime || new Date();
  const permissions = await getPermissionRequestsForDay(user_id, day);
  const permissionCredit = getPermissionCreditInfo(
    attendance,
    permissions,
    asOf
  );
  const monthlyPermissionUsedHours =
    await getMonthlyPermissionUsedHours(user_id, day);
  attendance.attendanceStatus = getSuggestedAttendanceStatus(
    attendance,
    asOf,
    permissionCredit.approvedPermissionHours,
    permissionCredit.lateArrivalUncoveredMinutes
  );
  attendance.requestedPermissionHours =
    permissionCredit.requestedPermissionHours;
  attendance.approvedPermissionRequestedHours =
    permissionCredit.approvedPermissionRequestedHours;
  attendance.approvedPermissionHours =
    permissionCredit.approvedPermissionHours;
  attendance.totalCreditedWorkingSeconds =
    getTotalWorkingSeconds(attendance, asOf) +
    permissionCredit.approvedPermissionHours * 3600;
  attendance.permissionStatus = permissionCredit.permissionStatus;
  attendance.monthlyPermissionUsedHours = monthlyPermissionUsedHours;
  attendance.monthlyPermissionRemainingHours = Math.max(
    0,
    MONTHLY_PERMISSION_LIMIT_HOURS - monthlyPermissionUsedHours
  );
  await attendance.save();
  return attendance;
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
  if (existingAttendance?.finalizedAt) {
    const error = new Error(
      "Today's attendance has already been finalized"
    );
    error.statusCode = 400;
    throw error;
  }

  const checkInTime = new Date();

  if (!existingAttendance) {
    const newAttendance = {
      day,
      user_id: employee.user_id,
      employeeId: employee.employeeId,
      email: employee.email,
      checkInTime,
      checkOutTime: null,
      totalWorkingSeconds: 0,
      sessions: [{ checkInTime }],
      finalizedAt: null,
    };

    return Attendance.create({
      ...newAttendance,
      attendanceStatus: "In Progress",
    });
  }

  if (!existingAttendance.checkInTime) {
    const attendance = await Attendance.findOneAndUpdate(
      {
        _id: existingAttendance._id,
        checkInTime: null,
      },
      {
        $set: {
          checkInTime,
          checkOutTime: null,
          totalWorkingSeconds: 0,
          attendanceStatus: "In Progress",
          finalizedAt: null,
          sessions: [{ checkInTime }],
        },
      },
      { returnDocument: "after" }
    );

    if (!attendance) {
      const error = new Error("Unable to create attendance check-in");
      error.statusCode = 409;
      throw error;
    }

    return {
      ...attendance.toObject(),
      activeCheckInTime: checkInTime,
    };
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
        attendanceStatus: "In Progress",
        finalizedAt: null,
      },
      $push: {
        sessions: { $each: sessionsToAppend },
      },
    },
    { returnDocument: "after" }
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

  if (attendance.finalizedAt) {
    const error = new Error(
      "Today's attendance has already been finalized"
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
  const accumulatedWorkingSeconds =
    (attendance.totalWorkingSeconds || 0) +
    totalWorkingSeconds;

  const update = {
    checkOutTime,
    totalWorkingSeconds: accumulatedWorkingSeconds,
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

  const permissions = await getPermissionRequestsForDay(user_id, day);
  const permissionCredit = getPermissionCreditInfo(
    {
      ...attendance.toObject(),
      ...update,
    },
    permissions,
    checkOutTime
  );
  update.attendanceStatus = getSuggestedAttendanceStatus(
    {
      ...attendance.toObject(),
      ...update,
    },
    checkOutTime,
    permissionCredit.approvedPermissionHours,
    permissionCredit.lateArrivalUncoveredMinutes
  );
  update.requestedPermissionHours =
    permissionCredit.requestedPermissionHours;
  update.approvedPermissionRequestedHours =
    permissionCredit.approvedPermissionRequestedHours;
  update.approvedPermissionHours =
    permissionCredit.approvedPermissionHours;
  update.totalCreditedWorkingSeconds =
    accumulatedWorkingSeconds +
    permissionCredit.approvedPermissionHours * 3600;
  update.permissionStatus = permissionCredit.permissionStatus;
  update.monthlyPermissionUsedHours =
    await getMonthlyPermissionUsedHours(user_id, day);
  update.monthlyPermissionRemainingHours = Math.max(
    0,
    MONTHLY_PERMISSION_LIMIT_HOURS - update.monthlyPermissionUsedHours
  );

  const updatedAttendance =
    await Attendance.findOneAndUpdate(
      {
        _id: attendance._id,
        checkOutTime: null,
      },
      { $set: update },
      { returnDocument: "after" }
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
  if (
    data.day === getToday() &&
    !data.finalizedAt &&
    !data.checkOutTime &&
    !data.attendanceStatusManuallyCorrected
  ) {
    data.attendanceStatus = "In Progress";
  }

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

const formatAttendanceWithPermissions = async (attendances) => {
  const formatted = attendances.map(formatAttendance);
  if (formatted.length === 0) return formatted;

  const days = formatted.map((attendance) => attendance.day).sort();
  const userIds = [...new Set(formatted.map((attendance) => attendance.user_id))];
  const { start } = getUtcMonthBounds(days[0]);
  const { end } = getUtcMonthBounds(days[days.length - 1]);
  const permissions = await LeaveApply.find({
    user_id: { $in: userIds },
    leaveType: { $in: ["PERMISSION", "Permission"] },
    fromDate: { $gte: start, $lt: end },
    status: { $in: ["Pending", "Approved", "Rejected"] },
  })
    .select("user_id fromDate fromTime toTime totalHours status")
    .lean();
  const employees = await Employee.find({ user_id: { $in: userIds } })
    .select("user_id name employeeId")
    .lean();
  const employeeByUser = new Map(
    employees.map((employee) => [employee.user_id, employee])
  );

  const byUserAndDay = new Map();
  const monthlyUsage = new Map();
  for (const permission of permissions) {
    const permissionDay = new Date(permission.fromDate).toISOString().slice(0, 10);
    const permissionMonth = permissionDay.slice(0, 7);
    const key = `${permission.user_id}:${permissionDay}`;
    const dayPermissions = byUserAndDay.get(key) || [];
    dayPermissions.push(permission);
    byUserAndDay.set(key, dayPermissions);

    if (permission.status === "Approved") {
      const monthKey = `${permission.user_id}:${permissionMonth}`;
      monthlyUsage.set(
        monthKey,
        (monthlyUsage.get(monthKey) || 0) + (Number(permission.totalHours) || 0)
      );
    }
  }

  return formatted.map((attendance) => {
    const requests =
      byUserAndDay.get(`${attendance.user_id}:${attendance.day}`) || [];
    const asOf = attendance.checkOutTime || new Date();
    const permissionCredit = getPermissionCreditInfo(
      attendance,
      requests,
      asOf
    );
    const actualWorkingSeconds = Number(attendance.currentWorkingSeconds) || 0;
    const monthlyPermissionUsedHours =
      monthlyUsage.get(`${attendance.user_id}:${attendance.day.slice(0, 7)}`) || 0;
    const employee = employeeByUser.get(attendance.user_id);

    return {
      ...attendance,
      employeeName: employee?.name || "",
      employeeId: employee?.employeeId || attendance.employeeId,
      actualWorkingSeconds,
      actualWorkingHours: actualWorkingSeconds / 3600,
      ...permissionCredit,
      totalCreditedWorkingSeconds:
        actualWorkingSeconds +
        permissionCredit.approvedPermissionHours * 3600,
      totalCreditedWorkingHours:
        actualWorkingSeconds / 3600 +
        permissionCredit.approvedPermissionHours,
      monthlyPermissionAllowanceHours: MONTHLY_PERMISSION_LIMIT_HOURS,
      monthlyPermissionUsedHours,
      monthlyPermissionRemainingHours: Math.max(
        0,
        MONTHLY_PERMISSION_LIMIT_HOURS - monthlyPermissionUsedHours
      ),
    };
  });
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

  return formatAttendanceWithPermissions(attendance);
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

  return formatAttendanceWithPermissions(attendance);
};

const getAttendanceApprovals = async () => {
  return Attendance.find({
    approvalStatus: "Pending",
    finalizedAt: { $ne: null },
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

  const attendance = await Attendance.findOne({
    _id: attendanceId,
    approvalStatus: "Pending",
    finalizedAt: { $ne: null },
    day: { $lt: getToday() },
  });

  if (!attendance) {
    const error = new Error(
      "Pending attendance was not found or has already been reviewed"
    );
    error.statusCode = 404;
    throw error;
  }

  const nextStatus =
    decision === "Approved" &&
    ["Late Present", "Present Late"].includes(
      attendance.attendanceStatus
    )
      ? "Present"
      : attendance.attendanceStatus;

  attendance.approvalStatus = decision;
  attendance.reviewedBy = reviewerId;
  attendance.reviewedAt = new Date();
  attendance.attendanceStatus = nextStatus;

  await attendance.save();

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

const correctAttendanceStatus = async (
  user_id,
  day,
  newStatus,
  reason,
  hrUserId
) => {
  const cleanUserId = typeof user_id === "string" ? user_id.trim() : "";
  const cleanDay = typeof day === "string" ? day.trim() : "";
  const cleanReason = typeof reason === "string" ? reason.trim() : "";

  if (!cleanUserId || !cleanDay || !hrUserId) {
    const error = new Error("Employee ID, date, and HR user ID are required");
    error.statusCode = 400;
    throw error;
  }

  if (!isValidDate(cleanDay)) {
    const error = new Error("Invalid date. Use YYYY-MM-DD format");
    error.statusCode = 400;
    throw error;
  }

  if (newStatus !== "Present") {
    const error = new Error("Attendance can only be corrected to Present");
    error.statusCode = 400;
    throw error;
  }

  if (!cleanReason || cleanReason.length > 1000) {
    const error = new Error(
      "A correction reason of 1 to 1000 characters is required"
    );
    error.statusCode = 400;
    throw error;
  }

  const modifiedAt = new Date();
  const attendance = await Attendance.findOneAndUpdate(
    {
      user_id: cleanUserId,
      day: cleanDay,
      attendanceStatus: "Absent",
      attendanceStatusManuallyCorrected: { $ne: true },
    },
    {
      $set: {
        attendanceStatus: newStatus,
        attendanceStatusManuallyCorrected: true,
      },
      $push: {
        attendanceCorrections: {
          hrUserId,
          previousStatus: "Absent",
          newStatus,
          reason: cleanReason,
          modifiedAt,
        },
      },
    },
    { new: true, runValidators: true }
  );

  if (attendance) return attendance;

  const existingAttendance = await Attendance.findOne({
    user_id: cleanUserId,
    day: cleanDay,
  }).select("attendanceStatus");

  if (!existingAttendance) {
    const error = new Error("Attendance record was not found for this employee and date");
    error.statusCode = 404;
    throw error;
  }

  const error = new Error(
    `Attendance status is ${existingAttendance.attendanceStatus}; only Absent records can be corrected`
  );
  error.statusCode = 409;
  throw error;
};

module.exports = {
  checkIn,
  checkOut,
  getDailyAttendance,
  getAttendanceHistory,
  getEmployeeAttendance,
  getAttendanceApprovals,
  reviewAttendance,
  correctAttendanceStatus,
  refreshAttendanceStatus,
  finalizeAttendanceForDay,
  getSuggestedAttendanceStatus,
  getPermissionCreditInfo,
  hasDailyFinalizationWindowOpened,
};