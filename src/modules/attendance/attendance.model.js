const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
    },

    user_id: {
      type: String,
      required: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    checkInTime: {
      type: Date,
      required: true,
    },

    checkOutTime: {
      type: Date,
      default: null,
    },

    totalWorkingSeconds: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per employee per day
attendanceSchema.index(
  {
    user_id: 1,
    day: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);