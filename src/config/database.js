const mongoose = require("mongoose");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Check both potential environment variable names
    const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!dbURI) {
      throw new Error("Neither MONGODB_URI nor MONGO_URI is defined in environment variables!");
    }

    const opts = {
      bufferCommands: true, // Keep standard buffering for Render servers
    };

    cached.promise = mongoose.connect(dbURI, opts).then((mongooseInstance) => {
      console.log("MongoDB connected successfully");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDatabase;