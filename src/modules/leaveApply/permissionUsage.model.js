const mongoose = require("mongoose");

const permissionUsageSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      trim: true,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    usedHours: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

permissionUsageSchema.index({ user_id: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("PermissionUsage", permissionUsageSchema);
