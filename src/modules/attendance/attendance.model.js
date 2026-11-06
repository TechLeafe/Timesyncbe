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

    requestedPermissionHours: {
      type: Number,
      default: 0,
    },

    approvedPermissionHours: {
      type: Number,
      default: 0,
    },

    approvedPermissionRequestedHours: {
      type: Number,
      default: 0,
    },

    totalCreditedWorkingSeconds: {
      type: Number,
      default: 0,
    },

    permissionStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Mixed", null],
      default: null,
    },

    monthlyPermissionUsedHours: {
      type: Number,
      default: 0,
    },

    monthlyPermissionRemainingHours: {
      type: Number,
      default: 4,
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
      enum: [
        "Pending",
        "In Progress",
        "Present",
        "Half-Day Present",
        "Late Present",
        "Present Late",
        "Early Departure",
        "Absent",
      ],
      default: "Pending",
    },

    attendanceStatusManuallyCorrected: {
      type: Boolean,
      default: false,
    },

    attendanceCorrections: [
      {
        hrUserId: {
          type: String,
          required: true,
          trim: true,
        },
        previousStatus: {
          type: String,
          required: true,
        },
        newStatus: {
          type: String,
          required: true,
        },
        reason: {
          type: String,
          required: true,
          trim: true,
        },
        modifiedAt: {
          type: Date,
          required: true,
        },
      },
    ],

    finalizedAt: {
      type: Date,
      default: null,
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