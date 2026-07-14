# Struttura del Database

Backend dati: **Supabase (PostgreSQL)**. Lo schema reale vive su Supabase; questo
file è la documentazione leggibile (per umani e AI). Il file affiancato
[`schema.sql`](./schema.sql) è la fonte di verità tecnica/ricreabile.

> ⚠️ Documentazione mantenuta a mano. Dopo ogni modifica allo schema su Supabase,
> aggiornare **sia** questo file **sia** `schema.sql`, e registrare la modifica
> in [`CHANGELOG.md`](./CHANGELOG.md) con il numero progressivo (`#001`, `#002`, …).

## Convenzioni

- **Prefisso tabelle**: ogni progetto nato dal template sceglie un proprio
  prefisso (nel template è `T_`, neutro). **In questo progetto (Academy
  Aziendale) il prefisso è `E_`.** Per cambiarlo: rinominare le tabelle su
  Supabase e aggiornare la costante `TABLE_NAME` in ogni file dentro
  `server/models/`.
- **Colonne standard**: ogni nuova tabella include `id uuid` (PK, default
  `gen_random_uuid()`) e `created_at timestamptz` (default `now()`);
  aggiungere `updated_at` se serve tracciare le modifiche.
- **Nomi in inglese**: tabelle e colonne di dominio sono nominate in inglese
  (`E_Courses`, `duration_hours`, …); le stringhe utente-facing restano in
  italiano lato frontend/validazioni.

---

## Diagramma relazioni

```
E_Users ──< E_CourseAssignments >── E_Courses
```

- `E_CourseAssignments.employee_id` → `E_Users.id` (un dipendente può avere più assegnazioni)
- `E_CourseAssignments.course_id` → `E_Courses.id` (un corso può essere assegnato a più dipendenti)

Le tabelle di dominio (Corsi, Assegnazioni) sono state aggiunte per la
traccia d'esame "Academy Aziendale" seguendo la ricetta in
[`../../ADDING_A_RESOURCE.md`](../../ADDING_A_RESOURCE.md).

---

## Tabella: `E_Users`

Utenti che accedono al gestionale. La lista utenti espone solo
`id, email, isAdmin, first_name, last_name, created_at`
(la `password` non viene mai restituita al client).

| Colonna      | Tipo        | Null | Default             | Note                                         |
| ------------ | ----------- | ---- | ------------------- | -------------------------------------------- |
| `id`         | uuid        | NO   | `gen_random_uuid()` | Primary key                                  |
| `email`      | text        | NO   | —                   | Univoca. Usata per login e lookup            |
| `password`   | text        | NO   | —                   | Hash bcrypt — **mai** in chiaro, mai esposta |
| `isAdmin`    | boolean     | NO   | `false`             | Ruolo: `true` = Referente Academy, `false` = Dipendente (etichette in `ROLE_LABELS`, `client/src/constants/app.js`) |
| `first_name` | text        | SÌ*  | —                   | Nome. *Obbligatorio a livello applicativo    |
| `last_name`  | text        | SÌ*  | —                   | Cognome. *Obbligatorio a livello applicativo |
| `created_at` | timestamptz | NO   | `now()`             | Data creazione account                       |

**Vincoli**
- `email` UNIQUE.

