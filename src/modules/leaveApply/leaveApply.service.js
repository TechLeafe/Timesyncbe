const LeaveApply = require("./leaveApply.model");
const Leave = require("../leaves/leave.model");
const Employee = require("../employees/employee.model");
const PermissionUsage = require("./permissionUsage.model");
const attendanceService = require("../attendance/attendance.service");

const POLICY_LIMIT_KEY_MAP = {
  CL: "casualLeave",
  SL: "sickLeave",
  COMP_OFF: "compensatoryOff",
  PERMISSION: "permissionsPerMonth",
};
const MONTHLY_PERMISSION_LIMIT_HOURS = 4;

const calculateDays = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const difference = end.getTime() - start.getTime();
  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
};

const calculateHours = (fromTime, toTime) => {
  const [fromHour, fromMinute] = fromTime.split(":").map(Number);
  const [toHour, toMinute] = toTime.split(":").map(Number);
  return (toHour * 60 + toMinute - (fromHour * 60 + fromMinute)) / 60;
};

const getPermissionDurationMinutes = (fromTime, toTime) => {
  const [fromHour, fromMinute] = fromTime.split(":").map(Number);
  const [toHour, toMinute] = toTime.split(":").map(Number);
  return toHour * 60 + toMinute - (fromHour * 60 + fromMinute);
};

const getPermissionMonthBounds = (date) => {
  const dateKey =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)
      ? date.slice(0, 10)
      : new Date(date).toISOString().slice(0, 10);
  const [year, month] = dateKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
};

const getApprovedPermissionHours = async (user_id, date) => {
  const { start, end } = getPermissionMonthBounds(date);
  const query = {
    user_id,
    leaveType: { $in: ["PERMISSION", "Permission"] },
    status: "Approved",
    fromDate: { $gte: start, $lt: end },
  };
  const approvedPermissions = await LeaveApply.find(query)
    .select("totalHours")
    .lean();
  return approvedPermissions.reduce(
    (total, permission) => total + (Number(permission.totalHours) || 0),
    0
  );
};

const getPermissionMonthKey = (date) => {
  const { start } = getPermissionMonthBounds(date);
  return start.toISOString().slice(0, 7);
};

const getPermissionUsageLedger = async (user_id, date) => {
  const month = getPermissionMonthKey(date);
  let ledger = await PermissionUsage.findOne({ user_id, month });
  if (ledger) return ledger;

  const usedHours = await getApprovedPermissionHours(user_id, date);
  try {
    ledger = await PermissionUsage.create({ user_id, month, usedHours });
  } catch (error) {
    if (error.code !== 11000) throw error;
    ledger = await PermissionUsage.findOne({ user_id, month });
    if (!ledger) throw error;
  }
  return ledger;
};

const changePermissionUsage = async (user_id, date, hours) => {
  const month = getPermissionMonthKey(date);
  const updated = await PermissionUsage.findOneAndUpdate(
    { user_id, month, usedHours: { $lte: MONTHLY_PERMISSION_LIMIT_HOURS - hours } },
    { $inc: { usedHours: hours } },
    { new: true }
  );
  return updated;
};

const releasePermissionUsage = async (user_id, date, hours) => {
  const month = getPermissionMonthKey(date);
  const updated = await PermissionUsage.findOneAndUpdate(
    { user_id, month, usedHours: { $gte: hours } },
    { $inc: { usedHours: -hours } },
    { new: true }
  );
  if (!updated) {
    throw new Error(
      `Permission usage ledger is inconsistent for ${user_id} in ${month}`
    );
  }
};

const getPermissionDurationError = (fromTime, toTime) => {
  if (
    typeof fromTime !== "string" ||
    typeof toTime !== "string" ||
    !/^\d{2}:\d{2}$/.test(fromTime) ||
    !/^\d{2}:\d{2}$/.test(toTime)
  ) {
    return "Permission start and end times must be valid HH:mm values.";
  }
  const minutes = getPermissionDurationMinutes(fromTime, toTime);
  const [fromHour, fromMinute] = fromTime.split(":").map(Number);
  const [toHour, toMinute] = toTime.split(":").map(Number);
  if (
    [fromHour, fromMinute, toHour, toMinute].some(
      (value) => !Number.isInteger(value)
    ) ||
    fromHour > 23 ||
    toHour > 23 ||
    fromMinute > 59 ||
    toMinute > 59
  ) {
    return "Permission start and end times must be valid HH:mm values.";
  }
  if (![30, 60, 90, 120].includes(minutes)) {
    return "Permission duration must be 30 minutes, 1 hour, 1.5 hours, or 2 hours.";
  }
  return null;
};

// Helper: Calculate default business year if omitted in request
const getBusinessYear = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  const currentYear = date.getFullYear();
  return date.getMonth() >= 3
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;
};

