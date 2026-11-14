
const Employee = require("../employees/employee.model");
const MonthlyAchievement = require("./monthlyAchievement.model");

const employeeFields =
  "user_id employeeId name designation status photo";
const MAX_EMPLOYEE_PHOTO_BYTES = 10 * 1024 * 1024;

const makeError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validatePhoto = (value) => {
  if (value === undefined) return undefined;

  if (typeof value !== "string") {
    throw makeError("Invalid employee image", 400);
  }

  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) {
    throw makeError("Upload a PNG, JPG, or WebP image", 400);
  }

  const [, imageType, encodedImage] = match;
  const image = Buffer.from(encodedImage, "base64");
  if (
    image.length === 0 ||
    image.length > MAX_EMPLOYEE_PHOTO_BYTES ||
    image.toString("base64") !== encodedImage
  ) {
    throw makeError("Image must be 10 MB or smaller", 400);
  }

  const isPng =
    imageType === "png" &&
    image.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  const isJpeg =
    imageType === "jpeg" &&
    image.length >= 3 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff;
  const isWebp =
    imageType === "webp" &&
    image.length >= 12 &&
    image.toString("ascii", 0, 4) === "RIFF" &&
    image.toString("ascii", 8, 12) === "WEBP";

  if (!isPng && !isJpeg && !isWebp) {
    throw makeError("The uploaded file is not a valid image", 400);
  }

  return value;
};

const validatePeriod = (month, year) => {
  const m = Number(month);
  const y = Number(year);

  if (
    !Number.isInteger(m) ||
    m < 1 ||
    m > 12 ||
    !Number.isInteger(y) ||
    y < 2000 ||
    y > 2100
  ) {
    throw makeError("Invalid month or year", 400);
  }

  return { month: m, year: y };
};

const saveAchievement = async (body, selectedBy) => {
  const { month, year } = validatePeriod(
    body.month,
    body.year
  );
  const photo = validatePhoto(body.photo);

  if (
    typeof body.user_id !== "string" ||
    !body.user_id.trim() ||
    typeof body.achievement !== "string" ||
    !body.achievement.trim() ||
    body.achievement.trim().length > 500
  ) {
    throw makeError("Employee and reason are required", 400);
  }

  const employee = await Employee.findOne({
    user_id: body.user_id.trim(),
    userType: 3,
    status: "Active",
  });

  if (!employee) {
    throw makeError("Active employee not found", 404);
  }

  if (photo !== undefined) {
    employee.photo = photo;
    await employee.save();
  }

  return MonthlyAchievement.findOneAndUpdate(
    { month, year },
    {
      $set: {
        employee: employee._id,
        achievement: body.achievement.trim(),
        selectedBy,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  ).populate("employee", employeeFields);
};

const getAchievement = async (month, year) => {
  return MonthlyAchievement.findOne(
    validatePeriod(month, year)
  ).populate("employee", employeeFields);
};

module.exports = {
  saveAchievement,
  getAchievement,
};
