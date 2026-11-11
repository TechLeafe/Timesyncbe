
const express = require("express");
const router = express.Router();

const controller = require("./birthdayCreation.controller");

// Create birthday
router.post("/create", controller.create);

// List all birthdays
router.get("/list", controller.list);

// Get birthday by Employee ID
router.get("/:id", controller.getById);

// Update birthday by Employee ID
router.put("/:id", controller.update);

// Delete birthday by Employee ID
router.delete("/:id", controller.remove);

module.exports = router;
