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
    team,
    userType,
  } = employeeData;

  // Validate Team before saving
  if (typeof team !== "string" || !team.trim()) {
    const error = new Error("Team Name is required");
    error.statusCode = 400;
    throw error;
  }

  console.log("CREATED EMPLOYEE TEAM:", team.trim());

  // Check duplicate Employee ID
  const existingEmployee = await Employee.findOne({
    employeeId,
  });

  if (existingEmployee) {
    const error = new Error("Employee ID already exists");
    error.statusCode = 409;
    throw error;
  }

  const existingEmail = await Employee.findOne({
    email: email.toLowerCase(),
  });

  if (existingEmail) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  let user_id = await generateUserId();

  while (await Employee.findOne({ user_id })) {
    const match = user_id.match(/USR(\d+)/);
    const nextNumber = parseInt(match[1], 10) + 1;

    user_id = `USR${String(nextNumber).padStart(6, "0")}`;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const employee = await Employee.create({
    user_id,
    employeeId,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    phone: phone && phone.trim() ? phone.trim() : "-",
    designation,
    team: team.trim(),
    userType,
    status: "Active",
  });

  const employeeResponse = employee.toObject();
  delete employeeResponse.password;

  return employeeResponse;
};

// GET ALL EMPLOYEES
const getAllEmployees = async () => {
  return await Employee.find()
    .select("-password")
    .populate("team", "name")
    .sort({ createdAt: -1 });
};

// GET SINGLE EMPLOYEE BY USER ID
const getEmployeeByUserId = async (user_id) => {
  const employee = await Employee.findOne({
    user_id: user_id.trim(),
  })
    .select("-password")
    .populate("team", "name");

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
    team,
    userType,
    status,
  } = employeeData;

  // Check valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    const error = new Error("Invalid employee ID");
    error.statusCode = 400;
    throw error;
  }

  // Find employee
  const employee = await Employee.findById(_id);

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  // Update Employee ID
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

  // Update Email
  if (email && email.toLowerCase() !== employee.email.toLowerCase()) {
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

  // Update Designation / Role
  if (designation !== undefined) {
    employee.designation = designation.trim();
  }

  // Update Team
  if (team !== undefined) {
    if (typeof team !== "string" || !team.trim()) {
      const error = new Error("Team Name is required");
      error.statusCode = 400;
      throw error;
    }

    employee.team = team.trim();
  }

  // Update User Type
  if (userType !== undefined) {
    employee.userType = userType;
  }

  // Update Status
  if (status !== undefined) {
    employee.status = status;
  }

  // Update Password
  if (password && password.trim()) {
    employee.password = await bcrypt.hash(password, 10);
  }

  // Save employee
  await employee.save();

  console.log("SAVED TEAM AFTER UPDATE:", employee.team);

  // Fetch saved employee without password
  const updatedEmployee = await Employee.findById(_id)
    .select("-password")
    .lean();

  console.log("TEAM AFTER FETCHING:", updatedEmployee?.team);
  console.log("UPDATED EMPLOYEE:", updatedEmployee);

  return updatedEmployee;
};

// DELETE EMPLOYEE
const deleteEmployee = async (_id) => {
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
