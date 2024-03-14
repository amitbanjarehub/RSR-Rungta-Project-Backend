"use strict";
const express = require("express");
const studentController = require("../../controllers/apis/studentController")

let router = express.Router();

router.use("/student", studentController)


module.exports = router;
