
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  sendSupportEmail,
} = require("./support.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

// Prevent repeated support emails
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => String(req.user.id),

  message: {
    success: false,
    message: "Too many support requests. Please try again later.",
  },
});

// Employee support API
router.post(
  "/send-email",
  authMiddleware,
  supportLimiter,
  sendSupportEmail
);

module.exports = router;
