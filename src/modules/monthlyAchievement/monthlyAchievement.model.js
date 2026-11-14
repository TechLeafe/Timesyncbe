
const mongoose = require("mongoose");

const monthlyAchievementSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    achievement: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    selectedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

monthlyAchievementSchema.index(
  { month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "MonthlyAchievement",
  monthlyAchievementSchema
);
