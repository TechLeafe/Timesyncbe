const validateDailyTask = (data, action = "create") => {
  const errors = {};
  const { _id, title, description, status, priority, fromDate, toDate, text } = data;

  // Validate ID for update operations
  if (["update", "change-status", "add-comment", "delete"].includes(action)) {
    if (!_id) {
      errors._id = "Task ID (_id) is required";
    }
  }

  // Action-specific validations
  if (action === "create" || action === "update") {
    if (!title || !title.trim()) {
      errors.title = "Task title is required";
    }

    if (!description || !description.trim()) {
      errors.description = "Task description is required";
    }

    if (priority && !["High", "Medium", "Low"].includes(priority)) {
      errors.priority = "Invalid priority level. Allowed: High, Medium, Low";
    }

    if (status && !["Pending", "In Progress", "Completed"].includes(status)) {
      errors.status = "Invalid status. Allowed: Pending, In Progress, Completed";
    }

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (isNaN(start.getTime())) errors.fromDate = "Invalid fromDate format";
      if (isNaN(end.getTime())) errors.toDate = "Invalid toDate format";
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        errors.toDate = "toDate cannot be earlier than fromDate";
      }
    }
  }

  if (action === "change-status") {
    if (!status) {
      errors.status = "Status is required";
    } else if (!["Pending", "In Progress", "Completed"].includes(status)) {
      errors.status = "Invalid status. Allowed: Pending, In Progress, Completed";
    }
  }

  if (action === "add-comment") {
    if (!text || !text.trim()) {
      errors.text = "Comment text is required";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateDailyTask;