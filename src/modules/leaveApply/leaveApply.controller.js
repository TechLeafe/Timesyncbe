const leaveApplyService = require("./leaveApply.service");
const validateLeaveApply = require("./leaveApply.validation");

const applyLeave = async (req, res, next) => {
  try {
    // Validate form data
    const validation = validateLeaveApply(
      req.body
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Get logged-in employee from JWT
    const employeeId =
      req.user.employeeMongoId;

    const leave =
      await leaveApplyService.applyLeave(
        employeeId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Leave request submitted successfully",
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
};