const validateLeave = (data) => {
    const errors = {};

    if (!data.policyName) {
        errors.policyName = "Policy name is required";
    }

    if (!data.businessYear) {
        errors.businessYear = "Business year is required";
    } else if (!/^\d{4}-\d{4}$/.test(data.businessYear)) {
        errors.businessYear = "Business year must be in YYYY-YYYY format";
    }

    const numberFields = [
        "casualLeave",
        "sickLeave",
        "compensatoryOff",
        "permissionsPerMonth"
    ];

    numberFields.forEach((field) => {
        if (data[field] === undefined || data[field] === null) {
            errors[field] = `${field} is required`;
        } else if (
            typeof data[field] !== "number" ||
            data[field] < 0
        ) {
            errors[field] = `${field} must be a valid number`;
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

module.exports = validateLeave;