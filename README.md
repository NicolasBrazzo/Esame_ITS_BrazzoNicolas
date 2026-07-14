# Academy Aziendale

Gestionale per la formazione aziendale: catalogo corsi, assegnazioni ai
dipendenti con scadenze e stato di completamento, dashboard e statistiche
per categoria/mese. Progetto realizzato a partire da un template
full-stack (auth JWT + gestione utenti) per l'esame ITS.

Monorepo con due pacchetti installati **separatamente**, nessun
`package.json` alla root:

- `client/` — React 19 + Vite + React Router 7 + Tailwind CSS v4 + shadcn/ui
- `server/` — Express REST API + Supabase/PostgreSQL

Le stringhe utente e i commenti nel codice sono in italiano.

## Prerequisiti

- **Node.js 22.x** (vedi `server/package.json` → `engines`) e npm
- Un progetto **Supabase** attivo (URL + chiave API), oppure accesso a
  quello già usato per il deploy d'esame

## 1. Clona il repository

```bash
git clone <url-del-repo>
cd Esame_ITS_BrazzoNicolas
```

## 2. Configura il database su Supabase

1. Crea un progetto su [supabase.com](https://supabase.com) (o usa uno
   esistente).
2. Apri **SQL Editor** e lancia per intero
   [`server/database/schema.sql`](server/database/schema.sql): crea le
   tabelle `E_Users`, `E_Courses`, `E_CourseAssignments` con i relativi
   indici.
3. Recupera **Project URL** e **API key** da Project Settings → API:
   serviranno al passo successivo.

> Lo schema effettivo è ricostruito a mano da codice (non esportato da
> Supabase): la cronologia delle modifiche è in
> [`server/database/CHANGELOG.md`](server/database/CHANGELOG.md), la
> documentazione leggibile in
> [`server/database/schema.md`](server/database/schema.md).

## 3. Configura le variabili d'ambiente

Copia i file di esempio e compilali:

```bash
# server
cd server
cp .env.example .env
```

`server/.env`:

| Variabile      | Note                                                        |
| -------------- | ------------------------------------------------------------ |
| `PORT`         | porta locale del server, es. `3000`                          |
| `SUPABASE_URL` | URL del progetto Supabase (passo 2)                          |
| `SUPABASE_KEY` | API key del progetto Supabase (passo 2)                      |
| `JWT_SECRET`   | **obbligatoria** — il server non si avvia se manca           |
| `NODE_ENV`     | `development` in locale                                      |
| `FRONTEND_URL` | origin CORS, es. `http://localhost:5173` in locale            |

```bash
# client
cd ../client
cp .env.example .env
```

`client/.env`:

| Variabile       | Note                                              |
| --------------- | -------------------------------------------------- |
| `VITE_API_URL`  | base URL del backend, es. `http://localhost:3000`  |

## 4. Installa le dipendenze

Da lanciare **in entrambe** le cartelle:

```bash
cd server && npm install
cd ../client && npm install
```

## 5. Popola il database (seed)

```bash
cd server
npm run seed
```

È idempotente (rieseguibile senza duplicati): crea utenti di test, un
catalogo corsi di esempio e alcune assegnazioni già in vari stati, utili
per popolare da subito dashboard e statistiche.

Credenziali create dal seed:

| Email              | Password     | Ruolo                |
| ------------------ | ------------ | --------------------- |
| `admin@test.it`     | `Admin123!`  | Referente Academy (admin) |
| `utente@test.it`    | `Utente123!` | Dipendente            |
| `utente2@test.it`   | `Utente123!` | Dipendente            |

## 6. Avvia il progetto in locale

In due terminali separati:

```bash
# terminale 1 — backend (nodemon, auto-reload)
cd server
npm run dev
```

```bash
# terminale 2 — frontend (Vite dev server)
cd client
npm run dev
```

Il client parte di default su `http://localhost:5173`, il server sulla
`PORT` indicata in `server/.env`. Verifica che il backend risponda su
`GET /health` → `{"status":"ok"}`.

## Comandi disponibili

**`server/`**

- `npm run dev` — nodemon (auto-reload) su `server.js`
- `npm start` — avvio semplice (`node server.js`)
- `npm run seed` — popola/aggiorna il database (vedi sopra)

**`client/`**

- `npm run dev` — Vite dev server
- `npm run build` — build di produzione
- `npm run lint` — ESLint
- `npm run preview` — serve la build già compilata

Non è presente una suite di test in nessuno dei due pacchetti.

## Documentazione di riferimento

- [`server/ENDPOINTS.md`](server/ENDPOINTS.md) — tutte le rotte
  dell'API (più la collection Postman
  [`server/postman_collection.json`](server/postman_collection.json))
- [`server/FILTERS_BE.md`](server/FILTERS_BE.md) — convenzioni per i
  filtri via query string sugli endpoint di elenco
- [`server/database/schema.md`](server/database/schema.md) /
  [`schema.sql`](server/database/schema.sql) /
  [`CHANGELOG.md`](server/database/CHANGELOG.md) — modello dati
- [`ADDING_A_RESOURCE.md`](ADDING_A_RESOURCE.md) — come aggiungere una
  nuova risorsa (tabella + endpoint + pagina)
- [`DEPLOY.md`](DEPLOY.md) — procedura di deploy (Railway + Vercel) e
  URL del deploy d'esame già online
