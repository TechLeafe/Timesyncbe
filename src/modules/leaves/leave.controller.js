const leaveService = require("./leave.service");

const createLeave = async (req, res, next) => {
    try {
        const leave = await leaveService.createLeave(req.body);

        res.status(201).json({
            success: true,
            message: "Leave created successfully",
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

const getLeaves = async (req, res, next) => {
    try {
        const leaves = await leaveService.getAllLeaves();

        res.status(200).json({
            success: true,
            data: leaves
        });
    } catch (error) {
        next(error);
    }
};

const getLeaveById = async (req, res, next) => {
    try {
        const leave = await leaveService.getLeaveById(req.params.id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        res.status(200).json({
            success: true,
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

const updateLeave = async (req, res, next) => {
    try {
        const leave = await leaveService.updateLeave(req.params.id,req.body);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        res.status(200).json({ success: true,  message: "Leave updated successfully",  data: leave });
    } catch (error) {
        next(error);
    }
};

const deleteLeave = async (req, res, next) => {
    try {
        const leave = await leaveService.deleteLeave(req.params.id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave deleted successfully"
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