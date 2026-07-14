import { useMemo, useState } from "react";

import Loader from "../components/Loader";
import Modal from "@/components/Modal";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { useMutation } from "../hooks/useMutation";
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  disableCourse,
} from "../services/courseService";
import { fetchAssignments, completeAssignment } from "../services/assignmentService";
import { COURSES_COLUMN_LABELS } from "../constants/columnLabels";
import {
  ASSIGNMENT_STATUS_LABELS,
  COURSE_STATUS_LABELS,
  MANDATORY_LABELS,
} from "../constants/app";
import { showSuccess, showError } from "../utils/toast";
import { formatDate } from "../utils/formatters";
import { STATUS_BADGE_VARIANTS } from "../constants/Courses";

// Un corso assegnato resta da fare finché l'assegnazione non è chiusa: 'expired'
// è solo una scadenza passata, quindi il corso si può ancora completare (in ritardo).
const isCompletable = (status) => status === "assigned" || status === "expired";

const StatusBadge = ({ status }) => (
  <Badge variant={STATUS_BADGE_VARIANTS[status] || "muted"}>
    {ASSIGNMENT_STATUS_LABELS[status] || status}
  </Badge>
);

const MandatoryBadge = ({ mandatory }) => (
  <Badge variant={mandatory ? "warning" : "muted"}>
    {mandatory ? MANDATORY_LABELS.true : MANDATORY_LABELS.false}
  </Badge>
);

const ActiveBadge = ({ active }) => (
  <Badge variant={active ? "success" : "muted"}>
    {active ? COURSE_STATUS_LABELS.active : COURSE_STATUS_LABELS.inactive}
  </Badge>
);

// Dettaglio di sola lettura, condiviso dalle due modali "view details"
const DetailList = ({ rows }) => (
  <dl className="space-y-3">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium text-right">{value || "—"}</dd>
      </div>
    ))}
  </dl>
);

const CourseForm = ({ initialData, onSubmit, error }) => {
  const [formState, setFormState] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    duration_hours: initialData?.duration_hours ?? "",
    mandatory: initialData?.mandatory ?? false,
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">{COURSES_COLUMN_LABELS.title}</Label>
        <Input
          id="title"
          type="text"
          name="title"
          value={formState.title}
          onChange={handleChange}
          placeholder="Sicurezza sul lavoro D.Lgs 81/08"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">{COURSES_COLUMN_LABELS.description}</Label>
        <Textarea
          id="description"
          name="description"
          value={formState.description}
          onChange={handleChange}
          placeholder="Contenuti e obiettivi del corso"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">{COURSES_COLUMN_LABELS.category}</Label>
          <Input
            id="category"
            type="text"
            name="category"
            value={formState.category}
            onChange={handleChange}
            placeholder="Compliance"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration_hours">{COURSES_COLUMN_LABELS.duration_hours}</Label>
          <Input
            id="duration_hours"
            type="number"
            min="1"
            step="1"
            name="duration_hours"
            value={formState.duration_hours}
            onChange={handleChange}
            placeholder="4"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-input px-3 py-2.5">
        <input
          type="checkbox"
          id="mandatory"
          name="mandatory"
          checked={!!formState.mandatory}
          onChange={handleChange}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <Label htmlFor="mandatory" className="cursor-pointer">
          {MANDATORY_LABELS.true}
        </Label>
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      <div className="flex justify-end space-x-2 pt-1">
        <Button type="submit" size="sm">
          Salva
        </Button>
      </div>
    </form>
  );
};

const buildAdminColumns = (onView) => [
  {
    key: "title",
    label: COURSES_COLUMN_LABELS.title,
    sortable: true,
    onClick: onView,
  },
  {
    key: "category",
    label: COURSES_COLUMN_LABELS.category,
    sortable: true,
    render: (course) => course.category || "—",
  },
  {
    key: "duration_hours",
    label: COURSES_COLUMN_LABELS.duration_hours,
    sortable: true,
    sortType: "number",
  },
  {
    key: "mandatory",
    label: COURSES_COLUMN_LABELS.mandatory,
    sortable: true,
    sortType: "boolean",
    render: (course) => <MandatoryBadge mandatory={course.mandatory} />,
  },
  {
    key: "active",
    label: COURSES_COLUMN_LABELS.active,
    sortable: true,
    sortType: "boolean",
    render: (course) => <ActiveBadge active={course.active} />,
  },
];

