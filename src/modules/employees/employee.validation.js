const validateEmployee = (data, isCreate = true) => {
  const errors = {};

  const {
    _id,
    employeeId,
    name,
    email,
    password,
    designation,
    userType,
  } = data;

  // _id
  if (!isCreate) {
    if (!_id || !_id.trim()) {
      errors._id = "Employee ID (_id) is required";
    }
  }

  // Employee ID
  if (!employeeId || !employeeId.trim()) {
    errors.employeeId = "Employee ID is required";
  }

  // Name
  if (!name || !name.trim()) {
    errors.name = "Name is required";
  }

  // Email
  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;

    if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid .com email address";
    }
  }

  // Password
  if (isCreate) {
    // Password required when creating employee
    if (!password || !password.trim()) {
      errors.password = "Password is required";
    } else if (!/^\d{6}$/.test(password)) {
      errors.password = "Password must contain exactly 6 digits";
    }
  } else {
    // Password optional when updating employee
    if (password && password.trim()) {
      if (!/^\d{6}$/.test(password)) {
        errors.password = "Password must contain exactly 6 digits";
      }
    }
  }

  // Designation
  if (!designation || !designation.trim()) {
    errors.designation = "Designation is required";
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