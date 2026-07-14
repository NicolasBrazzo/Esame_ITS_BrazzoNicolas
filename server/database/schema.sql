-- =============================================================================
-- Schema del database — Template Gestionale (Supabase / PostgreSQL)
-- =============================================================================
-- Fonte di verità tecnica/ricreabile. La documentazione leggibile è in
-- schema.md (mantenere allineati i due file dopo ogni modifica).
--
-- NOTA: questo file è ricostruito dal codice applicativo (models, controllers,
-- validators), NON esportato da Supabase. Verificare default, nullability e
-- vincoli reali sulla dashboard ed eventualmente correggere qui.
--
-- CONVENZIONE PREFISSO: ogni progetto nato da questo template sceglie un
-- proprio prefisso per le tabelle (nel template è `T_`, neutro). Per
-- cambiarlo: rinominare le tabelle su Supabase e aggiornare la costante
-- TABLE_NAME in ogni file dentro server/models/.
-- In QUESTO progetto (Academy Aziendale) il prefisso scelto è `E_`.
--
-- CONVENZIONE COLONNE: ogni nuova tabella include `created_at` (e, se serve
-- tracciare le modifiche, `updated_at`).
-- =============================================================================

-- Estensione per gen_random_uuid() (di norma già attiva su Supabase)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabella: E_Users
-- -----------------------------------------------------------------------------
create table if not exists "E_Users" (
    "id"         uuid        primary key default gen_random_uuid(),
    "email"      text        not null unique,
    "password"   text        not null,           -- hash bcrypt, mai in chiaro
    "isAdmin"    boolean     not null default false, -- ruolo: true = Referente Academy, false = Dipendente (vedi ROLE_LABELS)
    "first_name" text,                           -- obbligatorio a livello applicativo (validateName)
    "last_name"  text,                           -- obbligatorio a livello applicativo (validateName)
    "created_at" timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabella: E_Courses
-- -----------------------------------------------------------------------------
create table if not exists "E_Courses" (
    "id"             uuid        primary key default gen_random_uuid(),
    "title"          text        not null,
    "description"    text,
    "category"       text,
    "duration_hours" integer     not null check ("duration_hours" > 0),
    "mandatory"      boolean     not null default false,
    "active"         boolean     not null default true,
    "created_at"     timestamptz not null default now()
);

create index if not exists "idx_e_courses_category" on "E_Courses" ("category");
create index if not exists "idx_e_courses_active"   on "E_Courses" ("active");

-- -----------------------------------------------------------------------------
-- Tabella: E_CourseAssignments
-- -----------------------------------------------------------------------------
create table if not exists "E_CourseAssignments" (
    "id"             uuid        primary key default gen_random_uuid(),
    "course_id"      uuid        not null references "E_Courses" ("id") on delete restrict,
    "employee_id"    uuid        not null references "E_Users" ("id") on delete cascade,
    "assigned_at"    date        not null default current_date,
    "due_date"       date        not null,
    "status"         text        not null default 'assigned'
                       check ("status" in ('assigned', 'completed', 'expired', 'cancelled')),
    "completed_at"   date,                        -- valorizzata solo quando status = 'completed'
    "created_at"     timestamptz not null default now()
);

create index if not exists "idx_e_assignments_course_id"   on "E_CourseAssignments" ("course_id");
create index if not exists "idx_e_assignments_employee_id" on "E_CourseAssignments" ("employee_id");
create index if not exists "idx_e_assignments_status"      on "E_CourseAssignments" ("status");
