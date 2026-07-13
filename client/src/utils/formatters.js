// Formattazione centralizzata per la visualizzazione (locale italiana).
// Usare questi helper in tabelle e dettagli, senza riformattare inline.

/** 1234.5 → "1.234,50 €" (— se il valore manca) */
export const formatCurrency = (value) =>
  value == null || value === ""
    ? "—"
    : new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(value);

/** ISO/timestamp → "13/07/2026" (— se il valore manca) */
export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("it-IT") : "—";
