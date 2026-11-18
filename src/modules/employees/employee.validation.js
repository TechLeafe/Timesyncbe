
const validateEmployee = (data, isCreate = true) => {
  const errors = {};

  const {
    _id,
    employeeId,
    name,
    email,
    password,
    designation,
    team,
    userType,
  } = data;

  // MongoDB Employee ID required for update
  if (!isCreate) {
    if (typeof _id !== "string" || !_id.trim()) {
      errors._id = "Employee ID (_id) is required";
    }
  }

  // Employee ID
  if (typeof employeeId !== "string" || !employeeId.trim()) {
    errors.employeeId = "Employee ID is required";
  }

  // Name
  if (typeof name !== "string" || !name.trim()) {
    errors.name = "Name is required";
  }

  // Email
  if (typeof email !== "string" || !email.trim()) {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/i;

    if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid .com email address";
    }
  }

  // Password
  if (isCreate) {
    if (typeof password !== "string" || !password.trim()) {
      errors.password = "Password is required";
    } else if (!/^\d{6}$/.test(password)) {
      errors.password = "Password must contain exactly 6 digits";
    }
  } else if (password !== undefined && password !== "") {
    if (
      typeof password !== "string" ||
      !/^\d{6}$/.test(password)
    ) {
      errors.password = "Password must contain exactly 6 digits";
    }
  }

  // Designation
  if (
    typeof designation !== "string" ||
    !designation.trim()
  ) {
    errors.designation = "Designation is required";
  }

  // Team Name or ObjectId
  if (typeof team !== "string" || !team.trim()) {
    errors.team = "Team Name or Team ID is required";
  }

  // User Type
  if (userType === undefined || userType === null) {
    errors.userType = "User type is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateEmployee;
