const validateLeaveApply = (data, isUpdate = false) => {
  const errors = {};
  const { leaveType, fromDate, toDate, fromTime, toTime, reason, _id, compOffDate } = data;

  if (isUpdate && !_id) {
    errors._id = "Leave application ID (_id) is required for updates";
  }

  const validLeaveTypes = ["CL", "SL", "COMP_OFF", "PERMISSION"];

  if (!isUpdate || leaveType) {
    if (!leaveType) {
      errors.leaveType = "Leave type is required";
    } else if (!validLeaveTypes.includes(leaveType)) {
      errors.leaveType = "Invalid leave type";
    }
  }

  if (!isUpdate || reason !== undefined) {
    if (!reason || !reason.trim()) {
      errors.reason = "Reason is required";
    } else if (reason.trim().length < 3) {
      errors.reason = "Reason must be at least 3 characters";
    }
  }

  // Date validation for standard multi-day leave types
  if (["CL", "SL", "COMP_OFF"].includes(leaveType)) {
    if (!fromDate) errors.fromDate = "From date is required";
    if (!toDate) errors.toDate = "To date is required";

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (isNaN(start.getTime())) errors.fromDate = "Invalid from date";
      if (isNaN(end.getTime())) errors.toDate = "Invalid to date";
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        errors.toDate = "To date cannot be before from date";
      }
    }
  }

  // COMP_OFF validation (un-nested from PERMISSION)
  if (leaveType === "COMP_OFF") {
    if (!compOffDate) {
      errors.compOffDate = "Comp off date (worked date) is required";
    } else {
      const compDate = new Date(compOffDate);
      if (isNaN(compDate.getTime())) {
        errors.compOffDate = "Invalid comp off date format";
      }
    }
  }

  // PERMISSION validation
  if (leaveType === "PERMISSION") {
    if (!fromDate) errors.fromDate = "Permission date is required";
    if (!fromTime) errors.fromTime = "From time is required";
    if (!toTime) errors.toTime = "To time is required";

    if (fromTime && toTime) {
      const fromParts = fromTime.split(":").map(Number);
      const toParts = toTime.split(":").map(Number);
      if (fromParts.length !== 2 || toParts.length !== 2 || fromParts.some(isNaN) || toParts.some(isNaN)) {
        errors.fromTime = "Invalid time format";
        errors.toTime = "Invalid time format";
      } else if (toParts[0] * 60 + toParts[1] <= fromParts[0] * 60 + fromParts[1]) {
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