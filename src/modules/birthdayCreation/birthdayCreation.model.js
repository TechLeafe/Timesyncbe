
const mongoose = require("mongoose");

const birthdayCreationSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },

    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
    },

    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: (value) => value <= new Date(),
        message: "Date of birth cannot be in the future",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BirthdayCreation ||
  mongoose.model("BirthdayCreation", birthdayCreationSchema);
