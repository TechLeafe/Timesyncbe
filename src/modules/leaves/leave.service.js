const Leave = require("./leave.model");

// Create leave policy
const createLeave = async (leaveData) => {
    const leave = await Leave.create(leaveData);

    return leave;
};

// Get all leave policies
const getAllLeaves = async () => {
    const leaves = await Leave.find()
        .sort({ createdAt: -1 });

    return leaves;
};

// Get leave policy by ID
const getLeaveById = async (id) => {
    const leave = await Leave.findById(id);

    return leave;
};

// Update leave policy
const updateLeave = async (id, leaveData) => {
    const leave = await Leave.findByIdAndUpdate(
        id,
        leaveData,
        {
            new: true,
            runValidators: true
        }
    );

    return leave;
};

// Delete leave policy
const deleteLeave = async (id) => {
    const leave = await Leave.findByIdAndDelete(id);

    return leave;
};

module.exports = {
    createLeave,
    getAllLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave
};