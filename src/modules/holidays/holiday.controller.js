const holidayService = require("./holiday.service");

const {
  validateCreateHoliday,
  validateHolidayFilter,
  validateIdPayload,
} = require("./holiday.validation");

// CREATE HOLIDAY
const createHoliday = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateCreateHoliday(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const holiday =
      await holidayService.createHoliday(
        req.body
      );

    return res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    next(error);
  }
};

// LIST HOLIDAYS
const getHolidays = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateHolidayFilter(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const companyYear =
      typeof req.body.companyYear ===
      "string"
        ? req.body.companyYear.trim()
        : "";

    const holidayType =
      typeof req.body.holidayType ===
      "string"
        ? req.body.holidayType.trim()
        : "";

    const holidays =
      await holidayService.getHolidays(
        companyYear,
        holidayType
      );

    return res.status(200).json({
      success: true,
      message:
        "Holidays fetched successfully",
      data: holidays,
    });
  } catch (error) {
    next(error);
  }
};

// VIEW HOLIDAY
const getHolidayById = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateIdPayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const holiday =
      await holidayService.getHolidayById(
        req.body._id
      );

    return res.status(200).json({
      success: true,
      message:
        "Holiday fetched successfully",
      data: holiday,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE HOLIDAY
const updateHoliday = async (
  req,
  res,
  next
) => {
  try {
    const idValidation =
      validateIdPayload(req.body);

    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: idValidation.errors,
      });
    }

    const validation =
      validateCreateHoliday(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const { _id, ...updateData } =
      req.body;

    const holiday =
      await holidayService.updateHoliday(
        _id,
        updateData
      );

    return res.status(200).json({
      success: true,
      message:
        "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE HOLIDAY
const deleteHoliday = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateIdPayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const holiday =
      await holidayService.deleteHoliday(
        req.body._id
      );

    return res.status(200).json({
      success: true,
      message:
        "Holiday deleted successfully",
      data: holiday,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
};