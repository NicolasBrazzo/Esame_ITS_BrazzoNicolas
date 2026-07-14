import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  UserCog,
  ArrowRight,
  BookOpen,
  Users,
  Trophy,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { fetchUsers } from "../services/userService";
import { fetchCourses } from "../services/courseService";
import { fetchAssignments } from "../services/assignmentService";
import { useFetch } from "../hooks/useFetch";
import { ROLE_LABELS } from "../constants/app";

// Card KPI riusata da tutte le tessere della dashboard (stesso markup che c'era
// già per "Utenti"): icona, numero in evidenza, etichetta e nota facoltativa.
const KpiCard = ({ icon, value, label, description, isLoading, onClick }) => {
  const Icon = icon;
  return (
    <div
      className={`rounded-xl border bg-card p-5 shadow-sm transition-all ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-border/80 group" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Caricamento...</span>
        ) : (
          onClick && (
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )
        )}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
      {description && (
        <p className="mt-3 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Le anagrafiche utenti e il catalogo corsi servono solo agli admin: se non lo
  // è, restituiamo una lista vuota senza chiamare il server.
  const {
    data: users,
    isLoading: loadingUsers,
    error: usersError,
  } = useFetch(
    () => (user?.isAdmin ? fetchUsers() : Promise.resolve([])),
    [user?.isAdmin],
  );

  const {
    data: courses,
    isLoading: loadingCourses,
    error: coursesError,
  } = useFetch(
    () => (user?.isAdmin ? fetchCourses() : Promise.resolve([])),
    [user?.isAdmin],
  );

  // Le assegnazioni bastano per entrambi i ruoli: il backend le restituisce già
  // filtrate (un dipendente vede solo le proprie, un admin le vede tutte).
  const {
    data: assignments,
    isLoading: loadingAssignments,
    error: assignmentsError,
  } = useFetch(() => fetchAssignments(), [user?.isAdmin]);

  if (loading) return <p>loading...</p>;
  if (!user) return <p>Accesso negato</p>;

  const totalUsers = users?.length ?? 0;
  const totalCourses = courses?.length ?? 0;
  const allAssignments = assignments || [];

  // Dipendente: quante assegnazioni sono ancora aperte, quante completate e
  // quante scadute (stato derivato dal backend, non serve ricalcolarlo qui).
  const inProgressCount = allAssignments.filter((a) => a.status === "assigned").length;
  const completedCount = allAssignments.filter((a) => a.status === "completed").length;
  const expiredCount = allAssignments.filter((a) => a.status === "expired").length;

  // Admin: corso con più partecipanti, contando le assegnazioni per corso.
  const participationByCourse = new Map();
  allAssignments.forEach((a) => {
    const courseId = a.course?.id ?? a.course_id;
    if (!courseId) return;
    const entry = participationByCourse.get(courseId) ?? {
      title: a.course?.title || "—",
      count: 0,
    };
    entry.count += 1;
    participationByCourse.set(courseId, entry);
  });
  let mostPopularCourse = null;
  for (const entry of participationByCourse.values()) {
    if (!mostPopularCourse || entry.count > mostPopularCourse.count) {
      mostPopularCourse = entry;
    }
  }

  const dashboardError = usersError || coursesError || assignmentsError;

  return (
    <div className="px-6 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Panoramica generale delle attività del gestionale.
        </p>
        <p className="mt-1 text-sm">
          Utente:{" "}
          <span className="font-medium">
            {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
          </span>
          {user.isAdmin && (
            <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
              {ROLE_LABELS.admin}
            </span>
          )}
        </p>
      </div>

      {dashboardError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-inset ring-destructive/20">
          Si è verificato un errore nel caricamento dei dati della dashboard.
        </div>
      )}

      {user.isAdmin ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={UserCog}
            value={totalUsers}
            label="Utenti"
            description="Gestione degli account con accesso alla piattaforma."
            isLoading={loadingUsers}
            onClick={() => navigate("/users")}
          />
          <KpiCard
            icon={BookOpen}
            value={totalCourses}
            label="Corsi totali"
            description="Corsi presenti nel catalogo dell'academy."
            isLoading={loadingCourses}
            onClick={() => navigate("/courses")}
          />
          <KpiCard
            icon={Users}
            value={allAssignments.length}
            label="Partecipanti ai corsi"
            description="Numero totale di assegnazioni corso-dipendente."
            isLoading={loadingAssignments}
            onClick={() => navigate("/assignments")}
          />
          <KpiCard
            icon={Trophy}
            value={mostPopularCourse?.count ?? 0}
            label={mostPopularCourse?.title ?? "Nessuna assegnazione"}
            description="Corso più popoloso per numero di partecipanti."
            isLoading={loadingAssignments}
            onClick={() => navigate("/assignments")}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={PlayCircle}
            value={inProgressCount}
            label="Corsi in corso"
            description="Corsi assegnati ancora da completare."
            isLoading={loadingAssignments}
            onClick={() => navigate("/courses")}
          />
          <KpiCard
            icon={CheckCircle2}
            value={completedCount}
            label="Corsi completati"
            description="Corsi che hai portato a termine."
            isLoading={loadingAssignments}
            onClick={() => navigate("/courses")}
          />
          <KpiCard
            icon={AlertTriangle}
            value={expiredCount}
            label="Corsi scaduti"
            description="Corsi con scadenza superata e non ancora completati."
            isLoading={loadingAssignments}
            onClick={() => navigate("/courses")}
          />
        </div>
      )}
    </div>
  );
};
