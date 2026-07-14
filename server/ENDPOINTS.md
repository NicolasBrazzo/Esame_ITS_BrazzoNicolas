# API Endpoints

Documentazione delle rotte del backend Express.

> Questo file è il riferimento di ogni rotta del backend: se aggiungi, rimuovi
> o modifichi un endpoint, aggiorna questo file nella stessa modifica.

## Test delle API con Postman

Nel repo è committata la collection [`postman_collection.json`](./postman_collection.json)
(Postman → File → Import). Contiene tutte le rotte con la variabile `{{baseUrl}}`
(default `http://localhost:3000` — per il deploy sostituirla con il dominio del
backend) e `{{token}}`, valorizzata automaticamente dopo Login/Register.
Se aggiungi o modifichi un endpoint, aggiorna anche la collection.

## Credenziali di test (seed)

Utenti creati da `npm run seed` (da dentro `server/`; idempotente, rieseguibile):

| Email | Password | Ruolo |
|-------|----------|-------|
| `admin@test.it` | `Admin123!` | Amministratore |
| `utente@test.it` | `Utente123!` | Utente ordinario |
| `utente2@test.it` | `Utente123!` | Utente ordinario |

> Due utenti ordinari servono a dimostrare le regole di visibilità
> (ogni utente vede solo i propri dati nelle risorse di dominio).

## Convenzioni generali

- **Base URL**: definito dalla porta del server (`PORT`, default `3000`). Es. `http://localhost:3000`.
- **Formato**: tutte le richieste e risposte usano JSON (`Content-Type: application/json`).
- **Formato risposta**: ogni risposta ha la forma `{ "ok": true, ... }` in caso di successo, oppure `{ "ok": false, "error": <string | string[]> }` in caso di errore.
- **Autenticazione**: le rotte protette richiedono l'header `Authorization: Bearer <token>`. Il token JWT si ottiene tramite `POST /auth/login` o `POST /auth/register`.
- **Autorizzazione admin**: alcune rotte (tutte sotto `/users`) richiedono che l'utente autenticato abbia `isAdmin: true` (middleware `isAdmin` in `middleware/isAdmin.js`, da usare dopo `protect`).

### Errori comuni di autenticazione

| Codice | Quando |
|--------|--------|
| `401 Non autenticato` | Header `Authorization` assente o non nel formato `Bearer <token>` |
| `401 Token non valido o scaduto` | Token JWT non verificabile o scaduto |
| `403 Accesso non autorizzato` | Rotta admin richiesta da un utente non admin |
| `404 Rotta non trovata` | Endpoint inesistente |
| `500 Errore interno del server` | Errore non gestito lato server |

---

## Auth — `/auth`

- `POST /auth/login` — Autenticazione utente. **Pubblica.**
- `POST /auth/register` — Registrazione pubblica. **Pubblica.**
- `GET /auth/me` — Dati dell'utente autenticato (dal token). **Protetta.**
- `POST /auth/logout` — Logout stateless (invalidazione del token a carico del client). **Pubblica.**

> ⚠️ **Attenzione** (`POST /auth/register`): la rotta accetta `isAdmin` senza
> alcun vincolo, quindi chiunque può registrarsi come amministratore. Scelta
> voluta per il template (comodità in sviluppo/demo): nei progetti derivati va
> protetta (es. codice di registrazione, whitelist, o rimozione del campo).

---

## Users — `/users`

Tutte le rotte richiedono autenticazione **e privilegi di amministratore** (`isAdmin: true`).

- `GET /users` — Elenco di tutti gli utenti.
- `GET /users/:id` — Singolo utente per ID.
- `POST /users` — Crea un nuovo utente.
- `PUT /users/:id` — Aggiorna un utente (`password` opzionale; un admin non può rimuovere i propri privilegi). `404` se l'utente non esiste, `409` se l'email è già usata da un altro utente.
- `DELETE /users/:id` — Elimina un utente. `404` se l'utente non esiste.

---

## Courses — `/courses`

- `GET /courses` — Elenco corsi. **Protetta** (qualsiasi utente autenticato): un admin vede tutti i corsi, un dipendente vede solo i corsi a lui assegnati (tramite `E_CourseAssignments`).
- `GET /courses/:id` — Singolo corso per ID. **Protetta**: stessa regola di visibilità di sopra; `404` se il corso non esiste, `403` se un dipendente richiede un corso non assegnato a lui.
- `POST /courses` — Crea un nuovo corso. **Solo admin.** Body: `title` (2–200 caratteri), `category` (2–100 caratteri), `duration_hours` (intero positivo) e `mandatory` (booleano) obbligatori; `description` (2–1000 caratteri) opzionale. `active` non si passa nel body: nasce `true` e si spegne solo con `/disable`.
  - `400` se un campo obbligatorio manca o non rispetta i limiti di lunghezza, o se `duration_hours` non è un intero positivo.
  - `409` se il titolo è già in uso.
