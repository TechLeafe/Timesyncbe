
const express = require("express");

const {
  getDailyInspiration,
} = require("./dailyInspiration.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getDailyInspiration);

module.exports = router;
