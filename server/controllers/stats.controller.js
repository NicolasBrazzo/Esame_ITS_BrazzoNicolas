const express = require("express");

const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const { findAllAssignments } = require("../models/assignment.model");

const router = express.Router();

const YEAR_REGEX = /^\d{4}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

const today = () => new Date().toISOString().slice(0, 10);

const completionRate = (completed, assigned) =>
  assigned > 0 ? Math.round((completed / assigned) * 1000) / 10 : 0;

// Get Stats — riepilogo dei corsi assegnati/completati per mese e categoria, con
// percentuale di completamento. Il "mese" del riepilogo è quello di ASSEGNAZIONE
// (assigned_at), non di scadenza: la percentuale risponde a "dei corsi assegnati
// in quel mese/categoria, quanti sono stati completati (finora)".
router.get("/", protect, isAdmin, async (req, res) => {
  try {
    const { category, year, month } = req.query;

    if (year && !YEAR_REGEX.test(year)) {
      return res.status(400).json({
        ok: false,
        error: "Anno non valido: formato richiesto AAAA",
      });
    }

    if (month && !MONTH_REGEX.test(month)) {
      return res.status(400).json({
        ok: false,
        error: "Mese non valido: formato richiesto AAAA-MM",
      });
    }

    const assignments = await findAllAssignments({ category });

    const filtered = assignments.filter((a) => {
      const assignedMonth = a.assigned_at.slice(0, 7);
      if (year && !assignedMonth.startsWith(year)) return false;
      if (month && assignedMonth !== month) return false;
      return true;
    });

    const groups = new Map();
    filtered.forEach((a) => {
      const groupMonth = a.assigned_at.slice(0, 7);
      const groupCategory = a.course?.category || "Senza categoria";
      const key = `${groupMonth}|${groupCategory}`;
      const isExpired = a.status === "assigned" && a.due_date < today();

      const entry = groups.get(key) || {
        month: groupMonth,
        category: groupCategory,
        assigned: 0,
        completed: 0,
        expired: 0,
        cancelled: 0,
      };
      entry.assigned += 1;
      if (a.status === "completed") entry.completed += 1;
      else if (a.status === "cancelled") entry.cancelled += 1;
      else if (isExpired) entry.expired += 1;
      groups.set(key, entry);
    });

    const stats = Array.from(groups.values())
      .map((entry) => ({
        ...entry,
        completionRate: completionRate(entry.completed, entry.assigned),
      }))
      .sort((a, b) =>
        a.month === b.month
          ? a.category.localeCompare(b.category)
          : a.month.localeCompare(b.month),
      );

    const totalAssigned = filtered.length;
    const totalCompleted = filtered.filter((a) => a.status === "completed").length;

    const totals = {
      assigned: totalAssigned,
      completed: totalCompleted,
      completionRate: completionRate(totalCompleted, totalAssigned),
    };

    return res.status(200).json({ ok: true, stats, totals });
  } catch (err) {
    console.error("GET STATS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
