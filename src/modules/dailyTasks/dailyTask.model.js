const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    commentDate: {
      type: Date,
      default: Date.now,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    updatedBy: {
      type: String, // user_id from token
      required: true,
    },
  },
  { _id: true }
);

const dailyTaskSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    completedDate: {
      type: Date,
      default: null,
    },
    comments: [commentSchema],
    businessYear: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

dailyTaskSchema.index({ user_id: 1, status: 1, businessYear: 1 });

module.exports = mongoose.model("DailyTask", dailyTaskSchema);