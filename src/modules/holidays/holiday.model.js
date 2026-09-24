const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    holidayName: {
      type: String,
      required: true,
      trim: true,
    },

    holidayDate: {
      type: String,
      required: true,
      trim: true,
    },

    holidayType: {
      type: String,
      required: true,
      enum: ["Public", "Company"],
      trim: true,
    },

    companyYear: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate holiday entries
holidaySchema.index(
  {
    holidayDate: 1,
    holidayType: 1,
    companyYear: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "Holiday",
  holidaySchema
);