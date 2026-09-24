const validateDashboard = (data) => {
  const errors = {};

  if (data.date && typeof data.date !== "string") {
    errors.date = "date must be a string";
  }

  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.date = "date must be in YYYY-MM-DD format";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateDashboard;