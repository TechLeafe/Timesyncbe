const BirthdayCreation = require("./birthdayCreation.model");

// ==========================================
// CREATE BIRTHDAY
// ==========================================

const createBirthday = async (data) => {
  return BirthdayCreation.create(data);
};

// ==========================================
// GET ALL BIRTHDAYS
// ==========================================

const getAllBirthdays = async () => {
  return BirthdayCreation.find().sort({
    createdAt: -1,
  });
};

// ==========================================
// GET BIRTHDAY BY EMPLOYEE ID
// ==========================================

const getBirthdayById = async (employeeId) => {
  return BirthdayCreation.findOne({
    employeeId,
  });
};

// ==========================================
// UPDATE BIRTHDAY
// ==========================================

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

// ==========================================
// DELETE BIRTHDAY
// ==========================================

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