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
      default: null,
    },

    checkOutTime: {
      type: Date,
      default: null,
    },

    totalWorkingSeconds: {
      type: Number,
      default: null,
    },

    sessions: [
      {
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
    ],

    attendanceStatus: {
      type: String,
      enum: ["Pending", "Present", "Present Late", "Absent"],
      default: "Pending",
    },

    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    reviewedBy: {
      type: String,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Keep one daily record per employee; sessions store repeat check-ins.
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