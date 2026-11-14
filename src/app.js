const express = require("express");
const cors = require("cors");

const employeeRoutes = require("./modules/employees/employee.routes");
const authRoutes = require("./auth/auth.routes");
const leaveApplyRoutes = require("./modules/leaveApply/leaveApply.routes");
const leaveRoutes = require("./modules/leaves/leave.routes");
const attendanceRoutes = require("./modules/attendance/attendance.routes");
const holidayRoutes = require("./modules/holidays/holiday.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const dailyTaskRouter = require("./modules/dailyTasks/dailyTask.router");

const birthdayCreationRoutes = require(
  "./modules/birthdayCreation/birthdayCreation.routes"
);

const monthlyAchievementRoutes = require(
  "./modules/monthlyAchievement/monthlyAchievement.routes"
);

const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(
  "/api/monthly-achievement",
  express.json({ limit: "15mb" })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Time Sync Backend API is running",
  });
});

// Employee routes
app.use("/api/employees", employeeRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);

console.log("Auth routes registered: POST /api/login");

// Existing HRMS routes
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave-apply", leaveApplyRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/daily-tasks", dailyTaskRouter);

// Birthday Creation routes
app.use("/api/birthday-creation", birthdayCreationRoutes);

console.log("Birthday Creation routes registered");

app.use(
  "/api/monthly-achievement",
  monthlyAchievementRoutes
);
// Error middleware must be last
app.use(errorMiddleware);
module.exports = app;
