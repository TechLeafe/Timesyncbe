const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Employee = require("./employee.model");

// Generate unique User ID
const generateUserId = async () => {
  const lastEmployee = await Employee.findOne()
    .sort({ createdAt: -1 })
    .select("user_id");

  let nextNumber = 1;

  if (lastEmployee && lastEmployee.user_id) {
    const match = lastEmployee.user_id.match(/USR(\d+)/);

    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `USR${String(nextNumber).padStart(6, "0")}`;
};

// CREATE EMPLOYEE
const createEmployee = async (employeeData) => {
  const {
    employeeId,
    name,
    email,
    password,
    phone,
    designation,
    userType,
  } = employeeData;

  // Check duplicate Employee ID
  const existingEmployee = await Employee.findOne({
    employeeId,
  });

  if (existingEmployee) {
    const error = new Error("Employee ID already exists");
    error.statusCode = 409;
    throw error;
  }

  // Check duplicate Email
  const existingEmail = await Employee.findOne({
    email: email.toLowerCase(),
  });

  if (existingEmail) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  // Generate unique User ID
  let user_id = await generateUserId();

  // Extra safety check
  while (await Employee.findOne({ user_id })) {
    const match = user_id.match(/USR(\d+)/);

    const nextNumber = parseInt(match[1], 10) + 1;

    user_id = `USR${String(nextNumber).padStart(6, "0")}`;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create employee
  const employee = await Employee.create({
    user_id,
    employeeId,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    phone: phone && phone.trim() ? phone.trim() : "-",
    designation,
    userType,
    status: "Active",
  });

  // Don't return password
  const employeeResponse = employee.toObject();

  delete employeeResponse.password;

  return employeeResponse;
};

// GET ALL EMPLOYEES
const getAllEmployees = async () => {
  return await Employee.find()
    .select("-password")
    .sort({ createdAt: -1 });
};

// GET SINGLE EMPLOYEE BY USER ID
const getEmployeeByUserId = async (user_id) => {
  const employee = await Employee.findOne({
    user_id: user_id.trim(),
  }).select("-password");

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  return employee;
};

// UPDATE EMPLOYEE
const updateEmployee = async (employeeData) => {
  const {
    _id,
    employeeId,
    name,
    email,
    password,
    phone,
    designation,
    userType,
    status,
  } = employeeData;

  // Check MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    const error = new Error("Invalid employee ID");
    error.statusCode = 400;
    throw error;
  }

  // Find employee using _id from payload
  const employee = await Employee.findById(_id);

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  // Check duplicate Employee ID
  if (employeeId && employeeId !== employee.employeeId) {
    const existingEmployeeId = await Employee.findOne({
      employeeId,
      _id: { $ne: _id },
    });

    if (existingEmployeeId) {
      const error = new Error("Employee ID already exists");
      error.statusCode = 409;
      throw error;
    }

    employee.employeeId = employeeId;
  }

  // Check duplicate Email
  if (
    email &&
    email.toLowerCase() !== employee.email.toLowerCase()
  ) {
    const existingEmail = await Employee.findOne({
      email: email.toLowerCase(),
      _id: { $ne: _id },
    });

    if (existingEmail) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      throw error;
    }

    employee.email = email.toLowerCase();
  }

  // Update Name
  if (name !== undefined) {
    employee.name = name.trim();
  }

  // Update Phone
  if (phone !== undefined) {
    employee.phone = phone.trim() || "-";
  }

  // Update Designation
  if (designation !== undefined) {
    employee.designation = designation.trim();
  }

  // Update User Type
  if (userType !== undefined) {
    employee.userType = userType;
  }

  // Update Status
  if (status !== undefined) {
    employee.status = status;
  }

  // Update Password only when provided
  if (password && password.trim()) {
    employee.password = await bcrypt.hash(password, 10);
  }

  // user_id is intentionally NOT updated

  await employee.save();

  // Return updated employee without password
  const updatedEmployee = await Employee.findById(_id)
    .select("-password");

  return updatedEmployee;
};

// DELETE EMPLOYEE
const deleteEmployee = async (_id) => {
  // Check valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    const error = new Error("Invalid employee ID");
    error.statusCode = 400;
    throw error;
  }

  const employee = await Employee.findById(_id);

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  await Employee.findByIdAndDelete(_id);

  return {
    message: "Employee deleted successfully",
  };
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeByUserId,
  updateEmployee,
  deleteEmployee,
};