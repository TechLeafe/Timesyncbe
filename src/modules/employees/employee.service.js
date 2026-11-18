
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const Employee = require("./employee.model");
const Team = require("../teams/team.model");

// ERROR HELPER
const makeError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// RESOLVE TEAM NAME OR OBJECT ID
const resolveTeamId = async (teamValue) => {
  if (
    typeof teamValue !== "string" ||
    !teamValue.trim()
  ) {
    throw makeError("Team is required", 400);
  }

  const value = teamValue.trim();

  // If Team ObjectId is provided
  if (mongoose.isObjectIdOrHexString(value)) {
    const team = await Team.findById(value);

    if (!team) {
      throw makeError("Team ID not found", 404);
    }

    return team._id;
  }

  // Escape special regex characters
  const escapedName = value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  // Find existing team
  let team = await Team.findOne({
    name: {
      $regex: `^${escapedName}$`,
      $options: "i",
    },
  });

  // Create team if not found
  if (!team) {
    team = await Team.create({
      name: value,
    });
  }

  return team._id;
};

// GENERATE UNIQUE USER ID
const generateUserId = async () => {
  const lastEmployee = await Employee.findOne()
    .sort({ createdAt: -1 })
    .select("user_id");

  let nextNumber = 1;

  if (lastEmployee?.user_id) {
    const match = lastEmployee.user_id.match(
      /^USR(\d+)$/
    );

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  let user_id;

  do {
    user_id = `USR${String(nextNumber).padStart(6, "0")}`;
    nextNumber++;
  } while (await Employee.exists({ user_id }));

  return user_id;
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

  // Convert team name into ObjectId
  const teamObjectId = await resolveTeamId(team);

  // Check duplicate Employee ID
  const existingEmployee = await Employee.findOne({
    employeeId: employeeId.trim(),
  });

  if (existingEmployee) {
    throw makeError(
      "Employee ID already exists",
      409
    );
  }

  // Check duplicate Email
  const normalizedEmail = email.trim().toLowerCase();

  const existingEmail = await Employee.findOne({
    email: normalizedEmail,
  });

  if (existingEmail) {
    throw makeError(
      "Email already exists",
      409
    );
  }

  // Generate User ID
  const user_id = await generateUserId();

  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    10
  );

  // Create employee
  const employee = await Employee.create({
    user_id,
    employeeId: employeeId.trim(),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone?.trim() || "-",
    designation: designation.trim(),
    team: teamObjectId,
    userType,
    status: "Active",
  });

  const result = employee.toObject();
  delete result.password;

  return result;
};

// GET ALL EMPLOYEES
const getAllEmployees = async () => {
  const employees = await Employee.find()
    .select("-password -photo")
<<<<<<< HEAD
    .sort({ createdAt: -1 });
=======
    .populate("team", "name")
    .sort({ createdAt: -1 })
    .lean();

  return employees.map((employee) => ({
    ...employee,
    team:
      employee.team && typeof employee.team === "object"
        ? employee.team.name
        : employee.team || "-",
  }));
>>>>>>> 9b9fc5286cb893715791ef79eda0b36e8768bf3b
};

// GET SINGLE EMPLOYEE
const getEmployeeByUserId = async (user_id) => {
  const employee = await Employee.findOne({
    user_id: user_id.trim(),
<<<<<<< HEAD
  }).select("-password");
=======
  })
    .select("-password")
    .populate("team", "name")
    .lean();
>>>>>>> 9b9fc5286cb893715791ef79eda0b36e8768bf3b

  if (!employee) {
    throw makeError(
      "Employee not found",
      404
    );
  }

  return {
    ...employee,
    team:
      employee.team && typeof employee.team === "object"
        ? employee.team.name
        : employee.team || "-",
  };
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

  if (!mongoose.isObjectIdOrHexString(_id)) {
    throw makeError(
      "Invalid employee ID",
      400
    );
  }

  const employee = await Employee.findById(_id);

  if (!employee) {
    throw makeError(
      "Employee not found",
      404
    );
  }

  // Update Employee ID
  if (employeeId !== undefined) {
    const newId = employeeId.trim();

    if (newId !== employee.employeeId) {
      const duplicate = await Employee.exists({
        employeeId: newId,
        _id: { $ne: _id },
      });

      if (duplicate) {
        throw makeError(
          "Employee ID already exists",
          409
        );
      }

      employee.employeeId = newId;
    }
  }

  // Update Email
  if (email !== undefined) {
    const newEmail = email.trim().toLowerCase();

    if (newEmail !== employee.email) {
      const duplicate = await Employee.exists({
        email: newEmail,
        _id: { $ne: _id },
      });

      if (duplicate) {
        throw makeError(
          "Email already exists",
          409
        );
      }

      employee.email = newEmail;
    }
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

  // Update Team
  if (team !== undefined) {
    employee.team = await resolveTeamId(team);
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
  if (
    typeof password === "string" &&
    password.trim()
  ) {
    employee.password = await bcrypt.hash(
      password,
      10
    );
  }

  // Save employee
  await employee.save();

  // Return updated employee
  return Employee.findById(_id)
    .select("-password")
    .populate("team", "name")
    .lean();
};

// DELETE EMPLOYEE
const deleteEmployee = async (_id) => {
  if (!mongoose.isObjectIdOrHexString(_id)) {
    throw makeError(
      "Invalid employee ID",
      400
    );
  }

  const employee = await Employee.findById(_id);

  if (!employee) {
    throw makeError(
      "Employee not found",
      404
    );
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
