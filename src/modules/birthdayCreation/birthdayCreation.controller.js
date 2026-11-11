const service = require("./birthdayCreation.service");

// Error handler
const handleError = (res, error) => {
  console.error("Birthday Creation Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Employee ID already exists",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// Validate create/update data
const validateBirthday = (body) => {
  if (
    !body ||
    typeof body.employeeName !== "string" ||
    !body.employeeName.trim() ||
    typeof body.employeeId !== "string" ||
    !body.employeeId.trim() ||
    typeof body.dob !== "string" ||
    !body.dob.trim()
  ) {
    return "Employee name, Employee ID and DOB are required";
  }

  // Require YYYY-MM-DD format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(body.dob)) {
    return "DOB must be in YYYY-MM-DD format";
  }

  const dob = new Date(`${body.dob}T00:00:00.000Z`);

  if (
    Number.isNaN(dob.getTime()) ||
    dob.toISOString().slice(0, 10) !== body.dob
  ) {
    return "Invalid date of birth";
  }

  if (dob > new Date()) {
    return "Date of birth cannot be in the future";
  }

  return null;
};

// CREATE BIRTHDAY
exports.create = async (req, res) => {
  try {
    const error = validateBirthday(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const { employeeName, employeeId, dob } = req.body;

    const existing = await service.getBirthdayById(
      employeeId.trim()
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    const data = await service.createBirthday({
      employeeName: employeeName.trim(),
      employeeId: employeeId.trim(),
      dob,
    });

    return res.status(201).json({
      success: true,
      message: "Birthday created successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL BIRTHDAYS
exports.list = async (req, res) => {
  try {
    const data = await service.getAllBirthdays();

    return res.status(200).json({
      success: true,
      message: "Birthday records fetched successfully",
      count: data.length,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET BIRTHDAY BY EMPLOYEE ID
exports.getById = async (req, res) => {
  try {
    const employeeId = req.params.id.trim();

    const data = await service.getBirthdayById(
      employeeId
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Birthday record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Birthday record fetched successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE BIRTHDAY BY EMPLOYEE ID
exports.update = async (req, res) => {
  try {
    const employeeId = req.params.id.trim();

    const error = validateBirthday(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const {
      employeeName,
      employeeId: newEmployeeId,
      dob,
    } = req.body;

    const data = await service.updateBirthday(
      employeeId,
      {
        employeeName: employeeName.trim(),
        employeeId: newEmployeeId.trim(),
        dob,
      }
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Birthday record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Birthday updated successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE BIRTHDAY BY EMPLOYEE ID
exports.remove = async (req, res) => {
  try {
    const employeeId = req.params.id.trim();

    const data = await service.deleteBirthday(
      employeeId
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Birthday record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Birthday deleted successfully",
      data: {
        employeeId: data.employeeId,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
