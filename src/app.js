
const express = require("express");
const cors = require("cors");

// Employee & Authentication Routes
const employeeRoutes = require("./modules/employees/employee.routes");
const authRoutes = require("./auth/auth.routes");

// Leave Routes
const leaveApplyRoutes = require("./modules/leaveApply/leaveApply.routes");
const leaveRoutes = require("./modules/leaves/leave.routes");

// Attendance Routes
const attendanceRoutes = require("./modules/attendance/attendance.routes");

// Holiday Routes
const holidayRoutes = require("./modules/holidays/holiday.routes");

// Dashboard Routes
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

// Daily Task Routes
const dailyTaskRouter = require("./modules/dailyTasks/dailyTask.router");

// Employee Support Routes
const supportRoutes = require("./modules/support/support.routes");

// Birthday Creation Routes
const birthdayCreationRoutes = require(
  "./modules/birthdayCreation/birthdayCreation.routes"
);

// Monthly Achievement Routes
const monthlyAchievementRoutes = require(
  "./modules/monthlyAchievement/monthlyAchievement.routes"
);

// Error Middleware
const errorMiddleware = require("./middleware/error.middleware");

// Initialize Express
const app = express();

// Middleware
app.use(cors());

app.use(
  "/api/monthly-achievement",
  express.json({ limit: "15mb" })
);

app.use(express.json());

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Time Sync Backend API is running",
  });
});

// Employee Routes
app.use("/api/employees", employeeRoutes);

// Authentication Routes
app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);

console.log("Auth routes registered: POST /api/login");

// Leave Routes
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave-apply", leaveApplyRoutes);

// Attendance Routes
app.use("/api/attendance", attendanceRoutes);

// Holiday Routes
app.use("/api/holidays", holidayRoutes);

// Dashboard Routes
app.use("/api/dashboard", dashboardRoutes);

// Daily Task Routes
app.use("/api/daily-tasks", dailyTaskRouter);

// Employee Support Routes
app.use("/api/support", supportRoutes);

// Birthday Creation Routes
app.use("/api/birthday-creation", birthdayCreationRoutes);

// Monthly Achievement Routes
app.use(
  "/api/monthly-achievement",
  monthlyAchievementRoutes
);

// Error Middleware - Must Be Last
app.use(errorMiddleware);

module.exports = app;
