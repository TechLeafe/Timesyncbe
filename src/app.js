const express = require("express");
const cors = require("cors");

const employeeRoutes = require("./modules/employees/employee.routes");
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

// Error middleware
app.use(errorMiddleware);

module.exports = app;