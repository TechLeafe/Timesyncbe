
const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");

const {
  getAchievement,
  saveAchievement,
} = require("./monthlyAchievement.controller");

const router = express.Router();

router.use(authMiddleware);

const authorizeAdminHR = (req, res, next) => {
  if ([1, 2].includes(Number(req.user?.userType))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Only Admin and HR can declare achievements",
  });
};

router.get("/", getAchievement);

router.post("/", authorizeAdminHR, saveAchievement);

module.exports = router;
