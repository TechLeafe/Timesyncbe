const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Employee = require("../modules/employees/employee.model");

const login = async (email, password) => {
  // Find employee by email
  const employee = await Employee.findOne({ email });

  if (!employee) {
    throw new Error("Invalid email or password");
  }

  // Check employee status
  if (employee.status === "Inactive") {
    throw new Error("Employee account is inactive");
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(
    password,
    employee.password
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Check JWT secret
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      id: employee._id,
      user_id: employee.user_id,
      email: employee.email,
      userType: employee.userType,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  return {
    token,

    user_id: employee.user_id,

    employee: {
      _id: employee._id,
      user_id: employee.user_id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      designation: employee.designation,
      userType: employee.userType,
      status: employee.status,
    },
  };
};

module.exports = {
  login,
};