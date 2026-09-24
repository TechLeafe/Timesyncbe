const leaveService = require("./leave.service");
const validateLeave = require("./leave.validation");

// Create leave policy
const createLeave = async (req, res, next) => {
    try {
        const validation = validateLeave(req.body);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.errors
            });
        }

        const leave = await leaveService.createLeave(req.body);

        res.status(201).json({
            success: true,
            message: "Leave policy created successfully",
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

// Get all leave policies
const getLeaves = async (req, res, next) => {
    try {
        const leaves = await leaveService.getAllLeaves(req.body);

        res.status(200).json({
            success: true,
            message: "Leave policies fetched successfully",
            data: leaves
        });
    } catch (error) {
        next(error);
    }
};

// Get leave policy by ID
const getLeaveById = async (req, res, next) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "_id is required"
            });
        }

        const leave = await leaveService.getLeaveById(_id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave policy not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave policy fetched successfully",
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

// Update leave policy
const updateLeave = async (req, res, next) => {
    try {
        const { _id, ...leaveData } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "_id is required"
            });
        }

        const validation = validateLeave(leaveData);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.errors
            });
        }

        const leave = await leaveService.updateLeave(
            _id,
            leaveData
        );

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave policy not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave policy updated successfully",
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

// Delete leave policy
const deleteLeave = async (req, res, next) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "_id is required"
            });
        }

        const leave = await leaveService.deleteLeave(_id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave policy not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave policy deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createLeave,
    getLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave
};