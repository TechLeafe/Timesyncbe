const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
    {
        policyName: {
            type: String,
            required: true,
            trim: true
        },

        businessYear: {
            type: String,
            required: true,
            trim: true
        },

        casualLeave: {
            type: Number,
            required: true,
            min: 0
        },

        sickLeave: {
            type: Number,
            required: true,
            min: 0
        },

        compensatoryOff: {
            type: Number,
            required: true,
            min: 0
        },

        permissionsPerMonth: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

// One policy name per business year
leaveSchema.index(
    { policyName: 1, businessYear: 1 },
    { unique: true }
);

module.exports = mongoose.model("Leave", leaveSchema);