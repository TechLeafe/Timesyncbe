const validateEmployee = (data) => {
  const errors = {};

  const {
    employeeId,
    name,
    email,
    password,
    phone,
    designation,
  } = data;

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
  if (!password || !password.trim()) {
    errors.password = "Password is required";
  } else if (!/^\d{6}$/.test(password)) {
    errors.password = "Password must contain exactly 6 digits";
  }

  // Designation
  if (!designation || !designation.trim()) {
    errors.designation = "Designation is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateEmployee;