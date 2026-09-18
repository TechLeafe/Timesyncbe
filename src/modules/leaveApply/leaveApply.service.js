const LeaveApply = require("./leaveApply.model");

const calculateDays = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);

  const difference =
    end.getTime() - start.getTime();

  return (
    Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ) + 1
  );
};

const calculateHours = (fromTime, toTime) => {
  const [fromHour, fromMinute] =
    fromTime.split(":").map(Number);

  const [toHour, toMinute] =
    toTime.split(":").map(Number);

  const startMinutes =
    fromHour * 60 + fromMinute;

  const endMinutes =
    toHour * 60 + toMinute;

  return (endMinutes - startMinutes) / 60;
};

const applyLeave = async (employeeId, leaveData) => {
  const {
    leaveType,
    fromDate,
    toDate,
    compensatingDate,
    fromTime,
    toTime,
    reason,
  } = leaveData;

  let totalDays = 0;
  let totalHours = 0;

  // CL / SL / COMP_OFF
  if (
    ["CL", "SL", "COMP_OFF"].includes(leaveType)
  ) {
    totalDays = calculateDays(
      fromDate,
      toDate
    );
  }

  // PERMISSION
  if (leaveType === "PERMISSION") {
    totalHours = calculateHours(
      fromTime,
      toTime
    );
  }

  const leave = await LeaveApply.create({
    employeeId,

    leaveType,

    fromDate: fromDate || null,

    toDate: toDate || null,

    compensatingDate:
      compensatingDate || null,

    fromTime: fromTime || null,

    toTime: toTime || null,

    totalDays,

    totalHours,

    reason,

    status: "Pending",
  });

  return leave;
};

module.exports = {
  applyLeave,
};