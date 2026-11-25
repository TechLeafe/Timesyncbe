const Employee = require("../employees/employee.model");
const Team = require("../teams/team.model");
const Attendance = require("../attendance/attendance.model");
const Leave = require("../leaves/leave.model");
const LeaveApply = require("../leaveApply/leaveApply.model");
const Holiday = require("../holidays/holiday.model");

const {
  getCompOffEarnedDates,
} = require("../leaveApply/leaveApply.service");

// ==================================================
// HELPER FUNCTIONS
// ==================================================

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  ).value;

  const month = parts.find(
    (part) => part.type === "month"
  ).value;

  const day = parts.find(
    (part) => part.type === "day"
  ).value;

  return `${year}-${month}-${day}`;
};

// ==================================================
// VALIDATE DATE
// ==================================================

const getSelectedDate = (date) => {
  const selectedDate = date || getToday();

  if (
    typeof selectedDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
  ) {
    const error = new Error(
      "Invalid date format. Use YYYY-MM-DD"
    );

    error.statusCode = 400;
    throw error;
  }

  const parsedDate = new Date(
    `${selectedDate}T00:00:00Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== selectedDate
  ) {
    const error = new Error("Invalid selected date");

    error.statusCode = 400;
    throw error;
  }

  return selectedDate;
};

// ==================================================
// BUSINESS YEAR
// ==================================================

const getBusinessYear = (date) => {
  const [year, month] = date.split("-").map(Number);

  return month >= 4
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
};

// ==================================================
// SAFE NUMBER
// ==================================================

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
};

// ==================================================
// WORKING HOURS
// ==================================================

const getWorkingHours = (seconds) => {
  const totalSeconds = Math.floor(
    safeNumber(seconds)
  );

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remainingSeconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ].join(":");
};

// ==================================================
// SAFE DATE CONVERSION
// ==================================================

const getDateKey = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

// ==================================================
// SAFE TEAM NAME RESOLUTION
// FIX: HRMS / COINSTEP OBJECT ID CAST ERROR
// ==================================================

const getEmployeeTeamName = async (teamValue) => {
  if (!teamValue) {
    return "";
  }

  // Already populated team object
  if (
    typeof teamValue === "object" &&
    typeof teamValue.name === "string"
  ) {
    return teamValue.name;
  }

  const value = String(teamValue).trim();

  // Check whether team value is a valid ObjectId
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(
    value
  );

  if (isObjectId) {
    const team = await Team.findById(value)
      .select("name")
      .lean();

    return team?.name || "";
  }

  // Support old string-based employee team values
  // Example: HRMS, COINSTEP
  return value;
};

// ==================================================
// ACTIVE ATTENDANCE SESSION
// ==================================================

const getActiveCheckInTime = (attendance) => {
  if (!attendance) {
    return null;
  }

  const sessions = Array.isArray(
    attendance.sessions
  )
    ? attendance.sessions
    : [];

  const activeSession = sessions.find(
    (session) =>
      session &&
      session.checkInTime &&
      !session.checkOutTime
  );

  return (
    activeSession?.checkInTime ||
    (!attendance.checkOutTime
      ? attendance.checkInTime
      : null) ||
    null
  );
};

// ==================================================
// CURRENT WORKING SECONDS
// ==================================================

const getCurrentWorkingSeconds = (attendance) => {
  if (!attendance) {
    return 0;
  }

  let workingSeconds = safeNumber(
    attendance.totalWorkingSeconds
  );

  const activeCheckInTime =
    getActiveCheckInTime(attendance);

  if (
    activeCheckInTime &&
    !attendance.checkOutTime &&
    attendance.day === getToday()
  ) {
    const checkInTimestamp = new Date(
      activeCheckInTime
    ).getTime();

    if (Number.isFinite(checkInTimestamp)) {
      const elapsedSeconds = Math.max(
        0,
        Math.floor(
          (Date.now() - checkInTimestamp) / 1000
        )
      );

      workingSeconds += elapsedSeconds;
    }
  }

  return Math.floor(workingSeconds);
};

// ==================================================
// ADMIN & HR DASHBOARD
// ==================================================

const getAdminDashboard = async (date) => {
  const selectedDate = getSelectedDate(date);

  const businessYear =
    getBusinessYear(selectedDate);

  // --------------------------------------------------
  // EMPLOYEE STATISTICS
  // --------------------------------------------------

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
  ] = await Promise.all([
    Employee.countDocuments(),

    Employee.countDocuments({
      status: "Active",
    }),

    Employee.countDocuments({
      status: "Inactive",
    }),
  ]);

  // --------------------------------------------------
  // TODAY ATTENDANCE
  // --------------------------------------------------

  const todayAttendance = await Attendance.find({
    day: selectedDate,
  })
    .select("-__v")
    .sort({ checkInTime: 1 })
    .lean();

  const presentToday = todayAttendance.length;

  const checkedIn = todayAttendance.filter(
    (attendance) =>
      attendance.checkInTime &&
      !attendance.checkOutTime
  ).length;

  const checkedOut = todayAttendance.filter(
    (attendance) => attendance.checkOutTime
  ).length;

  const currentlyWorking = checkedIn;

  const notCheckedIn = Math.max(
    totalEmployees - presentToday,
    0
  );

  // --------------------------------------------------
  // FORMAT ATTENDANCE
  // --------------------------------------------------

  const formattedAttendance =
    todayAttendance.map((attendance) => {
      const workingSeconds =
        getCurrentWorkingSeconds(attendance);

      return {
        ...attendance,

        workingHours: getWorkingHours(
          workingSeconds
        ),
      };
    });

  // --------------------------------------------------
  // LEAVE STATISTICS
  // --------------------------------------------------

  const [
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
  ] = await Promise.all([
    LeaveApply.countDocuments({
      status: "Pending",
    }),

    LeaveApply.countDocuments({
      status: "Approved",
    }),

    LeaveApply.countDocuments({
      status: "Rejected",
    }),
  ]);

  // --------------------------------------------------
  // LEAVE TYPE COUNTS
  // --------------------------------------------------

  const [
    casualLeaveCount,
    sickLeaveCount,
    compOffCount,
    permissionCount,
  ] = await Promise.all([
    LeaveApply.countDocuments({
      leaveType: "CL",
      status: "Approved",
    }),

    LeaveApply.countDocuments({
      leaveType: "SL",
      status: "Approved",
    }),

    LeaveApply.countDocuments({
      leaveType: "COMP_OFF",
      status: "Approved",
    }),

    LeaveApply.countDocuments({
      leaveType: {
        $in: ["PERMISSION", "Permission"],
      },
      status: "Approved",
    }),
  ]);

  const leaveTypeCounts = {
    CL: casualLeaveCount,
    SL: sickLeaveCount,
    COMP_OFF: compOffCount,
    PERMISSION: permissionCount,
  };

  // --------------------------------------------------
  // RECENT LEAVE REQUESTS
  // --------------------------------------------------

  const recentLeaveRequests =
    await LeaveApply.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("-__v")
      .lean();

  // --------------------------------------------------
  // HOLIDAYS
  // --------------------------------------------------

  const holidays = await Holiday.find({
    companyYear: businessYear,
    status: "Active",
  })
    .sort({ holidayDate: 1 })
    .select("-__v")
    .lean();

  // --------------------------------------------------
  // ADMIN & HR DASHBOARD RESPONSE
  // --------------------------------------------------

  return {
    selectedDate,

    employeeStatistics: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
    },

    attendanceStatistics: {
      presentToday,
      checkedIn,
      checkedOut,
      notCheckedIn,
      currentlyWorking,
    },

    leaveStatistics: {
      pending: pendingLeaves,
      approved: approvedLeaves,
      rejected: rejectedLeaves,
      leaveTypeCounts,
    },

    todayAttendance: formattedAttendance,

    recentLeaveRequests,

    holidays,
  };
};

// ==================================================
// EMPLOYEE DASHBOARD
// ==================================================

const getEmployeeDashboard = async (
  userId,
  date
) => {
  const selectedDate = getSelectedDate(date);

  const businessYear =
    getBusinessYear(selectedDate);

  // --------------------------------------------------
  // VALIDATE USER ID
  // --------------------------------------------------

  if (
    userId === undefined ||
    userId === null ||
    userId === ""
  ) {
    const error = new Error(
      "Employee user ID is required"
    );

    error.statusCode = 400;
    throw error;
  }

  // --------------------------------------------------
  // EMPLOYEE DETAILS
  // FIX: REMOVED POPULATE TEAM
  // --------------------------------------------------

  const employee = await Employee.findOne({
    user_id: userId,
  })
    .select("-password")
    .lean();

  if (!employee) {
    const error = new Error(
      "Employee not found"
    );

    error.statusCode = 404;
    throw error;
  }

  // Safely resolve team name
  const teamName = await getEmployeeTeamName(
    employee.team
  );

  // --------------------------------------------------
  // TODAY ATTENDANCE
  // --------------------------------------------------

  const attendance = await Attendance.findOne({
    user_id: userId,
    day: selectedDate,
  })
    .select("-__v")
    .lean();

  let todayAttendance = {
    checkInTime: null,
    checkOutTime: null,
    activeCheckInTime: null,
    isCheckedIn: false,
    isCheckedOut: false,
    totalWorkingSeconds: 0,
    currentWorkingSeconds: 0,
    workingHours: "00:00:00",
    status: "Not Checked In",
  };

  if (attendance) {
    const workingSeconds =
      getCurrentWorkingSeconds(attendance);

    const activeCheckInTime =
      getActiveCheckInTime(attendance);

    const isCheckedIn = Boolean(
      attendance.checkInTime &&
      !attendance.checkOutTime
    );

    const isCheckedOut = Boolean(
      attendance.checkOutTime
    );

    todayAttendance = {
      checkInTime:
        attendance.checkInTime || null,

      checkOutTime:
        attendance.checkOutTime || null,

      activeCheckInTime,

      isCheckedIn,

      isCheckedOut,

      totalWorkingSeconds: safeNumber(
        attendance.totalWorkingSeconds
      ),

      currentWorkingSeconds: workingSeconds,

      workingHours: getWorkingHours(
        workingSeconds
      ),

      status: isCheckedOut
        ? "Checked Out"
        : isCheckedIn
        ? "Checked In"
        : "Not Checked In",
    };
  }

  // --------------------------------------------------
  // LEAVE POLICY
  // --------------------------------------------------

  const leavePolicy = await Leave.findOne({
    businessYear,
  })
    .sort({ createdAt: -1 })
    .lean();

  // --------------------------------------------------
  // APPROVED LEAVE REQUESTS
  // --------------------------------------------------

  const approvedLeaves = await LeaveApply.find({
    user_id: userId,
    businessYear,
    status: "Approved",
  })
    .select(
      "leaveType totalDays totalHours fromDate"
    )
    .lean();

  let usedCL = 0;
  let usedSL = 0;
  let usedCompOff = 0;
  let usedPermissions = 0;

  const selectedMonth = selectedDate.slice(0, 7);

  approvedLeaves.forEach((leave) => {
    const days = safeNumber(leave.totalDays);

    switch (leave.leaveType) {
      case "CL":
        usedCL += days;
        break;

      case "SL":
        usedSL += days;
        break;

      case "COMP_OFF":
        usedCompOff += days;
        break;

      case "PERMISSION":
      case "Permission": {
        const leaveDate = getDateKey(
          leave.fromDate
        );

        if (
          leaveDate &&
          leaveDate.slice(0, 7) === selectedMonth
        ) {
          usedPermissions += safeNumber(
            leave.totalHours
          );
        }

        break;
      }

      default:
        break;
    }
  });

  // --------------------------------------------------
  // LEAVE ALLOCATION
  // --------------------------------------------------

  const casualAllocated = safeNumber(
    leavePolicy?.casualLeave
  );

  const sickAllocated = safeNumber(
    leavePolicy?.sickLeave
  );

  // --------------------------------------------------
  // COMPENSATORY OFF ALLOCATION
  // --------------------------------------------------

  if (
    typeof getCompOffEarnedDates !== "function"
  ) {
    throw new Error(
      "getCompOffEarnedDates is not exported from leaveApply.service.js"
    );
  }

  const earnedCompOffDates =
    await getCompOffEarnedDates(
      userId,
      businessYear
    );

  if (!Array.isArray(earnedCompOffDates)) {
    throw new Error(
      "Invalid earned compensatory off dates"
    );
  }

  const compOffAllocated =
    safeNumber(leavePolicy?.compensatoryOff) +
    earnedCompOffDates.length;

  // Monthly permission allowance: 4 hours
  const permissionAllocated = 4;

  // --------------------------------------------------
  // LEAVE REQUEST SUMMARY
  // --------------------------------------------------

  const [
    pending,
    approved,
    rejected,
  ] = await Promise.all([
    LeaveApply.countDocuments({
      user_id: userId,
      status: "Pending",
    }),

    LeaveApply.countDocuments({
      user_id: userId,
      status: "Approved",
    }),

    LeaveApply.countDocuments({
      user_id: userId,
      status: "Rejected",
    }),
  ]);

  // --------------------------------------------------
  // ATTENDANCE HISTORY
  // --------------------------------------------------

  const attendanceHistory = await Attendance.find({
    user_id: userId,
  })
    .sort({ day: -1 })
    .limit(30)
    .select("-__v")
    .lean();

  const formattedAttendanceHistory =
    attendanceHistory.map((item) => {
      const workingSeconds =
        getCurrentWorkingSeconds(item);

      return {
        ...item,

        workingHours: getWorkingHours(
          workingSeconds
        ),
      };
    });

  // --------------------------------------------------
  // LEAVE HISTORY
  // --------------------------------------------------

  const leaveHistory = await LeaveApply.find({
    user_id: userId,
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .select("-__v")
    .lean();

  // --------------------------------------------------
  // HOLIDAYS
  // --------------------------------------------------

  const holidays = await Holiday.find({
    companyYear: businessYear,
    status: "Active",
  })
    .sort({ holidayDate: 1 })
    .select("-__v")
    .lean();

  // --------------------------------------------------
  // EMPLOYEE DASHBOARD RESPONSE
  // --------------------------------------------------

  return {
    employee: {
      user_id: employee.user_id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      designation: employee.designation,

      // FIX: SAFE TEAM NAME
      team: teamName,

      status: employee.status,
    },

    selectedDate,

    todayAttendance,

    leaveBalance: {
      casualLeave: {
        allocated: casualAllocated,

        used: usedCL,

        available: Math.max(
          casualAllocated - usedCL,
          0
        ),
      },

      sickLeave: {
        allocated: sickAllocated,

        used: usedSL,

        available: Math.max(
          sickAllocated - usedSL,
          0
        ),
      },

      compensatoryOff: {
        allocated: compOffAllocated,

        used: usedCompOff,

        available: Math.max(
          compOffAllocated - usedCompOff,
          0
        ),
      },

      permissions: {
        allocated: permissionAllocated,

        used: usedPermissions,

        available: Math.max(
          permissionAllocated - usedPermissions,
          0
        ),
      },
    },

    leaveRequestSummary: {
      pending,
      approved,
      rejected,
    },

    attendanceHistory: formattedAttendanceHistory,

    leaveHistory,

    holidays,
  };
};

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};