const Leave = require("./leave.model");

const createLeave = async (leaveData) => {
    const leave = await Leave.create(leaveData);
    return leave;
};

const getAllLeaves = async () => {
    const leaves = await Leave.find()
        .populate("employeeId");

    return leaves;
};

const getLeaveById = async (id) => {
    const leave = await Leave.findById(id)
        .populate("employeeId");

    return leave;
};

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