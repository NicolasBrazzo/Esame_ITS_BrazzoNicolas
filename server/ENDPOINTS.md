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
- `POST /courses` — Crea un nuovo corso. **Solo admin.**
- `PUT /courses/:id` — Aggiorna un corso. **Solo admin.** `404` se il corso non esiste.
- `DELETE /courses/:id` — Elimina un corso. **Solo admin.** `404` se il corso non esiste, `409` se il corso ha assegnazioni collegate (usare `/disable` in quel caso).
- `PUT /courses/:id/disable` — Disabilitazione di un corso (soft delete, `active = false`). **Solo admin.** `404` se il corso non esiste, `400` se già disabilitato.

---

## Assignment — `/assignments`

Tutte le rotte richiedono autenticazione **e privilegi di amministratore** (`isAdmin: true`).

- `GET /assignment` — Elenco di tutte le assegnazioni con filtri.
- `GET /assignment/:id` — Singola assegnazione per ID.
- `POST /assignment` — Crea una nuova assegnazione.
- `PUT /assignment/:id` — Aggiorna un'assegnazione.
- `DELETE /assignment/:id` — Elimina un'assegnazione.
- `PUT /assignment/:id/complete` - Completamento di un'assegnazione
- `PUT /assignment/:id/cancel` - Annullamento di un'assegnazione

---

## Stats - `/stats`

Tutte le rotte richiedono autenticazione **e privilegi di amministratore** (`isAdmin: true`).

- `GET /stats` - Con tutti i filtri.

## Utility

- `GET /health` — Health check del server. **Pubblica.**
