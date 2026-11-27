const service = require("./birthdayCreation.service");

// ==========================================
// ERROR HANDLER
// ==========================================

const handleError = (res, error) => {
  console.error("Birthday Creation Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Birthday record already exists",
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

// ==========================================
// VALIDATE BIRTHDAY
// ==========================================

const validateBirthday = (body) => {
  const employeeName = String(body.employeeName || "").trim();
  const employeeId = String(body.employeeId || "").trim();
  const dob = String(body.dob || "").trim();

  if (!employeeName || !employeeId || !dob) {
    return "Employee name, employee ID and DOB are required";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return "DOB must be in YYYY-MM-DD format";
  }

  const date = new Date(dob);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dob
  ) {
    return "Invalid date of birth";
  }

  if (date > new Date()) {
    return "Date of birth cannot be in the future";
  }

  return null;
};

// ==========================================
// CREATE BIRTHDAY
// ==========================================

exports.create = async (req, res) => {
  try {
    const validationError = validateBirthday(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const birthday = await service.createBirthday({
      employeeName: req.body.employeeName.trim(),
      employeeId: req.body.employeeId.trim(),
      dob: new Date(req.body.dob),
    });

    return res.status(201).json({
      success: true,
      message: "Birthday created successfully",
      data: birthday,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// GET ALL BIRTHDAYS
// ==========================================

exports.list = async (req, res) => {
  try {
    const birthdays = await service.getAllBirthdays();

    return res.status(200).json({
      success: true,
      count: birthdays.length,
      data: birthdays,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// GET BIRTHDAY BY EMPLOYEE ID
// ==========================================

exports.getById = async (req, res) => {
  try {
    const employeeId = req.params.id.trim();

    console.log("Birthday GetById:", employeeId);

    const birthday = await service.getBirthdayById(employeeId);

    if (!birthday) {
      return res.status(404).json({
        success: false,
        message: "Birthday record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: birthday,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// UPDATE BIRTHDAY
// ==========================================

exports.update = async (req, res) => {
  try {
    const employeeId = req.params.id.trim();

    const validationError = validateBirthday(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const birthday = await service.updateBirthday(
      employeeId,
      {
        employeeName: req.body.employeeName.trim(),
        employeeId: req.body.employeeId.trim(),
        dob: new Date(req.body.dob),
      }
    );

    if (!birthday) {
      return res.status(404).json({
        success: false,
        message: "Birthday record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Birthday updated successfully",
      data: birthday,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// DELETE BIRTHDAY
// ==========================================

exports.remove = async (req, res) => {
  try {
    const employeeId = req.params.id.trim();

    const birthday = await service.deleteBirthday(employeeId);

    if (!birthday) {
      return res.status(404).json({
        success: false,
        message: "Birthday record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Birthday deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// GET UPCOMING BIRTHDAYS
// ==========================================

exports.upcoming = async (req, res) => {
  try {
    console.log("Upcoming Birthday API Called");

    const birthdays = await service.getAllBirthdays();

    // Current date in Indian timezone
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const getPart = (type) =>
      Number(parts.find((part) => part.type === type).value);

    const currentYear = getPart("year");

    const today = new Date(
      Date.UTC(
        currentYear,
        getPart("month") - 1,
        getPart("day")
      )
    );

    // Handle February 29 in non-leap years
    const getBirthdayDate = (year, month, day) => {
      const lastDay = new Date(
        Date.UTC(year, month + 1, 0)
      ).getUTCDate();

      return new Date(
        Date.UTC(year, month, Math.min(day, lastDay))
      );
    };

    const upcomingBirthdays = birthdays
      .filter((employee) => {
        return (
          employee.dob &&
          !Number.isNaN(new Date(employee.dob).getTime())
        );
      })
      .map((employee) => {
        const dob = new Date(employee.dob);

        const month = dob.getUTCMonth();
        const day = dob.getUTCDate();

        let nextBirthday = getBirthdayDate(
          currentYear,
          month,
          day
        );

        // Birthday already completed this year
        if (nextBirthday < today) {
          nextBirthday = getBirthdayDate(
            currentYear + 1,
            month,
            day
          );
        }

        const daysRemaining = Math.round(
          (nextBirthday.getTime() - today.getTime()) /
            86400000
        );

        return {
          _id: employee._id,
          employeeName: employee.employeeName,
          employeeId: employee.employeeId,

          birthday: nextBirthday
            .toISOString()
            .slice(0, 10),

          formattedBirthday:
            nextBirthday.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              timeZone: "UTC",
            }),

          daysRemaining,
          isToday: daysRemaining === 0,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return res.status(200).json({
      success: true,
      message: "Upcoming birthdays fetched successfully",
      count: upcomingBirthdays.length,
      data: upcomingBirthdays,
    });

  } catch (error) {
    return handleError(res, error);
  }
};