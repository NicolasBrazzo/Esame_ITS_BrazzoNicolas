const express = require("express");
const bcrypt = require("bcrypt");

const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const { validateName } = require("../utils/validateName");
const {
  findAllCourses,
  findCoursesByIds,
  findCourseById,
  findCourseByTitle,
  createNewCourse,
  updateCourseById,
  deleteCourseById,
  disableCourseById,
} = require("../models/courses.model");
const {
  findAssignmentsByCourseId,
  findAssignedCourseIdsByEmployeeId,
} = require("../models/assignment.model");

const router = express.Router();

// Get All courses — admin: tutti i corsi. Dipendente: solo i corsi a lui assegnati.
router.get("/", protect, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const courses = await findAllCourses();
      return res.status(200).json({ ok: true, courses });
    }

    const assignedCourseIds = await findAssignedCourseIdsByEmployeeId(req.user.sub);
    const courses = await findCoursesByIds(assignedCourseIds);
    return res.status(200).json({ ok: true, courses });
  } catch (err) {
    console.error("GET ALL COURSES ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Get single course by id — admin: qualsiasi corso. Dipendente: solo se assegnato a lui.
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const course = await findCourseById(id);
    if (!course) {
      return res.status(404).json({ ok: false, error: "Corso non trovato" });
    }

    if (!req.user.isAdmin) {
      const assignedCourseIds = await findAssignedCourseIdsByEmployeeId(req.user.sub);
      if (!assignedCourseIds.includes(id)) {
        return res.status(403).json({ ok: false, error: "Accesso non autorizzato" });
      }
    }

    return res.status(200).json({ ok: true, course });
  } catch (err) {
    console.error("GET SINGLE COURSE BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Create Course
router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const { title, description, category, duration_hours, mandatory } = req.body;

    // Validazione base dei campi
    if (!title || !duration_hours || typeof mandatory !== "boolean") {
      return res.status(400).json({
        ok: false,
        error: "Campi obbligatori mancanti: title, duration_hours, mandatory",
      });
    }

    // Validazione titolo
    if (!validateName(title)) {
      return res.status(400).json({
        ok: false,
        error: "Il titolo è obbligatorio (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione descrizione
    if (description && !validateName(description)) {
      return res.status(400).json({
        ok: false,
        error: "La descrizione è obbligatoria (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione categoria
    if (category && !validateName(category)) {
      return res.status(400).json({
        ok: false,
        error: "La categoria è obbligatoria (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione durata
    if (duration_hours <= 0) {
      return res.status(400).json({
        ok: false,
        error: "La durata deve essere un numero positivo",
      });
    }

    const existingCourse = await findCourseByTitle(title);
    if (existingCourse) {
      return res.status(409).json({
        ok: false,
        error: "Il titolo del corso è già in uso",
      });
    }

    const course = await createNewCourse(
      title,
      description,
      category,
      duration_hours,
      mandatory
    );
    return res.status(201).json({ ok: true, course });
  } catch (err) {
    console.error("CREATE COURSE ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Update Course by ID
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, duration_hours, mandatory } = req.body;

    // Validazione base dei campi
    if (!title || !duration_hours || typeof mandatory !== "boolean") {
      return res.status(400).json({
        ok: false,
        error: "Campi obbligatori mancanti: title, duration_hours, mandatory",
      });
    }

    // Validazione titolo
    if (!validateName(title)) {
      return res.status(400).json({
        ok: false,
        error: "Il titolo è obbligatorio (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione descrizione
    if (description && !validateName(description)) {
      return res.status(400).json({
        ok: false,
        error: "La descrizione è obbligatoria (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione categoria
    if (category && !validateName(category)) {
      return res.status(400).json({
        ok: false,
        error: "La categoria è obbligatoria (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione durata
    if (duration_hours <= 0) {
      return res.status(400).json({
        ok: false,
        error: "La durata deve essere un numero positivo",
      });
    }

    const existingCourse = await findCourseByTitle(title);
    if (existingCourse && String(existingCourse.id) !== id) {
      return res.status(409).json({
        ok: false,
        error: "Il titolo del corso è già in uso",
      });
    }

    let updateData = {
      title,
      description,
      category,
      duration_hours,
      mandatory
    };
    
    const course = await updateCourseById(id, updateData);
    if (!course) {
      return res.status(404).json({ ok: false, error: "Corso non trovato" });
    }
    return res.status(200).json({ ok: true, course });
  } catch (err) {
    console.error("UPDATE COURSE BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Delete Course by ID — bloccato se il corso ha assegnazioni collegate (usare /disable in quel caso)
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const assignments = await findAssignmentsByCourseId(id);
    if (assignments.length > 0) {
      return res.status(409).json({
        ok: false,
        error: "Impossibile eliminare il corso: sono presenti assegnazioni collegate. Disabilitalo invece di eliminarlo.",
      });
    }

    const course = await deleteCourseById(id);
    if (!course) {
      return res.status(404).json({ ok: false, error: "Corso non trovato" });
    }
    return res.status(200).json({ ok: true, course });
  } catch (err) {
    console.error("DELETE COURSE BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Disable a course by ID (soft delete)
router.put("/:id/disable", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingCourse = await findCourseById(id);
    if (!existingCourse) {
      return res.status(404).json({ ok: false, error: "Corso non trovato" });
    }
    if (!existingCourse.active) {
      return res.status(400).json({ ok: false, error: "Corso già disabilitato" });
    }

    const course = await disableCourseById(id);
    return res.status(200).json({ ok: true, course });
  } catch (err) {
    console.error("DISABLE COURSE BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
