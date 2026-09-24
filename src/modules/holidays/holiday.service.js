const Holiday = require("./holiday.model");

// CREATE HOLIDAY
const createHoliday = async (data) => {
  const existingHoliday =
    await Holiday.findOne({
      holidayDate: data.holidayDate,
      holidayType: data.holidayType,
      companyYear: data.companyYear,
    });

  if (existingHoliday) {
    const error = new Error(
      "Holiday already exists for this date, type and company year"
    );

    error.statusCode = 400;

    throw error;
  }

  const holiday =
    await Holiday.create(data);

  return holiday;
};

// LIST HOLIDAYS
const getHolidays = async (
  companyYear,
  holidayType
) => {
  const filter = {};

  // Empty companyYear = all years
  if (
    companyYear &&
    companyYear.trim() !== ""
  ) {
    filter.companyYear =
      companyYear.trim();
  }

  // Empty holidayType = all types
  if (
    holidayType &&
    holidayType.trim() !== ""
  ) {
    filter.holidayType =
      holidayType.trim();
  }

  const holidays =
    await Holiday.find(filter).sort({
      holidayDate: 1,
    });

  return holidays;
};

// VIEW HOLIDAY
const getHolidayById = async (_id) => {
  const holiday =
    await Holiday.findById(_id);

  if (!holiday) {
    const error = new Error(
      "Holiday not found"
    );

    error.statusCode = 404;

    throw error;
  }

  return holiday;
};

// UPDATE HOLIDAY
const updateHoliday = async (
  _id,
  data
) => {
  const holiday =
    await Holiday.findById(_id);

  if (!holiday) {
    const error = new Error(
      "Holiday not found"
    );

    error.statusCode = 404;

    throw error;
  }

  // Check duplicate if date/type/year changes
  const holidayDate =
    data.holidayDate ||
    holiday.holidayDate;

  const holidayType =
    data.holidayType ||
    holiday.holidayType;

  const companyYear =
    data.companyYear ||
    holiday.companyYear;

  const duplicate =
    await Holiday.findOne({
      _id: { $ne: _id },
      holidayDate,
      holidayType,
      companyYear,
    });

  if (duplicate) {
    const error = new Error(
      "Another holiday already exists for this date, type and company year"
    );

    error.statusCode = 400;

    throw error;
  }

  Object.assign(
    holiday,
    data
  );

  await holiday.save();

  return holiday;
};

// DELETE HOLIDAY
const deleteHoliday = async (_id) => {
  const holiday =
    await Holiday.findById(_id);

  if (!holiday) {
    const error = new Error(
      "Holiday not found"
    );

    error.statusCode = 404;

    throw error;
  }

  await Holiday.findByIdAndDelete(_id);

  return holiday;
};

module.exports = {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
};