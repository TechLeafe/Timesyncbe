const validateCreateHoliday = (data) => {
  const errors = {};

  if (
    !data.holidayName ||
    typeof data.holidayName !== "string"
  ) {
    errors.holidayName =
      "Holiday name is required";
  }

  if (
    !data.holidayDate ||
    typeof data.holidayDate !== "string"
  ) {
    errors.holidayDate =
      "Holiday date is required";
  } else if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data.holidayDate
    )
  ) {
    errors.holidayDate =
      "Holiday date must be in YYYY-MM-DD format";
  }

  if (
    !data.holidayType ||
    typeof data.holidayType !== "string"
  ) {
    errors.holidayType =
      "Holiday type is required";
  } else if (
    !["Public", "Company"].includes(
      data.holidayType
    )
  ) {
    errors.holidayType =
      "Holiday type must be Public or Company";
  }

  if (
    !data.companyYear ||
    typeof data.companyYear !== "string"
  ) {
    errors.companyYear =
      "Company year is required";
  } else if (
    !/^\d{4}-\d{4}$/.test(
      data.companyYear
    )
  ) {
    errors.companyYear =
      "Company year must be in YYYY-YYYY format";
  }

  if (
    data.description !== undefined &&
    typeof data.description !== "string"
  ) {
    errors.description =
      "Description must be a string";
  }

  if (
    data.status !== undefined &&
    !["Active", "Inactive"].includes(
      data.status
    )
  ) {
    errors.status =
      "Status must be Active or Inactive";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// List / filter validation
const validateHolidayFilter = (data) => {
  const errors = {};

  if (
    data.companyYear !== undefined &&
    typeof data.companyYear !== "string"
  ) {
    errors.companyYear =
      "Company year must be a string";
  }

  if (
    data.holidayType !== undefined &&
    typeof data.holidayType !== "string"
  ) {
    errors.holidayType =
      "Holiday type must be a string";
  }

  if (
    data.holidayType !== undefined &&
    data.holidayType !== "" &&
    !["Public", "Company"].includes(
      data.holidayType
    )
  ) {
    errors.holidayType =
      "Holiday type must be Public or Company";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// View / update / delete validation
const validateIdPayload = (data) => {
  const errors = {};

  if (
    !data._id ||
    typeof data._id !== "string"
  ) {
    errors._id =
      "Holiday ID is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = {
  validateCreateHoliday,
  validateHolidayFilter,
  validateIdPayload,
};