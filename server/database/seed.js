// =============================================================================
// Seed del database — dati iniziali e credenziali di test
// =============================================================================
// Esecuzione:  npm run seed  (da dentro server/)
//
// Idempotente: utenti via upsert su email; corsi e assegnazioni via
// find-or-create (niente vincolo unique a livello DB su title/coppie, quindi
// niente onConflict), quindi può essere rilanciato senza creare duplicati.
// Punta al database configurato in .env (SUPABASE_URL / SUPABASE_KEY), quindi
// funziona sia in locale sia per popolare il DB usato dal deploy.
//
// Le credenziali qui sotto sono quelle da consegnare come "utenti di test".
// =============================================================================

require("dotenv").config();
const bcrypt = require("bcrypt");
const supabase = require("../config/db_connection");

// Non importiamo config/jwt.js (fail-fast su JWT_SECRET, qui non serve)
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

const USERS_TABLE = "E_Users";
const COURSES_TABLE = "E_Courses";
const ASSIGNMENTS_TABLE = "E_CourseAssignments";

// Utenti di test: 1 admin + 2 utenti ordinari (due servono a dimostrare le
// regole di visibilità: ogni utente vede solo i propri dati di dominio).
// Password conformi a validatePassword (min 6 char, maiuscola, numero, speciale).
const SEED_USERS = [
  {
    email: "admin@test.it",
    password: "Admin123!",
    isAdmin: true,
    first_name: "Anna",
    last_name: "Amministratore",
  },
  {
    email: "utente@test.it",
    password: "Utente123!",
    isAdmin: false,
    first_name: "Ugo",
    last_name: "Utente",
  },
  {
    email: "utente2@test.it",
    password: "Utente123!",
    isAdmin: false,
    first_name: "Vera",
    last_name: "Utente",
  },
];

// Catalogo corsi di esempio, per categoria (coerenti con quelle già usate
// nell'app: vedi client/src/constants/app.js → HOME.ledger).
const SEED_COURSES = [
  {
    title: "Sicurezza sul lavoro (D.Lgs. 81/08)",
    description: "Formazione generale e specifica sulla sicurezza nei luoghi di lavoro.",
    category: "Sicurezza",
    duration_hours: 8,
    mandatory: true,
  },
  {
    title: "Antincendio e primo soccorso",
    description: "Procedure di evacuazione, uso degli estintori e nozioni di primo soccorso.",
    category: "Sicurezza",
    duration_hours: 4,
    mandatory: true,
  },
  {
    title: "GDPR e protezione dei dati",
    description: "Trattamento dei dati personali e adempimenti privacy per i dipendenti.",
    category: "Compliance",
    duration_hours: 3,
    mandatory: true,
  },
  {
    title: "Codice Etico e Anticorruzione",
    description: "Principi del modello organizzativo 231 e del codice etico aziendale.",
    category: "Compliance",
    duration_hours: 2,
    mandatory: true,
  },
  {
    title: "Excel avanzato",
    description: "Tabelle pivot, funzioni annidate e reportistica per l'ufficio.",
    category: "Digitale",
    duration_hours: 12,
    mandatory: false,
  },
  {
    title: "Cybersecurity per dipendenti",
    description: "Riconoscere phishing e minacce informatiche nell'uso quotidiano del PC.",
    category: "Digitale",
    duration_hours: 4,
    mandatory: true,
  },
  {
    title: "Onboarding nuovi assunti",
    description: "Percorso introduttivo su organizzazione, strumenti e procedure interne.",
    category: "HR",
    duration_hours: 6,
    mandatory: true,
  },
  {
    title: "Comunicazione efficace e teamwork",
    description: "Tecniche di comunicazione e collaborazione in team di lavoro.",
    category: "Soft skills",
    duration_hours: 5,
    mandatory: false,
  },
  {
    title: "Project management essentials",
    description: "Pianificazione, milestone e gestione delle priorità di un progetto.",
    category: "Soft skills",
    duration_hours: 10,
    mandatory: false,
  },
  {
    title: "Public speaking",
    description: "Tecniche di presentazione efficace in pubblico e in riunione.",
    category: "Soft skills",
    duration_hours: 4,
    mandatory: false,
  },
];

