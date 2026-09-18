const mongoose = require("mongoose");

const leaveApplySchema = new mongoose.Schema(
  {
    // Employee who applied for the leave
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    leaveType: {
      type: String,
      enum: ["CL", "SL", "COMP_OFF", "PERMISSION"],
      required: true,
    },

    // Used for CL, SL and COMP_OFF
    fromDate: {
      type: Date,
      default: null,
    },

    toDate: {
      type: Date,
      default: null,
    },

    // Used only for COMP_OFF
    compensatingDate: {
      type: Date,
      default: null,
    },

    // Used only for PERMISSION
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

    // Admin/HR who reviewed the request
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LeaveApply", leaveApplySchema);