// 1. Apply Leave
const applyLeave = async (user_id, leaveData) => {
  const {
    leaveType,
    fromDate,
    toDate,
    fromTime,
    toTime,
    compOffDate,
    reason,
    businessYear: bodyBusinessYear,
  } = leaveData;

  const employee = await Employee.findOne({ user_id });
  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  const businessYear =
    bodyBusinessYear && bodyBusinessYear.trim() !== ""
      ? bodyBusinessYear
      : getBusinessYear(fromDate);

  const leavePolicy = await Leave.findOne({ businessYear });
  if (!leavePolicy && leaveType !== "PERMISSION") {
    const error = new Error(
      `Leave policy not found for business year ${businessYear}`
    );
    error.statusCode = 400;
    throw error;
  }

  let totalDays = 0;
  let totalHours = 0;

  if (["CL", "SL", "COMP_OFF"].includes(leaveType)) {
    totalDays = calculateDays(fromDate, toDate);

    const approvedLeaves = await LeaveApply.find({
      user_id,
      businessYear,
      leaveType,
      status: "Approved",
    });

    const usedDays = approvedLeaves.reduce(
      (total, l) => total + (l.totalDays || 0),
      0
    );
    const allowedDays = leavePolicy[POLICY_LIMIT_KEY_MAP[leaveType]] || 0;

    if (usedDays + totalDays > allowedDays) {
      const error = new Error(
        `Insufficient leave balance. Remaining ${allowedDays - usedDays} day(s).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (leaveType === "PERMISSION") {
    const durationError = getPermissionDurationError(fromTime, toTime);
    if (durationError) {
      const error = new Error(
        durationError
      );
      error.statusCode = 400;
      throw error;
    }
    totalHours = calculateHours(fromTime, toTime);

    const usedHours = (
      await getPermissionUsageLedger(user_id, fromDate)
    ).usedHours;
    if (usedHours + totalHours > MONTHLY_PERMISSION_LIMIT_HOURS) {
      const error = new Error(
        `Permission balance exceeded. Only ${Math.max(
          0,
          MONTHLY_PERMISSION_LIMIT_HOURS - usedHours
        )} hour(s) remain this month.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const leaveRequest = await LeaveApply.create({
    employeeId: employee._id,
    user_id,
    businessYear,
    leaveType,
    fromDate: fromDate || null,
    toDate: toDate || null,
    fromTime: fromTime || null,
    toTime: toTime || null,
    compOffDate: leaveType === "COMP_OFF" ? compOffDate || null : null,
    totalDays,
    totalHours,
    reason,
    status: "Pending",
  });

  if (
    String(leaveRequest.leaveType).toUpperCase() === "PERMISSION" &&
    leaveRequest.fromDate
  ) {
    await attendanceService.refreshAttendanceStatus(
      user_id,
      leaveRequest.fromDate.toISOString().slice(0, 10)
    );
  }

  return leaveRequest;
};

// 2. Get Leave List
// 2. Get Leave List
const getLeaveList = async (user_id, userType, filterData = {}) => {
  const { businessYear, status } = filterData;
  const query = {};

  // If userType is 3 (Employee), show ONLY their own leaves
  // If userType is 1 or 2 (Admin/HR), do NOT filter by user_id
  if (Number(userType) === 3) {
    query.user_id = user_id;
  }

  if (businessYear && businessYear.trim() !== "") {
    query.businessYear = businessYear.trim();
  }

  if (status && status.trim() !== "") {
    query.status = status.trim();
  }

  return await LeaveApply.find(query)
    .populate("employeeId", "name department email employeeCode") // Optional: populate employee info for Admin dashboard
    .sort({ createdAt: -1 });
};
// 3. Edit / Update Leave
const updateLeave = async (user_id, updateData) => {
  const {
    _id,
    leaveType,
    fromDate,
    toDate,
    fromTime,
    toTime,
    compOffDate,
    reason,
    businessYear,
  } = updateData;

  if (!_id) {
    const error = new Error("Leave Application ID (_id) is required for update");
    error.statusCode = 400;
    throw error;
  }

  const existingLeave = await LeaveApply.findOne({ _id, user_id });
  if (!existingLeave) {
    const error = new Error("Leave application not found or unauthorized");
    error.statusCode = 404;
    throw error;
  }

  if (existingLeave.status !== "Pending") {
    const error = new Error(
      `Cannot update leave application with status '${existingLeave.status}'. Only 'Pending' requests can be edited.`
    );
    error.statusCode = 400;
    throw error;
  }

  let totalDays = existingLeave.totalDays;
  let totalHours = existingLeave.totalHours;

  const targetLeaveType = leaveType || existingLeave.leaveType;
  const targetFromDate = fromDate || existingLeave.fromDate;
  const targetToDate = toDate || existingLeave.toDate;

  if (["CL", "SL", "COMP_OFF"].includes(targetLeaveType)) {
    totalDays = calculateDays(targetFromDate, targetToDate);
  } else if (targetLeaveType === "PERMISSION") {
    const durationError = getPermissionDurationError(
      fromTime || existingLeave.fromTime,
      toTime || existingLeave.toTime
    );
    if (durationError) {
      const error = new Error(durationError);
      error.statusCode = 400;
      throw error;
    }
    totalHours = calculateHours(
      fromTime || existingLeave.fromTime,
      toTime || existingLeave.toTime
    );

    const usedHours = (
      await getPermissionUsageLedger(
      user_id,
      targetFromDate
      )
    ).usedHours;
    if (usedHours + totalHours > MONTHLY_PERMISSION_LIMIT_HOURS) {
      const error = new Error(
        `Permission balance exceeded. Only ${Math.max(
          0,
          MONTHLY_PERMISSION_LIMIT_HOURS - usedHours
        )} hour(s) remain this month.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  existingLeave.leaveType = targetLeaveType;
  existingLeave.fromDate = targetFromDate;
  existingLeave.toDate = targetToDate;
  existingLeave.fromTime = fromTime || existingLeave.fromTime;
  existingLeave.toTime = toTime || existingLeave.toTime;
  existingLeave.compOffDate =
    targetLeaveType === "COMP_OFF"
      ? compOffDate || existingLeave.compOffDate || null
      : null;
  existingLeave.totalDays = totalDays;
  existingLeave.totalHours = totalHours;
  existingLeave.reason = reason || existingLeave.reason;

  if (businessYear && businessYear.trim() !== "") {
    existingLeave.businessYear = businessYear;
  }

  return await existingLeave.save();
};

// 4. Review Leave (HR/Admin update status)
const reviewLeave = async (
  reviewerUserId,
  leaveId,
  status,
  rejectionReason
) => {
  const validStatuses = ["Approved", "Rejected", "Cancelled"];
  if (!validStatuses.includes(status)) {
    const error = new Error(
      `Invalid status. Allowed values: ${validStatuses.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  if (status === "Rejected" && (!rejectionReason || !rejectionReason.trim())) {
    const error = new Error(
      "Rejection reason is required when rejecting a leave application."
    );
    error.statusCode = 400;
    throw error;
  }

  const reviewer = await Employee.findOne({ user_id: reviewerUserId });
  if (!reviewer) {
    const error = new Error("Reviewing HR/Admin employee profile not found");
    error.statusCode = 404;
    throw error;
  }

  const leaveRequest = await LeaveApply.findById(leaveId);
  if (!leaveRequest) {
    const error = new Error("Leave application not found");
    error.statusCode = 404;
    throw error;
  }

  if (leaveRequest.status === status) {
    const error = new Error(
      `Leave application status is already '${status}'`
    );
    error.statusCode = 400;
    throw error;
  }

  const isPermission = ["PERMISSION", "Permission"].includes(
    leaveRequest.leaveType
  );

  if (status === "Approved" && !isPermission) {
      const leavePolicy = await Leave.findOne({
        businessYear: leaveRequest.businessYear,
      });
      if (!leavePolicy) {
        const error = new Error(
          `Leave policy not found for business year ${leaveRequest.businessYear}`
        );
        error.statusCode = 400;
        throw error;
      }

      const approvedLeaves = await LeaveApply.find({
        user_id: leaveRequest.user_id,
        businessYear: leaveRequest.businessYear,
        leaveType: leaveRequest.leaveType,
        status: "Approved",
        _id: { $ne: leaveId },
      });

      const usedDays = approvedLeaves.reduce(
        (total, l) => total + (l.totalDays || 0),
        0
      );
      const allowedDays =
        leavePolicy[POLICY_LIMIT_KEY_MAP[leaveRequest.leaveType]] || 0;

      if (usedDays + leaveRequest.totalDays > allowedDays) {
        const error = new Error(
          `Cannot approve. Total used (${usedDays + leaveRequest.totalDays}) exceeds allowed limit (${allowedDays}).`
        );
        error.statusCode = 400;
        throw error;
      }
  }

  let permissionReservation = 0;
  let permissionHours = Number(leaveRequest.totalHours) || 0;
  if (isPermission && status === "Approved") {
    const durationError = getPermissionDurationError(
      leaveRequest.fromTime,
      leaveRequest.toTime
    );
    if (durationError) {
      const error = new Error(`Cannot approve. ${durationError}`);
      error.statusCode = 400;
      throw error;
    }
    const requestedHours =
      getPermissionDurationMinutes(
        leaveRequest.fromTime,
        leaveRequest.toTime
      ) / 60;
    if (Math.abs(permissionHours - requestedHours) > 0.001) {
      const error = new Error(
        "Cannot approve. Stored permission duration does not match the requested time range."
      );
      error.statusCode = 400;
      throw error;
    }
    permissionHours = requestedHours;

    await getPermissionUsageLedger(
      leaveRequest.user_id,
      leaveRequest.fromDate
    );
    const reservation = await changePermissionUsage(
      leaveRequest.user_id,
      leaveRequest.fromDate,
      permissionHours
    );
    if (!reservation) {
      const error = new Error(
        `Cannot approve. Monthly approved permission cannot exceed ${MONTHLY_PERMISSION_LIMIT_HOURS} hours.`
      );
      error.statusCode = 400;
      throw error;
    }
    permissionReservation = permissionHours;
  } else if (isPermission && leaveRequest.status === "Approved") {
    await getPermissionUsageLedger(
      leaveRequest.user_id,
      leaveRequest.fromDate
    );
  }

  const updatedLeaveRequest = await LeaveApply.findOneAndUpdate(
    { _id: leaveRequest._id, status: leaveRequest.status },
    {
      $set: {
        status,
        reviewedBy: reviewer._id,
        reviewedAt: new Date(),
        rejectionReason:
          status === "Rejected" ? rejectionReason.trim() : null,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updatedLeaveRequest) {
    if (permissionReservation > 0) {
      await releasePermissionUsage(
        leaveRequest.user_id,
        leaveRequest.fromDate,
        permissionReservation
      );
    }
    const error = new Error(
      "Leave application status changed while it was being reviewed. Refresh and try again."
    );
    error.statusCode = 409;
    throw error;
  }

  if (
    isPermission &&
    leaveRequest.status === "Approved" &&
    status !== "Approved"
  ) {
    await releasePermissionUsage(
      leaveRequest.user_id,
      leaveRequest.fromDate,
      permissionHours
    );
  }

  if (
    isPermission &&
    leaveRequest.fromDate
  ) {
    await attendanceService.refreshAttendanceStatus(
      leaveRequest.user_id,
      leaveRequest.fromDate.toISOString().slice(0, 10)
    );
  }

  return updatedLeaveRequest;
};

// 5. Get Leave Balance Summary for Dashboard
const getLeaveBalance = async (user_id, businessYearParam) => {
  const businessYear =
    businessYearParam && businessYearParam.trim() !== ""
      ? businessYearParam.trim()
      : getBusinessYear();

  const employee = await Employee.findOne({ user_id });
  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  const leavePolicy = await Leave.findOne({ businessYear });
  if (!leavePolicy) {
    const error = new Error(
      `Leave policy not found for business year ${businessYear}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Find all approved leaves for this employee in the current business year
  const approvedLeaves = await LeaveApply.find({
    user_id,
    businessYear,
    status: "Approved",
  });

  // Calculate used days/hours by leave type
  const used = {
    CL: 0,
    SL: 0,
    COMP_OFF: 0,
    PERMISSION_HOURS: 0,
  };

  approvedLeaves.forEach((leave) => {
    if (["PERMISSION", "Permission"].includes(leave.leaveType)) {
      used.PERMISSION_HOURS += leave.totalHours || 0;
    } else if (used[leave.leaveType] !== undefined) {
      used[leave.leaveType] += leave.totalDays || 0;
    }
  });

  const totalCL = leavePolicy.casualLeave || 0;
  const totalSL = leavePolicy.sickLeave || 0;
  const totalCompOff = leavePolicy.compensatoryOff || 0;
  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const currentMonthUsage = await getApprovedPermissionHours(
    user_id,
    indiaDate
  );

  return {
    businessYear,
    casualLeave: {
      total: totalCL,
      used: used.CL,
      remaining: Math.max(0, totalCL - used.CL),
    },
    sickLeave: {
      total: totalSL,
      used: used.SL,
      remaining: Math.max(0, totalSL - used.SL),
    },
    compensatoryOff: {
      total: totalCompOff,
      used: used.COMP_OFF,
      remaining: Math.max(0, totalCompOff - used.COMP_OFF),
    },
    permissions: {
      allowedPerMonth: MONTHLY_PERMISSION_LIMIT_HOURS,
      usedHoursThisMonth: currentMonthUsage,
      remainingHoursThisMonth: Math.max(
        0,
        MONTHLY_PERMISSION_LIMIT_HOURS - currentMonthUsage
      ),
      usedHoursThisYear: used.PERMISSION_HOURS,
    },
  };
};

module.exports = {
  applyLeave,
  getLeaveList,
  updateLeave,
  reviewLeave,
  getLeaveBalance,
};