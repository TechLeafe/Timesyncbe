require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");
const attendanceScheduler = require("./modules/attendance/attendanceScheduler");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB successfully");

    attendanceScheduler.start();
    await attendanceScheduler.ensureDueFinalization();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();