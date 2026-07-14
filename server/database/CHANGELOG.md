# Changelog del database

Registro delle modifiche allo schema, in ordine cronologico e con numero
progressivo. Ogni voce indica: cosa è cambiato, perché, e l'SQL eseguito
su Supabase. Tenere allineati [`schema.sql`](./schema.sql) e
[`schema.md`](./schema.md) a ogni modifica.

---

## #001 — Schema iniziale

Tabella `T_Users` per autenticazione e gestione utenti del template
(uuid PK, email univoca, password bcrypt, flag `isAdmin`, `created_at`).

```sql
create extension if not exists "pgcrypto";

create table if not exists "T_Users" (
    "id"         uuid        primary key default gen_random_uuid(),
    "email"      text        not null unique,
    "password"   text        not null,
    "isAdmin"    boolean     not null default false,
    "created_at" timestamptz not null default now()
);
```

---

## #002 — Nome e cognome su `T_Users`

Aggiunte le colonne `first_name` e `last_name`: la registrazione richiede
nome e cognome obbligatori (requisito standard delle prove d'esame).
Colonne nullable a livello DB per non rompere gli utenti esistenti;
l'obbligatorietà è applicata dai controller (`validateName`).

```sql
alter table "T_Users"
  add column "first_name" text,
  add column "last_name"  text;
```

> ⚠️ Da eseguire manualmente nel SQL Editor di Supabase.

---

## #003 — Prefisso tabelle da `T_` a `E_` (progetto "Academy Aziendale")

Traccia d'esame ITS: gestione corsi Academy e assegnazioni ai dipendenti.
Il progetto adotta il prefisso `E_` al posto del `T_` neutro del template.
Rinominata `T_Users` → `E_Users` (nessuna modifica di colonne). Aggiornata
la costante `TABLE_NAME` in `server/models/user.model.js` e `USERS_TABLE`
in `server/database/seed.js`.

```sql
alter table "T_Users" rename to "E_Users";
```

> ⚠️ Da eseguire manualmente nel SQL Editor di Supabase.

---

## #004 — Nuove tabelle `E_Courses` ed `E_CourseAssignments`

Aggiunte le tabelle di dominio per la traccia "Academy Aziendale":
- `E_Courses`: catalogo corsi (titolo, descrizione, categoria, durata in
  ore, obbligatorio, attivo).
- `E_CourseAssignments`: assegnazione di un corso a un dipendente, con
  stato (`assigned` / `completed` / `expired` / `cancelled`), data di
  assegnazione, scadenza e data di completamento.

Il "ruolo" richiesto dalla traccia per l'Utente **non** è una nuova colonna:
si riusa il booleano `isAdmin` già esistente su `E_Users` (vedi `schema.md`).

```sql
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

create table if not exists "E_CourseAssignments" (
    "id"             uuid        primary key default gen_random_uuid(),
    "course_id"      uuid        not null references "E_Courses" ("id") on delete restrict,
    "employee_id"    uuid        not null references "E_Users" ("id") on delete cascade,
    "assigned_at"    date        not null default current_date,
    "due_date"       date        not null,
    "status"         text        not null default 'assigned'
                       check ("status" in ('assigned', 'completed', 'expired', 'cancelled')),
    "completed_at"   date,
    "created_at"     timestamptz not null default now()
);

create index if not exists "idx_e_assignments_course_id"   on "E_CourseAssignments" ("course_id");
create index if not exists "idx_e_assignments_employee_id" on "E_CourseAssignments" ("employee_id");
create index if not exists "idx_e_assignments_status"      on "E_CourseAssignments" ("status");
```

> ⚠️ Da eseguire manualmente nel SQL Editor di Supabase (dopo #003, perché
> `E_CourseAssignments` referenzia `E_Users`).