// Assegnazioni di esempio: riferimento ai corsi/utenti per email/title, così
// da non dipendere da uuid fissi. Copre tutti gli stati (assigned aperto,
// assigned scaduto → letto come "expired", completed, cancelled) e più mesi,
// utile per popolare Dashboard e Statistiche con dati non banali.
const SEED_ASSIGNMENTS = [
  { courseTitle: "Sicurezza sul lavoro (D.Lgs. 81/08)", employeeEmail: "utente@test.it", assigned_at: "2026-05-01", due_date: "2026-06-01", completed_at: "2026-05-20" },
  { courseTitle: "Sicurezza sul lavoro (D.Lgs. 81/08)", employeeEmail: "utente2@test.it", assigned_at: "2026-05-01", due_date: "2026-06-01", completed_at: "2026-05-25" },
  { courseTitle: "Antincendio e primo soccorso", employeeEmail: "utente@test.it", assigned_at: "2026-06-01", due_date: "2026-07-01" }, // scaduto (assigned, due_date passata)
  { courseTitle: "Antincendio e primo soccorso", employeeEmail: "utente2@test.it", assigned_at: "2026-06-01", due_date: "2026-08-01" }, // ancora aperto
  { courseTitle: "GDPR e protezione dei dati", employeeEmail: "utente@test.it", assigned_at: "2026-04-10", due_date: "2026-05-10", completed_at: "2026-05-05" },
  { courseTitle: "GDPR e protezione dei dati", employeeEmail: "utente2@test.it", assigned_at: "2026-06-15", due_date: "2026-07-30" }, // ancora aperto
  { courseTitle: "Codice Etico e Anticorruzione", employeeEmail: "utente@test.it", assigned_at: "2026-03-01", due_date: "2026-04-01" }, // scaduto da tempo
  { courseTitle: "Excel avanzato", employeeEmail: "utente2@test.it", assigned_at: "2026-06-20", due_date: "2026-08-20" }, // ancora aperto
  { courseTitle: "Cybersecurity per dipendenti", employeeEmail: "utente@test.it", assigned_at: "2026-07-01", due_date: "2026-07-20" }, // ancora aperto, in scadenza
  { courseTitle: "Onboarding nuovi assunti", employeeEmail: "utente2@test.it", assigned_at: "2026-02-01", due_date: "2026-02-15", completed_at: "2026-02-10" },
  { courseTitle: "Comunicazione efficace e teamwork", employeeEmail: "utente@test.it", assigned_at: "2026-05-15", due_date: "2026-06-15", status: "cancelled" },
  { courseTitle: "Project management essentials", employeeEmail: "utente2@test.it", assigned_at: "2026-04-01", due_date: "2026-05-01", status: "cancelled" },
];

const seedUsers = async () => {
  const emailToId = {};

  for (const user of SEED_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .upsert(
        {
          email: user.email,
          password: hashedPassword,
          isAdmin: user.isAdmin,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        { onConflict: "email" }
      )
      .select("id, email")
      .single();

    if (error) {
      console.error(`✗ Errore su ${user.email}:`, error.message);
      process.exitCode = 1;
    } else {
      emailToId[user.email] = data.id;
      console.log(
        `✓ ${user.email} (${user.isAdmin ? "admin" : "utente"}) — password: ${user.password}`
      );
    }
  }

  return emailToId;
};

// Nessun vincolo unique su "title" a livello DB: idempotenza a mano
// (cerca per titolo, crea solo se manca) invece di upsert/onConflict.
const seedCourses = async () => {
  const titleToId = {};

  for (const course of SEED_COURSES) {
    const { data: existing, error: findError } = await supabase
      .from(COURSES_TABLE)
      .select("id")
      .eq("title", course.title)
      .maybeSingle();

    if (findError) {
      console.error(`✗ Errore ricerca corso "${course.title}":`, findError.message);
      process.exitCode = 1;
      continue;
    }

    if (existing) {
      titleToId[course.title] = existing.id;
      console.log(`= ${course.title} (già presente)`);
      continue;
    }

    const { data, error } = await supabase
      .from(COURSES_TABLE)
      .insert({
        title: course.title,
        description: course.description,
        category: course.category,
        duration_hours: course.duration_hours,
        mandatory: course.mandatory,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`✗ Errore su corso "${course.title}":`, error.message);
      process.exitCode = 1;
    } else {
      titleToId[course.title] = data.id;
      console.log(`✓ ${course.title} (${course.category}, ${course.duration_hours}h)`);
    }
  }

  return titleToId;
};

// Idempotenza a mano: se esiste già un'assegnazione per quella coppia
// corso/dipendente (creata da un run precedente del seed) non la riaggiunge.
const seedAssignments = async (titleToId, emailToId) => {
  for (const item of SEED_ASSIGNMENTS) {
    const course_id = titleToId[item.courseTitle];
    const employee_id = emailToId[item.employeeEmail];

    if (!course_id || !employee_id) {
      console.error(`✗ Corso o dipendente non trovato per l'assegnazione "${item.courseTitle}" → ${item.employeeEmail}`);
      process.exitCode = 1;
      continue;
    }

    const { data: existing, error: findError } = await supabase
      .from(ASSIGNMENTS_TABLE)
      .select("id")
      .eq("course_id", course_id)
      .eq("employee_id", employee_id)
      .maybeSingle();

    if (findError) {
      console.error(`✗ Errore ricerca assegnazione "${item.courseTitle}" → ${item.employeeEmail}:`, findError.message);
      process.exitCode = 1;
      continue;
    }

    if (existing) {
      console.log(`= ${item.courseTitle} → ${item.employeeEmail} (già presente)`);
      continue;
    }

    const status = item.status || (item.completed_at ? "completed" : "assigned");

    const { error } = await supabase.from(ASSIGNMENTS_TABLE).insert({
      course_id,
      employee_id,
      assigned_at: item.assigned_at,
      due_date: item.due_date,
      status,
      completed_at: item.completed_at || null,
    });

    if (error) {
      console.error(`✗ Errore su assegnazione "${item.courseTitle}" → ${item.employeeEmail}:`, error.message);
      process.exitCode = 1;
    } else {
      console.log(`✓ ${item.courseTitle} → ${item.employeeEmail} (${status})`);
    }
  }
};

const main = async () => {
  console.log("Seed del database in corso...\n");
  const emailToId = await seedUsers();
  console.log("\nCorsi:");
  const titleToId = await seedCourses();
  console.log("\nAssegnazioni:");
  await seedAssignments(titleToId, emailToId);
  console.log("\nSeed completato. Credenziali di test pronte per la consegna.");
};

main().catch((err) => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
