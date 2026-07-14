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
  titleStart: "La formazione aziendale,",
  titleAccent: "sempre sotto controllo.",
  subtitle:
    "Corsi, scadenze e completamenti dei tuoi dipendenti in un unico registro ordinato. Accedi con il tuo account, o creane uno per iniziare a lavorare.",
  ctaPrimary: "Accedi",
  ctaSecondary: "Crea un account",
  ctaLogged: "Vai alla dashboard",
  features: ["Corsi obbligatori e facoltativi", "Scadenze monitorate", "Statistiche per categoria"],
  // Numeri della mini-dashboard dimostrativa (contenuto decorativo)
  stats: [
    { value: 46, label: "Corsi attivi" },
    { value: 312, label: "Assegnazioni totali" },
    { value: 89, label: "Completati questo mese" },
  ],
  // Righe dimostrative della scheda "registro assegnazioni" (contenuto decorativo)
  ledger: {
    title: "Registro assegnazioni",
    protocol: "Ciclo 2026",
    rows: [
      { time: "09:12", text: "Sicurezza sul lavoro assegnato a Rossi", tag: "Sicurezza" },
      { time: "09:47", text: "Corso GDPR completato", tag: "Compliance" },
      { time: "10:31", text: "Excel avanzato in scadenza", tag: "Digitale" },
      { time: "11:05", text: "Onboarding assegnato a nuovo assunto", tag: "HR" },
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
