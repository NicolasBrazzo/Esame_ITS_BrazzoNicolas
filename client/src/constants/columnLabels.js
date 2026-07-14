// Label italiane per le intestazioni delle tabelle (DataTable).
// Aggiungere una mappa per ogni nuova risorsa del progetto.
export const USERS_COLUMN_LABELS = {
  id: "ID",
  email: "Email",
  isAdmin: "Ruolo",
  first_name: "Nome",
  last_name: "Cognome",
  created_at: "Creato il",
};

// Corsi. `active` è lo stato del corso (admin), `status` quello dell'assegnazione
// con cui il dipendente vede lo stesso corso nel proprio elenco.
export const COURSES_COLUMN_LABELS = {
  title: "Titolo",
  description: "Descrizione",
  category: "Categoria",
  duration_hours: "Durata (ore)",
  mandatory: "Obbligatorietà",
  active: "Stato",
  status: "Stato",
  assigned_at: "Assegnato il",
  due_date: "Scadenza",
  completed_at: "Completato il",
  created_at: "Creato il",
};

export const ASSIGNMENTS_COLUMN_LABELS = {
  employee_name: "Dipendente",
  employee_email: "Email",
  course_title: "Corso",
  category: "Categoria",
  duration_hours: "Durata (ore)",
  mandatory: "Obbligatorietà",
  assigned_at: "Assegnato il",
  due_date: "Scadenza",
  status: "Stato",
  completed_at: "Completato il",
};
