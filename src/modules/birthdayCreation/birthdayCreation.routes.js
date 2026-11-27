const express = require("express");

const controller = require("./birthdayCreation.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// ==========================================
// ADMIN AND HR PERMISSION
// ==========================================

const authorizeAdminHR = (req, res, next) => {
  const userType = Number(req.user?.userType);

  if (![1, 2].includes(userType)) {
    return res.status(403).json({
      success: false,
      message: "Only Admin and HR can manage birthdays",
    });
  }

  next();
};

// ==========================================
// BIRTHDAY VIEW PERMISSION
// ==========================================

const authorizeBirthdayView = (req, res, next) => {
  const userType = Number(req.user?.userType);

  if (![1, 2, 3].includes(userType)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  next();
};

// ==========================================
// UPCOMING BIRTHDAYS
// IMPORTANT: BEFORE /:id
// ==========================================

router.get(
  "/upcoming",
  authorizeBirthdayView,
  controller.upcoming
);

// ==========================================
// BIRTHDAY CREATION CRUD
// ==========================================

router.get("/", authorizeAdminHR, controller.list);

router.post("/", authorizeAdminHR, controller.create);

router.get("/:id", authorizeAdminHR, controller.getById);

router.put("/:id", authorizeAdminHR, controller.update);

router.delete("/:id", authorizeAdminHR, controller.remove);

module.exports = router;