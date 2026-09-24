const LeaveApply = require("./leaveApply.model");
const Leave = require("../leaves/leave.model");
const Employee = require("../employees/employee.model");

const POLICY_LIMIT_KEY_MAP = {
  CL: "casualLeave",
  SL: "sickLeave",
  COMP_OFF: "compensatoryOff",
  PERMISSION: "permissionsPerMonth",
};

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
  if (!leavePolicy) {
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
    totalHours = calculateHours(fromTime, toTime);
    const startOfMonth = new Date(fromDate);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(fromDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const approvedPermissions = await LeaveApply.find({
      user_id,
      leaveType: "PERMISSION",
      status: "Approved",
      fromDate: { $gte: startOfMonth,$lte: endOfMonth },
    });

    const allowedPermissions = leavePolicy.permissionsPerMonth || 0;
    if (approvedPermissions.length >= allowedPermissions) {
      const error = new Error(
        `Permission limit reached. Allowed: ${allowedPermissions} per month.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return await LeaveApply.create({
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
    totalHours = calculateHours(
      fromTime || existingLeave.fromTime,
      toTime || existingLeave.toTime
    );
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

  // Pre-check balance before final approval
  if (status === "Approved") {
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

    if (["CL", "SL", "COMP_OFF"].includes(leaveRequest.leaveType)) {
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
  }

  leaveRequest.status = status;
  leaveRequest.reviewedBy = reviewer._id;
  leaveRequest.reviewedAt = new Date();
  leaveRequest.rejectionReason =
    status === "Rejected" ? rejectionReason.trim() : null;

  return await leaveRequest.save();
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
    if (leave.leaveType === "PERMISSION") {
      used.PERMISSION_HOURS += leave.totalHours || 0;
    } else if (used[leave.leaveType] !== undefined) {
      used[leave.leaveType] += leave.totalDays || 0;
    }
  });

  const totalCL = leavePolicy.casualLeave || 0;
  const totalSL = leavePolicy.sickLeave || 0;
  const totalCompOff = leavePolicy.compensatoryOff || 0;

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
      allowedPerMonth: leavePolicy.permissionsPerMonth || 0,
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