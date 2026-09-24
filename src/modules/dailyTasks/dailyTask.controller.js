const dailyTaskService = require("./dailyTask.service");
const validateDailyTask = require("./dailyTask.validation");

// 1. Create Task
const createTask = async (req, res, next) => {
  try {
    const validation = validateDailyTask(req.body, "create");
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id = req.user.user_id;
    const task = await dailyTaskService.createTask(user_id, req.body);

    return res.status(201).json({
      success: true,
      message: "Daily task created successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// 2. List Tasks
const getTaskList = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const filterData = Object.keys(req.query).length > 0 ? req.query : req.body;
    const tasks = await dailyTaskService.getTaskList(user_id, filterData);

    return res.status(200).json({
      success: true,
      message: "Daily tasks fetched successfully",
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update Task Details
const updateTask = async (req, res, next) => {
  try {
    const validation = validateDailyTask(req.body, "update");
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id = req.user.user_id;
    const updatedTask = await dailyTaskService.updateTask(user_id, req.body);

    return res.status(200).json({
      success: true,
      message: "Daily task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Change Task Status
const changeTaskStatus = async (req, res, next) => {
  try {
    const validation = validateDailyTask(req.body, "change-status");
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id = req.user.user_id;
    const updatedTask = await dailyTaskService.changeTaskStatus(user_id, req.body);

    return res.status(200).json({
      success: true,
      message: `Task status changed to '${updatedTask.status}'`,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Add Comment Log
const addComment = async (req, res, next) => {
  try {
    const validation = validateDailyTask(req.body, "add-comment");
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id = req.user.user_id;
    const updatedTask = await dailyTaskService.addComment(user_id, req.body);

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Delete Task
const deleteTask = async (req, res, next) => {
  try {
    const validation = validateDailyTask(req.body, "delete");
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const user_id = req.user.user_id;
    const result = await dailyTaskService.deleteTask(user_id, req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTaskList,
  updateTask,
  changeTaskStatus,
  addComment,
  deleteTask,
};