const express = require("express");
const cors = require("cors");

const employeeRoutes = require("./modules/employees/employee.routes");
const authRoutes = require("./auth/auth.routes");
const leaveApplyRoutes = require("./modules/leaveApply/leaveApply.routes");

const errorMiddleware = require("./middleware/error.middleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Time Sync Backend API is running",
  });
});

// Employee routes
app.use("/api/employees", employeeRoutes);

// Auth routes
app.use("/api", authRoutes);

// Employee Leave Apply routes
app.use("/api/leave-apply", leaveApplyRoutes);

// Error middleware
app.use(errorMiddleware);

module.exports = app;