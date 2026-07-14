const express = require("express");

const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const {
  findAllAssignments,
  findAssignmentById,
  findOpenAssignmentByCourseAndEmployee,
  createNewAssignment,
  updateAssignmentById,
  deleteAssignmentById,
} = require("../models/assignment.model");
const { findCourseById } = require("../models/courses.model");
const { findUserById } = require("../models/user.model");

const router = express.Router();

const VALID_STATUSES = ["assigned", "completed", "expired", "cancelled"];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;
const YEAR_REGEX = /^\d{4}$/;

const isValidDate = (value) => DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));
const today = () => new Date().toISOString().slice(0, 10);
const isOpen = (assignment) => assignment.status === "assigned";
const isExpired = (assignment) =>
  assignment.status === "assigned" && assignment.due_date < today();

const withDerivedStatus = (assignment) =>
  isExpired(assignment) ? { ...assignment, status: "expired" } : assignment;

// Get All Assignments — admin: tutti gli assignment. Dipendente: solo i propri assignment.
// Con filtri per: Stato, categoria, corso, mese/anno di scadenza, dipendente (solo referenti academy).
router.get("/", protect, async (req, res) => {
  try {
    const { status, category, course_id, employee_id, due_month, due_year } = req.query;

    // Whitelist sui valori a insieme chiuso
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `Stato non valido: ammessi ${VALID_STATUSES.join(", ")}`,
      });
    }

    if (course_id && !UUID_REGEX.test(course_id)) {
      return res.status(400).json({ ok: false, error: "Corso non valido" });
    }

    if (employee_id && !UUID_REGEX.test(employee_id)) {
      return res.status(400).json({ ok: false, error: "Dipendente non valido" });
    }

    if (due_month && !MONTH_REGEX.test(due_month)) {
      return res.status(400).json({
        ok: false,
        error: "Mese di scadenza non valido: formato richiesto AAAA-MM",
      });
    }

    // due_year filtra un anno intero: serve quando si sceglie l'anno senza il mese.
    if (due_year && !YEAR_REGEX.test(due_year)) {
      return res.status(400).json({
        ok: false,
        error: "Anno di scadenza non valido: formato richiesto AAAA",
      });
    }

    const filters = { category, course_id, due_month, due_year };

    // Lo stato 'expired' è derivato (assigned + scadenza passata), non esiste sul DB:
    // il filtro va tradotto in una condizione sulla data di scadenza.
    if (status === "expired") {
      filters.status = "assigned";
      filters.due_before = today();
    } else if (status === "assigned") {
      filters.status = "assigned";
      filters.due_from = today();
    } else {
      filters.status = status;
    }

    // Visibilità: solo il referente academy (admin) può filtrare per dipendente.
    // Il dipendente vede sempre e solo le proprie assegnazioni: employee_id è
    // forzato al suo id, un eventuale filtro nella query string viene ignorato.
    filters.employee_id = req.user.isAdmin ? employee_id : req.user.sub;

    const assignments = await findAllAssignments(filters);
    return res.status(200).json({
      ok: true,
      assignments: assignments.map(withDerivedStatus),
    });
  } catch (err) {
    console.error("GET ALL ASSIGNMENTS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Get single assignment by id — admin: qualsiasi assegnazione. Dipendente: solo le proprie.
router.get("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await findAssignmentById(id);
    if (!assignment) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }

    if (!req.user.isAdmin && assignment.employee_id !== req.user.sub) {
      return res.status(403).json({ ok: false, error: "Accesso non autorizzato" });
    }

    return res.status(200).json({ ok: true, assignment: withDerivedStatus(assignment) });
  } catch (err) {
    console.error("GET SINGLE ASSIGNMENT BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Create Assignment — lo stato iniziale è sempre 'assigned' (default del DB):
// i cambi di stato passano da /complete e /cancel.
router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const { course_id, employee_id, due_date } = req.body;
    const assigned_at = req.body.assigned_at || today();

    // Validazione base dei campi (assigned_at è opzionale: default a oggi)
    if (!course_id || !employee_id || !due_date) {
      return res.status(400).json({
        ok: false,
        error: "Campi obbligatori mancanti: course_id, employee_id, due_date",
      });
    }

    // Validazione corso
    if (!UUID_REGEX.test(course_id)) {
      return res.status(400).json({
        ok: false,
        error: "Corso non valido",
      });
    }

    // Validazione dipendente
    if (!UUID_REGEX.test(employee_id)) {
      return res.status(400).json({
        ok: false,
        error: "Dipendente non valido",
      });
    }

    // Validazione data di assegnazione
    if (!isValidDate(assigned_at)) {
      return res.status(400).json({
        ok: false,
        error: "Data di assegnazione non valida: formato richiesto AAAA-MM-GG",
      });
    }

    // Validazione data di scadenza
    if (!isValidDate(due_date)) {
      return res.status(400).json({
        ok: false,
        error: "Data di scadenza non valida: formato richiesto AAAA-MM-GG",
      });
    }

    if (due_date < assigned_at) {
      return res.status(400).json({
        ok: false,
        error: "La data di scadenza non può precedere la data di assegnazione",
      });
    }

    const course = await findCourseById(course_id);
    if (!course) {
      return res.status(400).json({ ok: false, error: "Corso non trovato" });
    }
    if (!course.active) {
      return res.status(400).json({
        ok: false,
        error: "Impossibile assegnare un corso disabilitato",
      });
    }

    const employee = await findUserById(employee_id);
    if (!employee) {
      return res.status(400).json({ ok: false, error: "Dipendente non trovato" });
    }

    const openAssignment = await findOpenAssignmentByCourseAndEmployee(course_id, employee_id);
    if (openAssignment) {
      return res.status(409).json({
        ok: false,
        error: "Il corso è già assegnato a questo dipendente ed è ancora da completare",
      });
    }

    const assignment = await createNewAssignment(
      course_id,
      employee_id,
      assigned_at,
      due_date
    );
    return res.status(201).json({ ok: true, assignment });
  } catch (err) {
    console.error("CREATE ASSIGNMENT ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Update Assignment by ID — modifica corso, dipendente e date.
// Lo stato NON si tocca qui: cambia solo tramite /complete e /cancel.
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, employee_id, due_date } = req.body;
    const assigned_at = req.body.assigned_at || today();

    // Validazione base dei campi (assigned_at è opzionale: default a oggi)
    if (!course_id || !employee_id || !due_date) {
      return res.status(400).json({
        ok: false,
        error: "Campi obbligatori mancanti: course_id, employee_id, due_date",
      });
    }

    // Validazione corso
    if (!UUID_REGEX.test(course_id)) {
      return res.status(400).json({
        ok: false,
        error: "Corso non valido",
      });
    }

    // Validazione dipendente
    if (!UUID_REGEX.test(employee_id)) {
      return res.status(400).json({
        ok: false,
        error: "Dipendente non valido",
      });
    }

    // Validazione data di assegnazione
    if (!isValidDate(assigned_at)) {
      return res.status(400).json({
        ok: false,
        error: "Data di assegnazione non valida: formato richiesto AAAA-MM-GG",
      });
    }

    // Validazione data di scadenza
    if (!isValidDate(due_date)) {
      return res.status(400).json({
        ok: false,
        error: "Data di scadenza non valida: formato richiesto AAAA-MM-GG",
      });
    }

    if (due_date < assigned_at) {
      return res.status(400).json({
        ok: false,
        error: "La data di scadenza non può precedere la data di assegnazione",
      });
    }

    const existingAssignment = await findAssignmentById(id);
    if (!existingAssignment) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }

    // Un'assegnazione chiusa è storico: non si riapre modificandola
    if (!isOpen(existingAssignment)) {
      return res.status(409).json({
        ok: false,
        error: "Impossibile modificare un'assegnazione già chiusa (completata, scaduta o annullata)",
      });
    }

    const course = await findCourseById(course_id);
    if (!course) {
      return res.status(400).json({ ok: false, error: "Corso non trovato" });
    }
    if (!course.active) {
      return res.status(400).json({
        ok: false,
        error: "Impossibile assegnare un corso disabilitato",
      });
    }

    const employee = await findUserById(employee_id);
    if (!employee) {
      return res.status(400).json({ ok: false, error: "Dipendente non trovato" });
    }

    // Stesso vincolo di unicità della creazione, escludendo l'assegnazione che si sta modificando
    const openAssignment = await findOpenAssignmentByCourseAndEmployee(course_id, employee_id);
    if (openAssignment && String(openAssignment.id) !== id) {
      return res.status(409).json({
        ok: false,
        error: "Il corso è già assegnato a questo dipendente ed è ancora da completare",
      });
    }

    const updateData = {
      course_id,
      employee_id,
      assigned_at,
      due_date,
    };

    const assignment = await updateAssignmentById(id, updateData);
    return res.status(200).json({ ok: true, assignment });
  } catch (err) {
    console.error("UPDATE ASSIGNMENT BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Delete Assignment by ID
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await deleteAssignmentById(id);
    if (!assignment) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }
    return res.status(200).json({ ok: true, assignment });
  } catch (err) {
    console.error("DELETE ASSIGNMENT BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Complete an assignment by ID (assigned → completed)
// Admin: qualsiasi assegnazione. Dipendente: solo le proprie.
router.put("/:id/complete", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const completed_at = req.body.completed_at || today();

    const existingAssignment = await findAssignmentById(id);
    if (!existingAssignment) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }

    if (!req.user.isAdmin && existingAssignment.employee_id !== req.user.sub) {
      return res.status(403).json({ ok: false, error: "Accesso non autorizzato" });
    }

    if (!isOpen(existingAssignment)) {
      return res.status(409).json({
        ok: false,
        error: "Impossibile completare un'assegnazione già chiusa (completata, scaduta o annullata)",
      });
    }

    if (!isValidDate(completed_at)) {
      return res.status(400).json({
        ok: false,
        error: "Data di completamento non valida: formato richiesto AAAA-MM-GG",
      });
    }

    if (completed_at < existingAssignment.assigned_at) {
      return res.status(400).json({
        ok: false,
        error: "La data di completamento non può precedere la data di assegnazione",
      });
    }

    const assignment = await updateAssignmentById(id, {
      status: "completed",
      completed_at,
    });
    return res.status(200).json({ ok: true, assignment });
  } catch (err) {
    console.error("COMPLETE ASSIGNMENT BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Cancel an assignment by ID (assigned → cancelled). Solo admin.
router.put("/:id/cancel", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingAssignment = await findAssignmentById(id);
    if (!existingAssignment) {
      return res.status(404).json({ ok: false, error: "Assegnazione non trovata" });
    }

    if (!isOpen(existingAssignment)) {
      return res.status(409).json({
        ok: false,
        error: "Impossibile annullare un'assegnazione già chiusa (completata, scaduta o annullata)",
      });
    }

    const assignment = await updateAssignmentById(id, { status: "cancelled" });
    return res.status(200).json({ ok: true, assignment });
  } catch (err) {
    console.error("CANCEL ASSIGNMENT BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
