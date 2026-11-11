
const BirthdayCreation = require("./birthdayCreation.model");

// Create birthday
const createBirthday = async (data) => {
  return BirthdayCreation.create(data);
};

// Get all birthdays
const getAllBirthdays = async () => {
  return BirthdayCreation.find().sort({
    createdAt: -1,
  });
};

// Get birthday by Employee ID
const getBirthdayById = async (employeeId) => {
  return BirthdayCreation.findOne({
    employeeId,
  });
};

// Update birthday by Employee ID
const updateBirthday = async (employeeId, data) => {
  return BirthdayCreation.findOneAndUpdate(
    { employeeId },
    { $set: data },
    {
      new: true,
      runValidators: true,
    }
  );
};

// Delete birthday by Employee ID
const deleteBirthday = async (employeeId) => {
  return BirthdayCreation.findOneAndDelete({
    employeeId,
  });
};

module.exports = {
  createBirthday,
  getAllBirthdays,
  getBirthdayById,
  updateBirthday,
  deleteBirthday,
};
