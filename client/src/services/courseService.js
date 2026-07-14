import api from "../api/client";

// GET /courses non accetta filtri: un admin riceve tutti i corsi,
// un dipendente solo quelli a lui assegnati (filtro applicato dal backend).
export const fetchCourses = async () => {
  try {
    const res = await api.get("/courses");
    return res.data.courses;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const fetchCourseById = async (id) => {
  try {
    const res = await api.get(`/courses/${id}`);
    return res.data.course;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createCourse = async (payload) => {
  try {
    const res = await api.post("/courses", payload);
    return res.data.course;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const updateCourse = async (id, payload) => {
  try {
    const res = await api.put(`/courses/${id}`, payload);
    return res.data.course;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const deleteCourse = async (id) => {
  try {
    const res = await api.delete(`/courses/${id}`);
    return res.data.course;
  } catch (err) {
    throw new Error(err.message);
  }
};

// Soft delete: il corso resta a sistema con active = false.
// Da usare quando l'eliminazione è bloccata dalle assegnazioni collegate (409).
export const disableCourse = async (id) => {
  try {
    const res = await api.put(`/courses/${id}/disable`);
    return res.data.course;
  } catch (err) {
    throw new Error(err.message);
  }
};
