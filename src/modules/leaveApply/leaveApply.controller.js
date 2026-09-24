const leaveApplyService = require("./leaveApply.service");
const validateLeaveApply = require("./leaveApply.validation");

// 1. Apply Leave
const applyLeave = async (req, res, next) => {
  try {
    const validation = validateLeaveApply(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: validation.errors });
    }

    const tokenUserId = req.user.user_id;
    const leave = await leaveApplyService.applyLeave(tokenUserId, req.body);

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Leave Applications List
// 2. Get Leave Applications List
const getLeaveList = async (req, res, next) => {
  try {
    const tokenUserId = req.user.user_id;
    const userType = req.user.userType; // 👈 Pass userType from req.user (JWT payload)

    const leaves = await leaveApplyService.getLeaveList(
      tokenUserId,
      userType,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Leave applications fetched successfully",
      data: leaves,
    });
  } catch (error) {
    next(error);
  }
};
// 3. Edit / Update Leave
const updateLeave = async (req, res, next) => {
  try {
    const validation = validateLeaveApply(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: validation.errors });
    }

    const tokenUserId = req.user.user_id;
    const updatedLeave = await leaveApplyService.updateLeave(tokenUserId, req.body);

    return res.status(200).json({
      success: true,
      message: "Leave application updated successfully",
      data: updatedLeave,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Review Leave (HR / Admin Status Update)
const reviewLeave = async (req, res, next) => {
  try {
    const { leaveId, status, rejectionReason } = req.body;

    if (!leaveId || !status) {
      return res.status(400).json({
        success: false,
        message: "leaveId and status are required fields",
      });
    }

    const reviewerUserId = req.user.user_id;
    const updatedLeave = await leaveApplyService.reviewLeave(
      reviewerUserId,
      leaveId,
      status,
      rejectionReason
    );

    return res.status(200).json({
      success: true,
      message: `Leave application successfully ${status.toLowerCase()}`,
      data: updatedLeave,
    });
  } catch (error) {
    next(error);
  }
};

const getLeaveBalance = async (req, res, next) => {
  try {
    const tokenUserId = req.user.user_id;
    const { businessYear } = req.body;
    const balance = await leaveApplyService.getLeaveBalance(tokenUserId, businessYear);

    return res.status(200).json({
      success: true,
      message: "Leave balance fetched successfully",
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getLeaveList,
  updateLeave,
  reviewLeave,
  getLeaveBalance,
};