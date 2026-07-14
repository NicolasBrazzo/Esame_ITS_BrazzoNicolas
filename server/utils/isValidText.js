// I campi testuali di un corso non sono nomi di persona: titoli e descrizioni
// contengono cifre e punteggiatura ("Excel 2024", "Sicurezza D.Lgs 81/08"),
// quindi si validano sulla lunghezza e non con validateName.
const isValidText = (value, min, max) =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max;

module.exports = { isValidText };
