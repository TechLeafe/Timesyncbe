
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Employee = require("../modules/employees/employee.model");

// =======================================
// EMPLOYEE LOGIN SERVICE
// =======================================

const login = async (email, password) => {
  // STEP 1: Validate email and password
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    throw new Error("Invalid email or password");
  }

  // STEP 2: Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  console.log("Login attempt email:", normalizedEmail);

  // STEP 3: Find employee in MongoDB
  // Explicitly include password if schema uses select: false
  const employee = await Employee.findOne({
    email: normalizedEmail,
  }).select("+password");

  console.log("Employee found:", !!employee);

  if (!employee) {
    console.log("Login failed: Employee not found");

    throw new Error("Invalid email or password");
  }

  // STEP 4: Check employee status
  console.log("Employee status:", employee.status);

  if (employee.status !== "Active") {
    throw new Error("Employee account is inactive");
  }

  // STEP 5: Check password hash exists
  if (
    typeof employee.password !== "string" ||
    !employee.password
  ) {
    console.log("Login failed: Password hash missing");

    throw new Error("Invalid email or password");
  }

  // STEP 6: Verify password using bcrypt
  const isPasswordValid = await bcrypt.compare(
    password,
    employee.password
  );

  console.log("Password matched:", isPasswordValid);

  if (!isPasswordValid) {
    console.log("Login failed: Password mismatch");

    throw new Error("Invalid email or password");
  }

  // STEP 7: Validate JWT secret
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  // STEP 8: Generate JWT token
  const token = jwt.sign(
    {
      id: employee._id.toString(),
      user_id: employee.user_id,
      email: employee.email,
      userType: employee.userType,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  console.log("Login successful");

  // STEP 9: Return employee information
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
