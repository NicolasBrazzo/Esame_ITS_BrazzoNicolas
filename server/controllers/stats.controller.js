const express = require("express");

const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const { findCourseById } = require("../models/courses.model");
const { findUserById } = require("../models/user.model");

const router = express.Router();

router.get("/stats", protect, isAdmin, async (req, res) => {
  try {
    const totalUsers = await findUserById.countDocuments();
    const totalCourses = await findCourseById.countDocuments();
    
  } catch (err) {
    console.error("GET STATS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});