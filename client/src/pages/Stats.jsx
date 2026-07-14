import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ListChecks, CheckCircle2, Percent } from "lucide-react";

import Loader from "../components/Loader";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { fetchStats } from "../services/statsService";
import { fetchCourses } from "../services/courseService";
import { STATS_COLUMN_LABELS } from "../constants/columnLabels";
import { MONTH_LABELS } from "../constants/app";

const CURRENT_YEAR = new Date().getFullYear();
    
// Stessa finestra di 5 anni (2 indietro, 2 avanti) usata dai filtri di scadenza in Courses.jsx.
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const year = String(CURRENT_YEAR - 2 + i);
  return { value: year, label: year };
});

const MONTH_OPTIONS = Object.entries(MONTH_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const formatMonth = (month) => {
  if (!month) return "—";
  const [year, mm] = month.split("-");
  return `${MONTH_LABELS[mm] || mm} ${year}`;
};

const KpiTile = ({ icon, value, label }) => {
  const Icon = icon;
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

// Grafico a barre: assegnati vs completati per mese, aggregando le categorie
// visibili con i filtri correnti. Niente libreria di grafici: barre in CSS,
// coerenti con le card della dashboard (bg-card, stessi raggi/ombre).
const MonthlyBarChart = ({ rows }) => {
  const byMonth = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const entry = map.get(row.month) || { month: row.month, assigned: 0, completed: 0 };
      entry.assigned += row.assigned;
      entry.completed += row.completed;
      map.set(row.month, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [rows]);

  const maxValue = Math.max(1, ...byMonth.map((m) => Math.max(m.assigned, m.completed)));

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Assegnati vs completati per mese</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Assegnati
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-green-500" /> Completati
          </span>
        </div>
      </div>

      <div className="flex items-end gap-4 overflow-x-auto pb-1">
        {byMonth.map((m) => (
          <div key={m.month} className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="flex items-end gap-0.5" style={{ height: 128 }}>
              <div
                className="w-4 rounded-t bg-blue-500"
                style={{ height: `${Math.max(2, (m.assigned / maxValue) * 128)}px` }}
                title={`Assegnati: ${m.assigned}`}
              />
              <div
                className="w-4 rounded-t bg-green-500"
                style={{ height: `${Math.max(2, (m.completed / maxValue) * 128)}px` }}
                title={`Completati: ${m.completed}`}
              />
            </div>
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {formatMonth(m.month)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Barra orizzontale del tasso di completamento per categoria: misura singola,
// quindi niente legenda (il titolo del grafico basta già a identificarla).
const CategoryCompletionChart = ({ rows }) => {
  const byCategory = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const entry = map.get(row.category) || {
        category: row.category,
        assigned: 0,
        completed: 0,
      };
      entry.assigned += row.assigned;
      entry.completed += row.completed;
      map.set(row.category, entry);
    });
    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        rate: entry.assigned > 0 ? Math.round((entry.completed / entry.assigned) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [rows]);

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">% di completamento per categoria</h3>
      <div className="space-y-3">
        {byCategory.map((c) => (
          <div key={c.category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{c.category}</span>
              <span className="text-muted-foreground">
                {c.rate}% ({c.completed}/{c.assigned})
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-blue-100">
              <div
                className="h-2.5 rounded-full bg-blue-500"
                style={{ width: `${c.rate}%` }}
                title={`${c.rate}%`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const buildColumns = () => [
  {
    key: "month",
    label: STATS_COLUMN_LABELS.month,
    sortable: true,
    render: (row) => formatMonth(row.month),
  },
  { key: "category", label: STATS_COLUMN_LABELS.category, sortable: true },
  {
    key: "assigned",
    label: STATS_COLUMN_LABELS.assigned,
    sortable: true,
    sortType: "number",
  },
  {
    key: "completed",
    label: STATS_COLUMN_LABELS.completed,
    sortable: true,
    sortType: "number",
  },
  {
    key: "expired",
    label: STATS_COLUMN_LABELS.expired,
    sortable: true,
    sortType: "number",
  },
  {
    key: "cancelled",
    label: STATS_COLUMN_LABELS.cancelled,
    sortable: true,
    sortType: "number",
  },
  {
    key: "completionRate",
    label: STATS_COLUMN_LABELS.completionRate,
    sortable: true,
    sortType: "number",
    render: (row) => `${row.completionRate}%`,
  },
];

const StatsView = () => {
  const [filters, setFilters] = useState({ category: "", year: "", month: "" });

  // Un mese senza anno non individua un intervallo: se l'anno manca si assume
  // quello corrente (stesso comportamento del filtro scadenza in Courses.jsx).
  const handleFilterChange = (next) =>
    setFilters(next.month && !next.year ? { ...next, year: String(CURRENT_YEAR) } : next);

  // I due select vengono ricomposti nel filtro atteso dal backend: anno + mese
  // diventano `month` (AAAA-MM), il solo anno diventa `year`.
  const query = useMemo(() => {
    const { category, year, month } = filters;
    if (year && month) return { category, month: `${year}-${month}` };
    if (year) return { category, year };
    return { category };
  }, [filters]);

  const { data: courses } = useFetch(() => fetchCourses(), []);
  const { data, isLoading, error } = useFetch(() => fetchStats(query), [query]);

  const rows = data?.stats || [];
  const totals = data?.totals || { assigned: 0, completed: 0, completionRate: 0 };
  const hasRows = rows.length > 0;

  const categoryOptions = useMemo(() => {
    const categories = [
      ...new Set((courses || []).map((course) => course.category).filter(Boolean)),
    ].sort();
    return categories.map((category) => ({ value: category, label: category }));
  }, [courses]);

  const filterConfig = useMemo(
    () => [
      {
        key: "category",
        label: STATS_COLUMN_LABELS.category,
        type: "select",
        options: categoryOptions,
      },
      { key: "year", label: "Anno", type: "select", options: YEAR_OPTIONS },
      { key: "month", label: "Mese", type: "select", options: MONTH_OPTIONS },
    ],
    [categoryOptions],
  );

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Statistiche</h1>
        <p className="text-sm text-muted-foreground">
          Riepilogo dei corsi assegnati e completati per mese e categoria.
        </p>
      </div>

      <FilterBar filters={filterConfig} values={filters} onChange={handleFilterChange} />

      {isLoading && <Loader />}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Errore: {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiTile icon={ListChecks} value={totals.assigned} label="Corsi assegnati" />
            <KpiTile icon={CheckCircle2} value={totals.completed} label="Corsi completati" />
            <KpiTile
              icon={Percent}
              value={`${totals.completionRate}%`}
              label="Percentuale di completamento"
            />
          </div>

          {hasRows && (
            <div className="grid gap-4 lg:grid-cols-2">
              <MonthlyBarChart rows={rows} />
              <CategoryCompletionChart rows={rows} />
            </div>
          )}

          {hasRows ? (
            <DataTable
              columns={buildColumns()}
              data={rows.map((row) => ({ ...row, id: `${row.month}-${row.category}` }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessun dato disponibile con i filtri selezionati.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export const Stats = () => {
  const { user } = useAuth();

  if (user && !user.isAdmin) return <Navigate to="/dashboard" replace />;

  return <StatsView />;
};
