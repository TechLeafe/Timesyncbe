const DailyTask = require("./dailyTask.model");

// Helper: Resolve Business Year (April - March)
const getBusinessYear = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  const currentYear = date.getFullYear();
  return date.getMonth() >= 3
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;
};

// 1. Create Task
const createTask = async (user_id, taskData) => {
  const { title, description, priority, fromDate, toDate, businessYear: bodyBusinessYear } = taskData;

  const businessYear = bodyBusinessYear && bodyBusinessYear.trim() !== ""
    ? bodyBusinessYear.trim()
    : getBusinessYear(fromDate);

  return await DailyTask.create({
    user_id,
    title,
    description,
    priority: priority || "Medium",
    fromDate: fromDate || null,
    toDate: toDate || null,
    status: "Pending",
    completedDate: null,
    comments: [],
    businessYear,
  });
};

// 2. List Tasks
const getTaskList = async (user_id, filterData = {}) => {
  const { status, priority, businessYear } = filterData;
  const query = {};

  if (status && status.trim() !== "") {
    query.status = status.trim();
  }

  if (priority && priority.trim() !== "") {
    query.priority = priority.trim();
  }

  if (businessYear && businessYear.trim() !== "") {
    query.businessYear = businessYear.trim();
  }

  return await DailyTask.find(query).sort({ createdAt: -1 });
};

// 3. Update Task Details (Handles status + complete date auto-sync)
const updateTask = async (user_id, updateData) => {
  const { _id, title, description, priority, status, fromDate, toDate, businessYear } = updateData;

  const task = await DailyTask.findById(_id);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;

  if (status !== undefined) {
    task.status = status;
    if (status === "Completed") {
      task.completedDate = new Date();
    } else {
      task.completedDate = null;
    }
  }

  if (fromDate !== undefined) task.fromDate = fromDate || null;
  if (toDate !== undefined) task.toDate = toDate || null;
  if (businessYear && businessYear.trim() !== "") task.businessYear = businessYear.trim();

  return await task.save();
};

// 4. Change Status
const changeTaskStatus = async (user_id, statusData) => {
  const { _id, status } = statusData;

  const task = await DailyTask.findById(_id);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  task.status = status;

  if (status === "Completed") {
    task.completedDate = new Date();
  } else {
    task.completedDate = null;
  }

  return await task.save();
};

// 5. Add Comment Log
const addComment = async (user_id, commentData) => {
  const { _id, text } = commentData;

  const task = await DailyTask.findById(_id);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  const newComment = {
    commentDate: new Date(),
    text,
    updatedBy: user_id,
  };

  task.comments.push(newComment);
  return await task.save();
};

// 6. Delete Task
const deleteTask = async (user_id, deleteData) => {
  const { _id } = deleteData;

  const task = await DailyTask.findByIdAndDelete(_id);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  return { message: "Task deleted successfully", _id };
};

module.exports = {
  createTask,
  getTaskList,
  updateTask,
  changeTaskStatus,
  addComment,
  deleteTask,
};