- `PUT /courses/:id` — Aggiorna un corso. **Solo admin.** Stesso body e stesse validazioni della creazione. `404` se il corso non esiste, `409` se il titolo è già usato da un altro corso.
- `DELETE /courses/:id` — Elimina un corso. **Solo admin.** `404` se il corso non esiste, `409` se il corso ha assegnazioni collegate (usare `/disable` in quel caso).
- `PUT /courses/:id/disable` — Disabilitazione di un corso (soft delete, `active = false`). **Solo admin.** `404` se il corso non esiste, `400` se già disabilitato.

---

## Assignment — `/assignments`

Tutte le rotte richiedono autenticazione. Le rotte di gestione (creazione, modifica, eliminazione, annullamento) richiedono anche privilegi di amministratore (`isAdmin: true`). Lettura e completamento sono accessibili anche ai dipendenti, ma **solo sulle proprie assegnazioni**.

**Ciclo di vita** — un'assegnazione nasce `assigned`; da lì passa a `completed` (via `/complete`) o `cancelled` (via `/cancel`). `completed` e `cancelled` sono stati **finali**: un'assegnazione chiusa non si modifica e non cambia più stato (`409`).

**`expired` è uno stato derivato, non persistito.** Sul DB una scadenza passata resta `assigned`: è la lettura (`GET /assignments` e `GET /assignments/:id`) che restituisce `status: "expired"` quando l'assegnazione è ancora `assigned` e `due_date` è precedente a oggi. Di conseguenza un corso scaduto **resta completabile e annullabile** (si può finire un corso in ritardo), e i filtri `status=assigned` / `status=expired` sono complementari: il primo restituisce solo le assegnazioni aperte e non ancora scadute.

- `GET /assignments` — Elenco assegnazioni. **Protetta** (qualsiasi utente autenticato): un admin vede tutte le assegnazioni, un dipendente vede solo le proprie. Ogni riga include il corso (`course`) e il dipendente (`employee`) collegati.

  Filtri opzionali in query string (convenzioni in [`FILTERS_BE.md`](./FILTERS_BE.md)):

  | Parametro     | Esempio      | Note                                                                                                   |
  | ------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
  | `status`      | `assigned`   | Whitelist: `assigned`, `completed`, `expired`, `cancelled`. Valore fuori whitelist → `400`. `assigned` esclude le scadute, `expired` restituisce solo quelle. |
  | `category`    | `Compliance` | Categoria del corso collegato (`E_Courses.category`).                                                   |
  | `course_id`   | uuid         | Corso collegato. Uuid malformato → `400`.                                                               |
  | `employee_id` | uuid         | **Solo admin**: per un dipendente il filtro viene ignorato e forzato al proprio id. Uuid malformato → `400`. |
  | `due_month`   | `2026-07`    | Mese di scadenza (`due_date` dentro il mese indicato). Formato diverso da `AAAA-MM` → `400`.            |

  Esempio: `GET /assignments?status=expired&category=Compliance&due_month=2026-07`

- `GET /assignments/:id` — Singola assegnazione per ID. **Protetta**: stessa regola di visibilità dell'elenco; `404` se non esiste, `403` se un dipendente richiede un'assegnazione non sua.
- `POST /assignments` — Crea una nuova assegnazione. **Solo admin.** Body: `course_id`, `employee_id`, `due_date` obbligatori; `assigned_at` opzionale (default: oggi). Lo stato iniziale è sempre `assigned`: non si passa nel body.
  - `400` se un uuid o una data è malformata, se `due_date` precede `assigned_at`, se il corso o il dipendente non esistono, o se il corso è disabilitato (`active = false`).
  - `409` se quel corso è già assegnato a quel dipendente ed è ancora aperto (stato `assigned`). Le assegnazioni chiuse restano nello storico e non bloccano una nuova assegnazione dello stesso corso.
- `PUT /assignments/:id` — Aggiorna corso, dipendente e date di un'assegnazione. **Solo admin.** Stesso body e stesse validazioni della creazione. Lo **stato non è modificabile** da qui: si cambia solo con `/complete` e `/cancel`. `404` se non esiste, `409` se l'assegnazione è già chiusa.
- `DELETE /assignments/:id` — Elimina un'assegnazione. **Solo admin.** `404` se non esiste.
- `PUT /assignments/:id/complete` — Completamento di un'assegnazione (`assigned → completed`). **Protetta**: un admin completa qualsiasi assegnazione, un dipendente solo le proprie (`403` altrimenti). Body: `completed_at` opzionale (default: oggi). `404` se non esiste, `409` se l'assegnazione è già chiusa, `400` se `completed_at` è malformata o precede `assigned_at`.
- `PUT /assignments/:id/cancel` — Annullamento di un'assegnazione (`assigned → cancelled`). **Solo admin.** `404` se non esiste, `409` se l'assegnazione è già chiusa.

---

## Stats - `/stats`

Tutte le rotte richiedono autenticazione **e privilegi di amministratore** (`isAdmin: true`).

- `GET /stats` - Con tutti i filtri.

## Utility

- `GET /health` — Health check del server. **Pubblica.**
