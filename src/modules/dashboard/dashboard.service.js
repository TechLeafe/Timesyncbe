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
  const [year, month] = date.split("-").map(Number);

  return month >= 4
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
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
    const activeSession = (attendance.sessions || []).find(
      (session) => !session.checkOutTime
    );
    const activeCheckInTime =
      activeSession?.checkInTime ||
      (!attendance.checkOutTime ? attendance.checkInTime : null);

    // If employee is still working, calculate current elapsed time
    if (
      activeCheckInTime &&
      !attendance.checkOutTime
    ) {
      workingSeconds = Math.floor(
        (attendance.totalWorkingSeconds || 0) +
          (Date.now() - new Date(activeCheckInTime).getTime()) /
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
      status: "Pending",
    }),

    LeaveApply.countDocuments({
      status: "Approved",
    }),

    LeaveApply.countDocuments({
      status: "Rejected",
    }),
  ]);

  const leaveTypeCounts = {
    CL: await LeaveApply.countDocuments({
      leaveType: "CL",
      status: "Approved",
    }),

    SL: await LeaveApply.countDocuments({
      leaveType: "SL",
      status: "Approved",
    }),

    COMP_OFF: await LeaveApply.countDocuments({
      leaveType: "COMP_OFF",
      status: "Approved",
    }),

    PERMISSION: await LeaveApply.countDocuments({
      leaveType: "PERMISSION",
      status: "Approved",
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
    isCheckedIn: false,
    isCheckedOut: false,
    totalWorkingSeconds: 0,
    currentWorkingSeconds: 0,
    workingHours: "00:00:00",
    status: "Not Checked In",
  };

  if (attendance) {
    let workingSeconds = attendance.totalWorkingSeconds || 0;
    const activeSession = (attendance.sessions || []).find(
      (session) => !session.checkOutTime
    );
    const activeCheckInTime =
      activeSession?.checkInTime ||
      (!attendance.checkOutTime ? attendance.checkInTime : null);

    if (
      activeCheckInTime &&
      !attendance.checkOutTime
    ) {
      workingSeconds = Math.floor(
        (attendance.totalWorkingSeconds || 0) +
          (Date.now() - new Date(activeCheckInTime).getTime()) /
            1000
      );
    }

    todayAttendance = {
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      isCheckedIn: Boolean(
        attendance.checkInTime && !attendance.checkOutTime
      ),
      isCheckedOut: Boolean(attendance.checkOutTime),
      activeCheckInTime,
      totalWorkingSeconds:
        attendance.totalWorkingSeconds || 0,
      currentWorkingSeconds: workingSeconds,
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
    businessYear,
    status: "Approved",
  })
    .select("leaveType totalDays totalHours fromDate")
    .lean();

  let usedCL = 0;
  let usedSL = 0;
  let usedCompOff = 0;
  const selectedMonth = selectedDate.slice(0, 7);
  let usedPermissions = 0;

  approvedLeaves.forEach((leave) => {
    const days = Number(leave.totalDays || 0);

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
        if (
          leave.fromDate &&
          new Date(leave.fromDate).toISOString().slice(0, 7) ===
            selectedMonth
        ) {
          usedPermissions += 1;
        }
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

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};