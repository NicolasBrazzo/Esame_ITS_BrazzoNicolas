// La durata di un corso arriva dal form come stringa ("4"): è valida solo se
// rappresenta un numero intero positivo di ore.
const isValidDuration = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;

module.exports = { isValidDuration };
