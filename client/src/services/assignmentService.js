import api from "../api/client";

// Filtri supportati: status, category, course_id, employee_id (solo admin), due_month.
// I filtri vuoti non vanno inviati (convenzione in server/FILTERS_BE.md).
export const fetchAssignments = async (filters = {}) => {
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ""),
    );
    const res = await api.get("/assignments", { params });
    return res.data.assignments;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const fetchAssignmentById = async (id) => {
  try {
    const res = await api.get(`/assignments/${id}`);
    return res.data.assignment;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createAssignment = async (payload) => {
  try {
    const res = await api.post("/assignments", payload);
    return res.data.assignment;
  } catch (err) {
    throw new Error(err.message);
  }
};

// Il body deve sempre includere assigned_at: se manca, il backend lo riporta a oggi.
export const updateAssignment = async (id, payload) => {
  try {
    const res = await api.put(`/assignments/${id}`, payload);
    return res.data.assignment;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const deleteAssignment = async (id) => {
  try {
    const res = await api.delete(`/assignments/${id}`);
    return res.data.assignment;
  } catch (err) {
    throw new Error(err.message);
  }
};

// assigned -> completed. Un dipendente può completare solo le proprie assegnazioni.
export const completeAssignment = async (id) => {
  try {
    const res = await api.put(`/assignments/${id}/complete`);
    return res.data.assignment;
  } catch (err) {
    throw new Error(err.message);
  }
};

// assigned -> cancelled. Solo admin.
export const cancelAssignment = async (id) => {
  try {
    const res = await api.put(`/assignments/${id}/cancel`);
    return res.data.assignment;
  } catch (err) {
    throw new Error(err.message);
  }
};
