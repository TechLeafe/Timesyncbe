const mongoose = require("mongoose");

const connectDatabase = async () => {
  const dbURI =
    process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!dbURI) {
    throw new Error(
      "MongoDB URI is missing. Check your .env file."
    );
  }

  const uri = dbURI.trim();

  if (
    !uri.startsWith("mongodb://") &&
    !uri.startsWith("mongodb+srv://")
  ) {
    throw new Error(
      "Invalid MongoDB URI. Check the beginning of your connection string in .env."
    );
  }

  try {
    const connection = await mongoose.connect(uri);

    console.log("MongoDB connected successfully");
    console.log("Database name:", connection.connection.name);
    console.log("MongoDB host:", connection.connection.host);

    return connection;
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

module.exports = connectDatabase;