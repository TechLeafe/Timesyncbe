const express = require("express");

const { login } = require("./auth.controller");
const desktopOnly = require("../middleware/desktopOnly.middleware");

const router = express.Router();

router.post("/login", desktopOnly, login);

module.exports = router;
