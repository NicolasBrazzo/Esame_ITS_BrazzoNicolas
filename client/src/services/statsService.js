import api from "../api/client";

// Filtri supportati: category, year (AAAA), month (AAAA-MM, si interseca con year).
// I filtri vuoti non vanno inviati (convenzione in server/FILTERS_BE.md).
export const fetchStats = async (filters = {}) => {
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ""),
    );
    const res = await api.get("/stats", { params });
    return { stats: res.data.stats, totals: res.data.totals };
  } catch (err) {
    throw new Error(err.message);
  }
};
