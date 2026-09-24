const Employee = require("../employees/employee.model");
const Attendance = require("../attendance/attendance.model");
const Leave = require("../leaves/leave.model");
const LeaveApply = require("../leaveApply/leaveApply.model");
const Holiday = require("../holidays/holiday.model");

const getToday = () => {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
};

const getBusinessYear = (date) => {
  const year = Number(date.substring(0, 4));

  return `${year}-${year + 1}`;
};

const getWorkingHours = (seconds) => {
  if (!seconds || seconds < 0) {
    return "00:00:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ].join(":");
};

const getAdminDashboard = async (date) => {
  const selectedDate = date || getToday();
  const businessYear = getBusinessYear(selectedDate);

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
    (attendance) => attendance.checkInTime && !attendance.checkOutTime
  ).length;

  const checkedOut = todayAttendance.filter(
    (attendance) => attendance.checkOutTime
  ).length;

  const currentlyWorking = checkedIn;

  const notCheckedIn = Math.max(
    totalEmployees - presentToday,
    0
  );

  // Add readable working hours
  const formattedAttendance = todayAttendance.map((attendance) => {
    let workingSeconds = attendance.totalWorkingSeconds;

    // If employee is still working, calculate current elapsed time
    if (
      attendance.checkInTime &&
      !attendance.checkOutTime
    ) {
      workingSeconds = Math.floor(
        (Date.now() - new Date(attendance.checkInTime).getTime()) /
          1000
      );
    }

    return {
      ...attendance,
      workingHours: getWorkingHours(workingSeconds),
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
      status: "pending",
    }),

    LeaveApply.countDocuments({
      status: "approved",
    }),

    LeaveApply.countDocuments({
      status: "rejected",
    }),
  ]);

  const leaveTypeCounts = {
    CL: await LeaveApply.countDocuments({
      leaveType: "CL",
      status: "approved",
    }),

    SL: await LeaveApply.countDocuments({
      leaveType: "SL",
      status: "approved",
    }),

    COMP_OFF: await LeaveApply.countDocuments({
      leaveType: "COMP_OFF",
      status: "approved",
    }),

    PERMISSION: await LeaveApply.countDocuments({
      leaveType: "PERMISSION",
      status: "approved",
    }),
  };

  // --------------------------------------------------
  // RECENT LEAVE REQUESTS
  // --------------------------------------------------

  const recentLeaveRequests = await LeaveApply.find({})
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
  // RESPONSE
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

const getEmployeeDashboard = async (userId, date) => {
  const selectedDate = date || getToday();
  const businessYear = getBusinessYear(selectedDate);

  // --------------------------------------------------
  // EMPLOYEE
  // --------------------------------------------------

  const employee = await Employee.findOne({
    user_id: userId,
  })
    .select("-password")
    .lean();

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

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
    workingHours: "00:00:00",
    status: "Not Checked In",
  };

  if (attendance) {
    let workingSeconds = attendance.totalWorkingSeconds || 0;

    if (
      attendance.checkInTime &&
      !attendance.checkOutTime
    ) {
      workingSeconds = Math.floor(
        (Date.now() - new Date(attendance.checkInTime).getTime()) /
          1000
      );
    }

    todayAttendance = {
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workingHours: getWorkingHours(workingSeconds),
      status: attendance.checkOutTime
        ? "Checked Out"
        : "Currently Working",
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
    status: "approved",
  })
    .select("leaveType totalDays totalHours fromDate toDate fromTime toTime")
    .lean();

  let usedCL = 0;
  let usedSL = 0;
  let usedCompOff = 0;
  let usedPermission = 0;

  approvedLeaves.forEach((leave) => {
    const days = Number(leave.totalDays || 0);
    const hours = Number(leave.totalHours || 0);

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
        usedPermission += hours;
        break;

      default:
        break;
    }
  });

  const casualAllocated = leavePolicy
    ? leavePolicy.casualLeave
    : 0;

  const sickAllocated = leavePolicy
    ? leavePolicy.sickLeave
    : 0;

  const compOffAllocated = leavePolicy
    ? leavePolicy.compensatoryOff
    : 0;

  const permissionAllocated = leavePolicy
    ? leavePolicy.permissionsPerMonth
    : 0;

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
      status: "pending",
    }),

    LeaveApply.countDocuments({
      user_id: userId,
      status: "approved",
    }),

    LeaveApply.countDocuments({
      user_id: userId,
      status: "rejected",
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
      let workingSeconds = item.totalWorkingSeconds || 0;

      if (
        item.checkInTime &&
        !item.checkOutTime
      ) {
        workingSeconds = Math.floor(
          (Date.now() -
            new Date(item.checkInTime).getTime()) /
            1000
        );
      }

      return {
        ...item,
        workingHours: getWorkingHours(workingSeconds),
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
  // RESPONSE
  // --------------------------------------------------

  return {
    employee: {
      user_id: employee.user_id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
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
        used: usedPermission,
        available: Math.max(
          permissionAllocated - usedPermission,
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

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};