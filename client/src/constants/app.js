// Identità dell'app: personalizzare qui (e solo qui) per ogni progetto
// nato dal template. Usato da Sidebar, Login, Register.
// Ricordarsi anche del <title> in index.html.
export const APP_NAME = "Academy Aziendale";
export const APP_LOGO = "🏫";

export const ROLE_LABELS = {
  admin: "Referente Academy",
  user: "Dipendente",
};

// Stati di un'assegnazione. `expired` non è mai scritto sul DB: il backend lo
// deriva in lettura da un'assegnazione ancora aperta con la scadenza passata.
export const ASSIGNMENT_STATUS_LABELS = {
  assigned: "Assegnato",
  completed: "Completato",
  expired: "Scaduto",
  cancelled: "Annullato",
};

// Stato di un corso (E_Courses.active): la disattivazione è un soft delete.
export const COURSE_STATUS_LABELS = {
  active: "Attivo",
  inactive: "Disattivato",
};

export const MANDATORY_LABELS = {
  true: "Obbligatorio",
  false: "Facoltativo",
};

// Mesi per i filtri sulle date: la chiave è il mese a due cifre, come nel
// formato AAAA-MM che il backend si aspetta.
export const MONTH_LABELS = {
  "01": "Gennaio",
  "02": "Febbraio",
  "03": "Marzo",
  "04": "Aprile",
  "05": "Maggio",
  "06": "Giugno",
  "07": "Luglio",
  "08": "Agosto",
  "09": "Settembre",
  // Le chiavi restano stringhe (anche 10-12): una chiave numerica verrebbe
  // enumerata per prima e sfalserebbe l'ordine dei mesi.
  "10": "Ottobre",
  "11": "Novembre",
  "12": "Dicembre",
};

// Contenuti della hero pubblica (HomePage, rotta "/").
// Il titolo è composto da titleStart + titleAccent: la parte "accent" riceve
// la sottolineatura animata. Personalizzare per dominio, ad esempio (rimborsi):
// titleStart: "Ogni rimborso", titleAccent: "al suo posto."
// La pagina usa i token shadcn condivisi; i font display/dati sono
// --font-display e --font-data in index.css.
export const HOME = {
  // eyebrow: "Gestione operativa",
  titleStart: "La formazione",
  titleAccent: "di una vera Accademy",
  subtitle:
    "Utenti, ruoli e attività di ogni giorno in un unico registro ordinato. Accedi con il tuo account, o creane uno per iniziare a lavorare.",
  ctaPrimary: "Accedi",
  ctaSecondary: "Crea un account",
  ctaLogged: "Vai alla dashboard",
  features: ["Autenticazione JWT", "Ruoli e permessi", "API documentate"],
  // Numeri della mini-dashboard dimostrativa (contenuto decorativo)
  stats: [
    { value: 128, label: "Utenti attivi" },
    { value: 342, label: "Attività oggi" },
    { value: 27, label: "Report generati" },
  ],
  // Righe dimostrative della scheda "registro attività" (contenuto decorativo)
  ledger: {
    title: "Registro attività",
    protocol: "Prot. 2026/014",
    rows: [
      { time: "09:12", text: "Nuovo utente registrato", tag: "Utenti" },
      { time: "09:47", text: "Anagrafica aggiornata", tag: "Archivio" },
      { time: "10:31", text: "Permessi modificati", tag: "Ruoli" },
      { time: "11:05", text: "Report mensile esportato", tag: "Report" },
    ],
  },
};

// Contenuti della pagina 404 (rotta catch-all "*", NotFound).
// Il bottone secondario riusa i CTA di HOME (ctaLogged/ctaPrimary).
export const NOT_FOUND = {
  code: "404",
  title: "Pagina non trovata",
  subtitle:
    "La pagina che cerchi non esiste o è stata spostata. Torna alla home per riprendere da dove eri.",
  ctaHome: "Torna alla home",
};
