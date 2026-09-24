const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Authorization header missing
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Check Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format. Use Bearer token",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is required",
      });
    }

const decoded = jwt.verify(
  token,
  process.env.JWT_SECRET
);

console.log("========== JWT DEBUG ==========");
console.log("DECODED TOKEN:", decoded);
console.log("USER ID:", decoded.user_id);
console.log("MONGO ID:", decoded.id);
console.log("EMAIL:", decoded.email);
console.log("USER TYPE:", decoded.userType);
console.log("================================");

req.user = decoded;
    // Store decoded user information
    req.user = decoded;

    next();
  } catch (error) {
    // Token expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again",
      });
    }

    // Invalid token
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;