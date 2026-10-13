const mongoose = require("mongoose");

const connectDatabase = async () => {
  const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!dbURI) {
    throw new Error("MongoDB URI is missing");
  }

  const connection = await mongoose.connect(dbURI);

  console.log("MongoDB connected successfully");
  console.log("Database name:", connection.connection.name);
  console.log("MongoDB host:", connection.connection.host);
  console.log("MongoDB port:", connection.connection.port);

  return connection;
};

module.exports = connectDatabase;