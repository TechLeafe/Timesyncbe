const validateAttendancePayload = (data) => {
  const errors = {};

  if (
    data.user_id !== undefined &&
    typeof data.user_id !== "string"
  ) {
    errors.user_id = "User ID must be a string";
  }

  if (
    data.date !== undefined &&
    typeof data.date !== "string"
  ) {
    errors.date = "Date must be a string";
  }

  if (
    data.date !== undefined &&
    data.date !== "" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
  ) {
    errors.date = "Date must be in YYYY-MM-DD format";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  validateAttendancePayload,
};