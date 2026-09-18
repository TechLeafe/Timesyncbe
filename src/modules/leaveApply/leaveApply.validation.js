const validateLeaveApply = (data) => {
  const errors = {};

  const {
    leaveType,
    fromDate,
    toDate,
    compensatingDate,
    fromTime,
    toTime,
    reason,
  } = data;

  const validLeaveTypes = [
    "CL",
    "SL",
    "COMP_OFF",
    "PERMISSION",
  ];

  // Leave Type
  if (!leaveType) {
    errors.leaveType = "Leave type is required";
  } else if (!validLeaveTypes.includes(leaveType)) {
    errors.leaveType = "Invalid leave type";
  }

  // Reason
  if (!reason || !reason.trim()) {
    errors.reason = "Reason is required";
  }

  // CL / SL / COMP_OFF
  if (["CL", "SL", "COMP_OFF"].includes(leaveType)) {
    if (!fromDate) {
      errors.fromDate = "From date is required";
    }

    if (!toDate) {
      errors.toDate = "To date is required";
    }

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);

      if (end < start) {
        errors.toDate = "To date cannot be before from date";
      }
    }
  }

  // COMP OFF
  if (leaveType === "COMP_OFF") {
    if (!compensatingDate) {
      errors.compensatingDate =
        "Worked/Compensating date is required";
    }

    if (
      compensatingDate &&
      fromDate &&
      new Date(compensatingDate) >= new Date(fromDate)
    ) {
      errors.compensatingDate =
        "Compensating date should be before Comp Off date";
    }
  }

  // PERMISSION
  if (leaveType === "PERMISSION") {
    if (!fromDate) {
      errors.fromDate = "Permission date is required";
    }

    if (!fromTime) {
      errors.fromTime = "From time is required";
    }

    if (!toTime) {
      errors.toTime = "To time is required";
    }

    if (fromTime && toTime) {
      const [fromHour, fromMinute] = fromTime
        .split(":")
        .map(Number);

      const [toHour, toMinute] = toTime
        .split(":")
        .map(Number);

      const startMinutes = fromHour * 60 + fromMinute;
      const endMinutes = toHour * 60 + toMinute;

      if (endMinutes <= startMinutes) {
        errors.toTime = "To time must be after From time";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateLeaveApply;