const bcrypt = require("bcryptjs");
const Employee = require("./employee.model");

// Create employee
const createEmployee = async (employeeData) => {
  const {
    employeeId,
    name,
    email,
    password,
    phone,
    designation,
  } = employeeData;

  // Check duplicate employee ID
  const existingEmployee = await Employee.findOne({ employeeId });

  if (existingEmployee) {
    const error = new Error("Employee ID already exists");
    error.statusCode = 409;
    throw error;
  }

  // Check duplicate email
  const existingEmail = await Employee.findOne({ email });

  if (existingEmail) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const employee = await Employee.create({
    employeeId,
    name,
    email,
    password: hashedPassword,
    phone: phone && phone.trim() ? phone.trim() : "-",
    designation,
    status: "Active",
  });

  return employee;
};

// Get all employees
const getAllEmployees = async () => {
  return await Employee.find()
    .select("-password")
    .sort({ createdAt: -1 });
};

// Get employee by Employee ID
const getEmployeeById = async (employeeId) => {
  const employee = await Employee.findOne({
    employeeId: employeeId,
  }).select("-password");

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  return employee;
};

// Update employee
// Update employee
const updateEmployee = async (employeeId, employeeData) => {
  const employee = await Employee.findOne({ employeeId });

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    email,
    password,
    phone,
    designation,
    status,
  } = employeeData;

  // Check duplicate email
  if (email && email !== employee.email) {
    const existingEmail = await Employee.findOne({
      email,
      _id: { $ne: employee._id },
    });

    if (existingEmail) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      throw error;
    }

    employee.email = email;
  }

  // Update fields
  if (name !== undefined) {
    employee.name = name;
  }

  if (phone !== undefined) {
    employee.phone = phone.trim() || "-";
  }

  if (designation !== undefined) {
    employee.designation = designation;
  }

  if (status !== undefined) {
    employee.status = status;
  }

  // Update password only if provided
  if (password) {
    employee.password = await bcrypt.hash(password, 10);
  }

  await employee.save();

  return await Employee.findOne({
    employeeId,
  }).select("-password");
};

// Delete employee
const deleteEmployee = async (id) => {
  const employee = await Employee.findById(id);

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  await Employee.findByIdAndDelete(id);

  return {
    message: "Employee deleted successfully",
  };
};

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};