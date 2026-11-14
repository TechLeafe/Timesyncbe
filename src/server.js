// require("dotenv").config();

// const app = require("./app");
// const connectDatabase = require("./config/database");
// const attendanceScheduler = require("./modules/attendance/attendanceScheduler");

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     await connectDatabase();
//     console.log("Connected to MongoDB successfully");

//     attendanceScheduler.start();
//     await attendanceScheduler.ensureDueFinalization();

//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error("Server startup failed:", error.message);
//     process.exit(1);
//   }
// };

// startServer();
require("dotenv").config();

const os = require("os");
const app = require("./app");
const connectDatabase = require("./config/database");
const attendanceScheduler = require("./modules/attendance/attendanceScheduler");

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const getLocalIP = () => {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      if ((addr.family === "IPv4" || addr.family === 4) && !addr.internal) {
        return addr.address;
      }
    }
  }
  return "localhost";
};

const startServer = async () => {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB");

    attendanceScheduler.start();
    await attendanceScheduler.ensureDueFinalization();

    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${getLocalIP()}:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();