// Vista del referente academy: catalogo completo, con CRUD e disattivazione.
const AdminCoursesView = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const {
    data: courses,
    isLoading,
    error,
    refetch,
  } = useFetch(() => fetchCourses(), []);

  const {
    mutate: saveCourse,
    error: saveError,
    reset: resetSaveError,
  } = useMutation(
    (formData) => {
      const title = formData.title.trim();
      const hours = Number(formData.duration_hours);

      if (title.length < 2 || title.length > 200) {
        throw new Error("Il titolo deve contenere tra 2 e 200 caratteri");
      }
      if (!Number.isInteger(hours) || hours <= 0) {
        throw new Error("La durata deve essere un numero intero positivo di ore");
      }

      const payload = {
        title,
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        duration_hours: hours,
        mandatory: !!formData.mandatory,
      };

      return editingItem
        ? updateCourse(editingItem.id, payload)
        : createCourse(payload);
    },
    {
      onSuccess: () => {
        showSuccess(
          editingItem ? "Corso aggiornato con successo" : "Corso creato con successo",
        );
        refetch();
        setIsModalOpen(false);
        setEditingItem(null);
      },
    },
  );

  const { mutate: removeCourse } = useMutation((courseId) => deleteCourse(courseId), {
    onSuccess: () => {
      showSuccess("Corso eliminato con successo");
      refetch();
    },
    // Il backend blocca l'eliminazione di un corso con assegnazioni collegate (409)
    // e invita a disattivarlo: il messaggio va letto, quindi resta a video più a lungo.
    onError: (message) => showError(message, { autoClose: 6000 }),
  });

  const { mutate: disableExistingCourse } = useMutation(
    (courseId) => disableCourse(courseId),
    {
      onSuccess: () => {
        showSuccess("Corso disattivato");
        refetch();
        setViewingItem(null);
      },
      onError: (message) => showError(message),
    },
  );

  const handleDelete = async (course) => {
    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare il corso "${course.title}"?`,
    );
    if (!confirmDelete) return;

    try {
      await removeCourse(course.id);
    } catch {
      // errore gestito dall'hook (toast in onError)
    }
  };

  const handleDisable = async (course) => {
    const confirmDisable = window.confirm(
      `Disattivare il corso "${course.title}"? Non sarà più assegnabile, ma resterà nello storico.`,
    );
    if (!confirmDisable) return;

    try {
      await disableExistingCourse(course.id);
    } catch {
      // errore gestito dall'hook (toast in onError)
    }
  };

  const handleSubmit = async (formData) => {
    try {
      await saveCourse(formData);
    } catch {
      // errore gestito dall'hook (stato `saveError`)
    }
  };

  const hasCourses = courses && courses.length > 0;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Corsi</h1>
          <p className="text-sm text-muted-foreground">
            Crea, modifica e disattiva i corsi dell'academy
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            resetSaveError();
            setIsModalOpen(true);
          }}
        >
          Aggiungi corso
        </Button>
      </div>

      {isLoading && <Loader />}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Errore: {error}
        </div>
      )}

      {hasCourses && (
        <DataTable
          columns={buildAdminColumns((course) => setViewingItem(course))}
          data={courses}
          actions={{
            onEdit: (course) => {
              setEditingItem(course);
              resetSaveError();
              setIsModalOpen(true);
            },
            onDelete: handleDelete,
          }}
        />
      )}

      {!isLoading && !error && !hasCourses && (
        <p className="text-sm text-muted-foreground">
          Nessun corso presente nel database.
        </p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          resetSaveError();
        }}
        title={editingItem ? "Modifica corso" : "Nuovo corso"}
      >
        <CourseForm
          initialData={editingItem}
          onSubmit={handleSubmit}
          error={saveError}
        />
      </Modal>

      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Dettaglio corso"
      >
        {viewingItem && (
          <div className="space-y-5">
            <DetailList
              rows={[
                [COURSES_COLUMN_LABELS.title, viewingItem.title],
                [COURSES_COLUMN_LABELS.description, viewingItem.description],
                [COURSES_COLUMN_LABELS.category, viewingItem.category],
                [COURSES_COLUMN_LABELS.duration_hours, viewingItem.duration_hours],
                [
                  COURSES_COLUMN_LABELS.mandatory,
                  <MandatoryBadge key="mandatory" mandatory={viewingItem.mandatory} />,
                ],
                [
                  COURSES_COLUMN_LABELS.active,
                  <ActiveBadge key="active" active={viewingItem.active} />,
                ],
                [COURSES_COLUMN_LABELS.created_at, formatDate(viewingItem.created_at)],
              ]}
            />

            {viewingItem.active && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisable(viewingItem)}
                >
                  Disattiva corso
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const buildEmployeeColumns = (onView, onComplete) => [
  {
    key: "title",
    label: COURSES_COLUMN_LABELS.title,
    sortable: true,
    onClick: onView,
  },
  {
    key: "category",
    label: COURSES_COLUMN_LABELS.category,
    sortable: true,
    render: (row) => row.category || "—",
  },
  {
    key: "duration_hours",
    label: COURSES_COLUMN_LABELS.duration_hours,
    sortable: true,
    sortType: "number",
  },
  {
    key: "mandatory",
    label: COURSES_COLUMN_LABELS.mandatory,
    sortable: true,
    sortType: "boolean",
    render: (row) => <MandatoryBadge mandatory={row.mandatory} />,
  },
  {
    key: "status",
    label: COURSES_COLUMN_LABELS.status,
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "due_date",
    label: COURSES_COLUMN_LABELS.due_date,
    sortable: true,
    sortType: "date",
    render: (row) => formatDate(row.due_date),
  },
  {
    // DataTable espone solo onEdit/onDelete: "Completa" è una colonna con render custom.
    key: "complete",
    label: "Azioni",
    render: (row) =>
      isCompletable(row.status) ? (
        <Button size="sm" variant="outline" onClick={() => onComplete(row)}>
          Completa
        </Button>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

// Vista del dipendente: i corsi assegnati a lui, con stato e scadenza.
const EmployeeCoursesView = () => {
  const [filters, setFilters] = useState({ status: "", category: "", due_month: "" });
  const [viewingItem, setViewingItem] = useState(null);

  // Servono due letture: le assegnazioni portano stato e scadenza, ma il corso
  // annidato al loro interno non include la descrizione, che arriva da /courses
  // (per un dipendente: l'elenco dei soli corsi a lui assegnati).
  const { data: courses } = useFetch(() => fetchCourses(), []);
  const {
    data: assignments,
    isLoading,
    error,
    refetch,
  } = useFetch(() => fetchAssignments(filters), [filters]);

  const rows = useMemo(() => {
    const descriptionByCourseId = new Map(
      (courses || []).map((course) => [course.id, course.description]),
    );

    return (assignments || []).map((assignment) => ({
      // La chiave di riga è l'id dell'assegnazione, non del corso: lo stesso corso
      // può essere riassegnato e comparire su più righe.
      id: assignment.id,
      title: assignment.course?.title,
      description: descriptionByCourseId.get(assignment.course_id) || "",
      category: assignment.course?.category,
      duration_hours: assignment.course?.duration_hours,
      mandatory: assignment.course?.mandatory,
      status: assignment.status,
      assigned_at: assignment.assigned_at,
      due_date: assignment.due_date,
      completed_at: assignment.completed_at,
    }));
  }, [assignments, courses]);

  const categoryOptions = useMemo(() => {
    const categories = [
      ...new Set((courses || []).map((course) => course.category).filter(Boolean)),
    ].sort();
    return categories.map((category) => ({ value: category, label: category }));
  }, [courses]);

  const filterConfig = useMemo(
    () => [
      {
        key: "status",
        label: COURSES_COLUMN_LABELS.status,
        type: "select",
        options: Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
      {
        key: "category",
        label: COURSES_COLUMN_LABELS.category,
        type: "select",
        options: categoryOptions,
      },
      { key: "due_month", label: "Mese di scadenza", type: "month" },
    ],
    [categoryOptions],
  );

  const { mutate: markAsCompleted } = useMutation(
    (assignmentId) => completeAssignment(assignmentId),
    {
      onSuccess: () => {
        showSuccess("Corso segnato come completato");
        refetch();
        setViewingItem(null);
      },
      onError: (message) => showError(message),
    },
  );

  const handleComplete = async (row) => {
    const confirmComplete = window.confirm(
      `Segnare il corso "${row.title}" come completato?`,
    );
    if (!confirmComplete) return;

    try {
      await markAsCompleted(row.id);
    } catch {
      // errore gestito dall'hook (toast in onError)
    }
  };

  const hasRows = rows.length > 0;

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">I miei corsi</h1>
        <p className="text-sm text-muted-foreground">
          I corsi che ti sono stati assegnati: consulta il dettaglio e segna quelli che
          hai completato
        </p>
      </div>

      <FilterBar filters={filterConfig} values={filters} onChange={setFilters} />

      {isLoading && <Loader />}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Errore: {error}
        </div>
      )}

      {hasRows && (
        <DataTable
          columns={buildEmployeeColumns((row) => setViewingItem(row), handleComplete)}
          data={rows}
        />
      )}

      {!isLoading && !error && !hasRows && (
        <p className="text-sm text-muted-foreground">
          Nessun corso trovato con i filtri selezionati.
        </p>
      )}

      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Dettaglio corso"
      >
        {viewingItem && (
          <div className="space-y-5">
            <DetailList
              rows={[
                [COURSES_COLUMN_LABELS.title, viewingItem.title],
                [COURSES_COLUMN_LABELS.description, viewingItem.description],
                [COURSES_COLUMN_LABELS.category, viewingItem.category],
                [COURSES_COLUMN_LABELS.duration_hours, viewingItem.duration_hours],
                [
                  COURSES_COLUMN_LABELS.mandatory,
                  <MandatoryBadge key="mandatory" mandatory={viewingItem.mandatory} />,
                ],
                [
                  COURSES_COLUMN_LABELS.status,
                  <StatusBadge key="status" status={viewingItem.status} />,
                ],
                [COURSES_COLUMN_LABELS.assigned_at, formatDate(viewingItem.assigned_at)],
                [COURSES_COLUMN_LABELS.due_date, formatDate(viewingItem.due_date)],
                [
                  COURSES_COLUMN_LABELS.completed_at,
                  formatDate(viewingItem.completed_at),
                ],
              ]}
            />

            {isCompletable(viewingItem.status) && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button size="sm" onClick={() => handleComplete(viewingItem)}>
                  Segna come completato
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export const Courses = () => {
  const { user } = useAuth();

  // Una sola rotta, due esperienze: il referente academy gestisce il catalogo, il
  // dipendente vede solo i corsi assegnati a lui (visibilità garantita dal backend,
  // non solo dalla UI).
  return user?.isAdmin ? <AdminCoursesView /> : <EmployeeCoursesView />;
};
