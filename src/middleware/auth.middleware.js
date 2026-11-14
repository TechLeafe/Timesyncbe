const jwt = require("jsonwebtoken");

// JWT AUTHENTICATION MIDDLEWARE
const authMiddleware = (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Validate Bearer token format
    const match = authHeader.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format. Use Bearer token",
      });
    }

    // Extract JWT token
    const token = match[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT configuration is missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    // Store authenticated user information
    req.user = decoded;

    // Continue to next middleware/controller
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    next(error);
  }
};

module.exports = authMiddleware;