const mongoose = require("mongoose");

const leaveApplySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    businessYear: {
      type: String,
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["CL", "SL", "COMP_OFF", "PERMISSION", "Casual Leave", "Sick Leave", "Earned Leave", "Permission"],
      required: true,
    },
    fromDate: {
      type: Date,
      default: null,
    },
    toDate: {
      type: Date,
      default: null,
    },
    fromTime: {
      type: String,
      default: null,
    },
    toTime: {
      type: String,
      default: null,
    },
    totalDays: {
      type: Number,
      default: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    compOffDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LeaveApply", leaveApplySchema);