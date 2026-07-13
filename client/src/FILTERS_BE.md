# FILTERS_BE.md — Convenzioni per API di elenco con filtri

Questo file definisce lo standard con cui implementare gli endpoint di elenco (*list*) con filtri nel backend. Stack di riferimento: **Node.js + Express**, database **Supabase** (client `supabase-js`).

Quando questo file viene referenziato (es. *"crea l'API con i filtri, usa @FILTERS_BE.md"*), l'endpoint **DEVE** rispettare tutte le regole seguenti: contratto dei parametri, forma della risposta, implementazione e gestione dei casi limite.

---

## 1. Principio

Un endpoint di elenco accetta filtri **opzionali** nella *query string* dell'URL (è una `GET`, quindi niente body). Un filtro assente non viene applicato; senza nessun filtro l'endpoint restituisce tutte le righe visibili all'utente.

L'ordinamento interattivo (click sulle intestazioni) è gestito **lato client** da `DataTable`: il backend si limita a restituire le righe in un ordine stabile.

Esempio di richiesta completa:

```http
GET /richieste?stato=aperta&mese=2026-07
```

---

## 2. Contratto dei parametri (query string)

Ogni filtro è **opzionale** e arriva sempre come **stringa**. Esempi tipici:

| Parametro | Esempio      | Come si applica                                          |
|-----------|--------------|----------------------------------------------------------|
| `stato`   | `aperta`     | `.eq('stato', valore)` — valore validato contro whitelist |
| `user_id` | uuid         | `.eq('user_id', valore)`                                  |
| `mese`    | `2026-07`    | intervallo di date sul mese (vedi implementazione)        |
| ricerca   | `mario`      | `.ilike('campo', %valore%)` — case-insensitive            |

### Regole obbligatorie

- Applicare un filtro **solo se il parametro è presente** nella query string.
- I valori a insieme chiuso (es. `stato`) vanno validati contro una **whitelist** nel controller: valore non ammesso → `400` con errore in italiano.
- L'`.order()` deve esserci **sempre** (tipicamente `created_at` discendente): senza un ordinamento stabile l'elenco può cambiare ordine tra una chiamata e l'altra.
- **Regole di visibilità prima dei filtri**: se l'utente non-admin può vedere solo le proprie righe, il controller forza `user_id = req.user.sub` a prescindere dai filtri richiesti. Il filtro `user_id` scelto liberamente è riservato all'admin.

---

## 3. Forma della risposta (OBBLIGATORIA)

La risposta segue la convenzione del template: `{ ok: true, ... }` in successo, `{ ok: false, error }` in errore.

```json
{
  "ok": true,
  "richieste": [ /* array delle righe che soddisfano i filtri */ ]
}
```

- Nessun risultato → `200` con array vuoto, **non** un errore.
- Il codice di stato HTTP viaggia nella risposta HTTP (`res.status(...)`), **mai** dentro il body JSON.

---

## 4. Implementazione di riferimento

Rispetta la separazione del template: il **model** costruisce la query Supabase, il **controller** valida e risponde.

### Model (`models/<risorsa>.model.js`)

```js
// Ogni filtro viene applicato solo se presente
const findAllRichieste = async (filters = {}) => {
  let query = supabase
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.stato) query = query.eq("stato", filters.stato);
  if (filters.user_id) query = query.eq("user_id", filters.user_id);

  if (filters.mese) {
    // mese = "YYYY-MM" → dal 1° del mese (incluso) al 1° del mese dopo (escluso)
    const [anno, mm] = filters.mese.split("-").map(Number);
    const inizio = `${filters.mese}-01`;
    const fine =
      mm === 12
        ? `${anno + 1}-01-01`
        : `${anno}-${String(mm + 1).padStart(2, "0")}-01`;
    query = query.gte("data", inizio).lt("data", fine);
  }

  const { data, error } = await query;
  if (error) throw new Error("DATABASE_FIND_ERROR");
  return data;
};
```

### Controller (`controllers/<risorsa>.controller.js`)

```js
const STATI_VALIDI = ["aperta", "chiusa"]; // whitelist del progetto

router.get("/", protect, async (req, res) => {
  try {
    const { stato, mese, user_id } = req.query;

    // Whitelist sui valori a insieme chiuso
    if (stato && !STATI_VALIDI.includes(stato)) {
      return res.status(400).json({ ok: false, error: "Stato non valido" });
    }

    // Visibilità: il non-admin vede solo le proprie righe,
    // l'admin può filtrare per utente (o vedere tutto)
    const filters = { stato, mese };
    filters.user_id = req.user.isAdmin ? user_id : req.user.sub;

    const richieste = await findAllRichieste(filters);
    return res.status(200).json({ ok: true, richieste });
  } catch (err) {
    console.error("GET ALL RICHIESTE ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});
```

### Note sull'implementazione Supabase

- I filtri (`.eq`, `.gte`, `.lt`, `.ilike`, ecc.) usano parametri gestiti dal client Supabase, quindi non c'è rischio di SQL injection concatenando stringhe.
- Il filtro mese usa `gte` + `lt` (primo giorno del mese successivo **escluso**): funziona per qualunque mese senza contare i giorni.

---

## 5. Lato frontend

Il giro completo usa pezzi già presenti nel template: `FilterBar` (barra filtri config-driven) + `useFetch` con i filtri nelle deps + service che passa i filtri come query params.

```jsx
// Nella pagina
const FILTERS = [
  { key: "stato", label: "Stato", options: [{ value: "aperta", label: "Aperta" }, ...] },
  { key: "mese", label: "Mese", type: "month" },
];

const [filters, setFilters] = useState({ stato: "", mese: "" });

// Al cambio di un filtro, useFetch rilancia la chiamata da solo (deps)
const { data, isLoading, error } = useFetch(() => fetchRichieste(filters), [filters]);

<FilterBar filters={FILTERS} values={filters} onChange={setFilters} />
```

```js
// Nel service: stringa vuota = filtro non attivo, quindi va rimossa
export const fetchRichieste = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ""),
  );
  const res = await api.get("/richieste", { params });
  return res.data.richieste;
};
```

---

## 6. Casi limite da gestire

- Nessun filtro nella query string → tutte le righe visibili all'utente.
- Valore fuori whitelist (es. `stato=xyz`) → `400` con `{ ok: false, error }`.
- Nessuna riga soddisfa i filtri → `200` con array vuoto.
- Errore del database → `500` con `{ ok: false, error }`.

---

## 7. Checklist di conformità

Un endpoint è conforme a questo standard se:

- [ ] Tutti i filtri sono opzionali e viaggiano nella query string.
- [ ] Ogni filtro è applicato solo se presente.
- [ ] I valori a insieme chiuso sono validati contro una whitelist nel controller.
- [ ] Le regole di visibilità (non-admin → solo proprie righe) sono forzate nel controller, prima dei filtri richiesti.
- [ ] Ordina sempre i risultati (`.order(...)`).
- [ ] Restituisce `{ ok: true, <risorsa>: [...] }`; lista vuota → `200` con array vuoto.
- [ ] Codice di stato nell'HTTP, mai nel body.
- [ ] Errori DB → `500` con `{ ok: false, error }`.
