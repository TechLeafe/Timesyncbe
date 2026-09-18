const mongoose = require("mongoose");

const validateLeave = (data) => {
    const errors = {};

    // Employee ID validation
    if (!data.employeeId) {
        errors.employeeId = "Employee ID is required";
    } else if (!mongoose.Types.ObjectId.isValid(data.employeeId)) {
        errors.employeeId = "Invalid Employee ID";
    }

    // Leave type validation
    const validLeaveTypes = [
        "Casual Leave",
        "Sick Leave",
        "Earned Leave",
        "Permission"
    ];

    if (!data.leaveType) {
        errors.leaveType = "Leave type is required";
    } else if (!validLeaveTypes.includes(data.leaveType)) {
        errors.leaveType = "Invalid leave type";
    }

    // From date validation
    if (!data.fromDate) {
        errors.fromDate = "From date is required";
    }

    // To date validation
    if (!data.toDate) {
        errors.toDate = "To date is required";
    }

    // Date comparison
    if (data.fromDate && data.toDate) {
        const fromDate = new Date(data.fromDate);
        const toDate = new Date(data.toDate);

        if (isNaN(fromDate.getTime())) {
            errors.fromDate = "Invalid from date";
        }

        if (isNaN(toDate.getTime())) {
            errors.toDate = "Invalid to date";
        }

        if (
            !isNaN(fromDate.getTime()) &&
            !isNaN(toDate.getTime()) &&
            toDate < fromDate
        ) {
            errors.toDate = "To date cannot be before from date";
        }
    }

    // Reason validation
    if (!data.reason) {
        errors.reason = "Leave reason is required";
    } else if (data.reason.trim().length < 3) {
        errors.reason = "Leave reason must be at least 3 characters";
    }

    // Status validation
    const validStatuses = [
        "Pending",
        "Approved",
        "Rejected"
    ];

    if (data.status && !validStatuses.includes(data.status)) {
        errors.status = "Invalid leave status";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

module.exports = validateLeave;