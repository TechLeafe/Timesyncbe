
const mongoose = require("mongoose");

const dailyInspirationSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: ["Motivation", "Technology", "Science"],
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: String,
      default: "Unknown",
      trim: true,
    },

    source: {
      type: String,
      default: "Local Inspiration",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.DailyInspiration ||
  mongoose.model("DailyInspiration", dailyInspirationSchema);