**Validazione applicativa**
- `email`: formato email valido.
- `password` (prima dell'hash): min 6 caratteri, almeno 1 maiuscola, 1 numero, 1 carattere speciale.
- `first_name` / `last_name` (`validateName`): obbligatori, min 2 caratteri dopo il trim
  (quindi mai vuoti o solo spazi), solo lettere/spazi/apostrofi/trattini.

> **Nota sul "ruolo"**: la traccia d'esame elenca `ruolo` come campo
> dell'Utente. Si è scelto di **non** aggiungere una colonna testuale
> separata e di riusare il booleano `isAdmin` già previsto dal template
> (stesso pattern di autenticazione/JWT/middleware, zero refactor): il
> "ruolo" esposto in UI è la sua etichetta (`ROLE_LABELS`). Sono ammessi solo
> due ruoli: Dipendente e Referente Academy.

---

## Tabella: `E_Courses`

Corsi del catalogo Academy che possono essere assegnati ai dipendenti.

| Colonna          | Tipo        | Null | Default             | Note                                          |
| ---------------- | ----------- | ---- | -------------------- | ---------------------------------------------- |
| `id`             | uuid        | NO   | `gen_random_uuid()` | Primary key                                    |
| `title`          | text        | NO   | —                    | Titolo del corso                               |
| `description`    | text        | SÌ   | —                    | Descrizione libera                             |
| `category`       | text        | SÌ   | —                    | Categoria (usata come filtro nell'elenco)      |
| `duration_hours` | integer     | NO   | —                    | Durata in ore, deve essere > 0                 |
| `mandatory`      | boolean     | NO   | `false`              | Corso obbligatorio per i dipendenti            |
| `active`         | boolean     | NO   | `true`               | Corso attivo/disabilitato (`PUT /courses/:id/disable` lo porta a `false`) |
| `created_at`     | timestamptz | NO   | `now()`              | Data creazione                                 |

**Vincoli**
- `duration_hours > 0` (CHECK).

**Validazione applicativa**
- `title`: obbligatorio, non vuoto.
- `duration_hours`: intero positivo.
- La disabilitazione (`active = false`) è **soft**: non elimina il corso, per non perdere lo storico delle assegnazioni già create (per questo `E_CourseAssignments.course_id` è `ON DELETE RESTRICT`: un corso con assegnazioni non può essere cancellato, va disabilitato).

**Indici**
- `category`, `active` (campi usati come filtri nell'elenco).

---

## Tabella: `E_CourseAssignments`

Assegnazione di un corso Academy a un dipendente, con stato di avanzamento.

| Colonna        | Tipo        | Null | Default             | Note                                                        |
| -------------- | ----------- | ---- | -------------------- | ------------------------------------------------------------ |
| `id`           | uuid        | NO   | `gen_random_uuid()` | Primary key                                                   |
| `course_id`    | uuid        | NO   | —                    | FK → `E_Courses.id`, `ON DELETE RESTRICT`                     |
| `employee_id`  | uuid        | NO   | —                    | FK → `E_Users.id`, `ON DELETE CASCADE`                        |
| `assigned_at`  | date        | NO   | `current_date`       | Data di assegnazione del corso                                |
| `due_date`     | date        | NO   | —                    | Data di scadenza entro cui completare il corso                |
| `status`       | text        | NO   | `'assigned'`         | Uno tra: `assigned`, `completed`, `expired`, `cancelled` (CHECK) |
| `completed_at` | date        | SÌ   | —                    | Valorizzata solo quando `status = 'completed'`                |
| `created_at`   | timestamptz | NO   | `now()`              | Data creazione della riga (audit)                              |

**Vincoli**
- `status` CHECK IN (`assigned`, `completed`, `expired`, `cancelled`) — corrispondenza con la traccia: assegnato / completato / scaduto / annullato.
- `course_id` → `E_Courses.id` **ON DELETE RESTRICT**: preserva lo storico, un corso con assegnazioni si disabilita (`active = false`) invece di cancellarlo.
- `employee_id` → `E_Users.id` **ON DELETE CASCADE**: se un dipendente viene eliminato, le sue assegnazioni vengono eliminate con lui (evita righe orfane).

**Validazione applicativa (da implementare nel controller)**
- `due_date` non precedente a `assigned_at`.
- `completed_at` valorizzata solo in transizione verso `status = 'completed'`, non precedente a `assigned_at`.
- Transizioni di stato ammesse: `assigned → completed`, `assigned → cancelled`, `assigned → expired`; nessuna transizione da stati finali (`completed`, `expired`, `cancelled`).

**Indici**
- `course_id`, `employee_id`, `status` (lookup e filtri dell'elenco, vedi `FILTERS_BE.md`).

---

## Esempio: aggiungere una tabella di dominio

Traccia da seguire quando il progetto ha bisogno di una nuova risorsa
(esempio: un'anagrafica clienti):

```sql
create table if not exists "E_Clients" (
    "id"         uuid        primary key default gen_random_uuid(),
    "name"       text        not null,
    "email"      text        unique,
    "phone"      text,
    "note"       text,
    "created_at" timestamptz not null default now()
);
```

Checklist:
1. Creare la tabella su Supabase.
2. Aggiungerla a `schema.sql` e documentarla qui (colonne, vincoli, validazioni).
3. Registrare la modifica in `CHANGELOG.md` con il numero progressivo.
4. Se ha stati/enum, preferire un vincolo `CHECK` e documentare i valori validi.
5. Indici sui campi usati per filtri e lookup frequenti.
