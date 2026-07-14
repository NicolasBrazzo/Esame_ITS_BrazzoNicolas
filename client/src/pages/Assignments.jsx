import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import Loader from "../components/Loader";
import Modal from "@/components/Modal";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { useMutation } from "../hooks/useMutation";
import {
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  cancelAssignment,
} from "../services/assignmentService";
import { fetchCourses } from "../services/courseService";
import { fetchUsers } from "../services/userService";
import { ASSIGNMENTS_COLUMN_LABELS } from "../constants/columnLabels";
import { ASSIGNMENT_STATUS_LABELS, MANDATORY_LABELS } from "../constants/app";
import { showSuccess, showError } from "../utils/toast";
import { formatDate } from "../utils/formatters";

const STATUS_BADGE_VARIANTS = {
  assigned: "info",
  completed: "success",
  expired: "destructive",
  cancelled: "muted",
};

// Un'assegnazione si modifica/annulla solo finché è aperta sul DB. 'expired' è
// derivato da una scadenza passata: quelle righe restano aperte e quindi gestibili.
const isOpen = (status) => status === "assigned" || status === "expired";

const today = () => new Date().toISOString().slice(0, 10);

const fullName = (employee) =>
  employee ? `${employee.last_name} ${employee.first_name}` : "—";

const StatusBadge = ({ status }) => (
  <Badge variant={STATUS_BADGE_VARIANTS[status] || "muted"}>
    {ASSIGNMENT_STATUS_LABELS[status] || status}
  </Badge>
);

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

const AssignmentForm = ({ initialData, courses, employees, onSubmit, error }) => {
  const [formState, setFormState] = useState({
    course_id: initialData?.course_id || "",
    employee_id: initialData?.employee_id || "",
    assigned_at: initialData?.assigned_at || today(),
    due_date: initialData?.due_date || "",
  });

  // Un corso disattivato non è assegnabile (il backend risponde 400): resta in elenco
  // solo se è quello già collegato all'assegnazione che si sta modificando.
  const selectableCourses = (courses || []).filter(
    (course) => course.active || course.id === initialData?.course_id,
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="course_id">{ASSIGNMENTS_COLUMN_LABELS.course_title}</Label>
        <Select
          id="course_id"
          name="course_id"
          value={formState.course_id}
          onChange={handleChange}
          required
        >
          <option value="">Seleziona un corso</option>
          {selectableCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
              {course.active ? "" : " (disattivato)"}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="employee_id">{ASSIGNMENTS_COLUMN_LABELS.employee_name}</Label>
        <Select
          id="employee_id"
          name="employee_id"
          value={formState.employee_id}
          onChange={handleChange}
          required
        >
          <option value="">Seleziona un dipendente</option>
          {(employees || []).map((employee) => (
            <option key={employee.id} value={employee.id}>
              {fullName(employee)} — {employee.email}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="assigned_at">{ASSIGNMENTS_COLUMN_LABELS.assigned_at}</Label>
          <Input
            id="assigned_at"
            type="date"
            name="assigned_at"
            value={formState.assigned_at}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">{ASSIGNMENTS_COLUMN_LABELS.due_date}</Label>
          <Input
            id="due_date"
            type="date"
            name="due_date"
            value={formState.due_date}
            onChange={handleChange}
            required
          />
        </div>
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

const buildColumns = (onView) => [
  {
    key: "employee_name",
    label: ASSIGNMENTS_COLUMN_LABELS.employee_name,
    sortable: true,
  },
  {
    key: "course_title",
    label: ASSIGNMENTS_COLUMN_LABELS.course_title,
    sortable: true,
    onClick: onView,
  },
  {
    key: "category",
    label: ASSIGNMENTS_COLUMN_LABELS.category,
    sortable: true,
    render: (row) => row.category || "—",
  },
  {
    key: "assigned_at",
    label: ASSIGNMENTS_COLUMN_LABELS.assigned_at,
    sortable: true,
    sortType: "date",
    render: (row) => formatDate(row.assigned_at),
  },
  {
    key: "due_date",
    label: ASSIGNMENTS_COLUMN_LABELS.due_date,
    sortable: true,
    sortType: "date",
    render: (row) => formatDate(row.due_date),
  },
  {
    key: "status",
    label: ASSIGNMENTS_COLUMN_LABELS.status,
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const AssignmentsView = () => {
  const [filters, setFilters] = useState({
    employee_id: "",
    course_id: "",
    category: "",
    status: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const {
    data: assignments,
    isLoading,
    error,
    refetch,
  } = useFetch(() => fetchAssignments(filters), [filters]);

  // Corsi e utenti alimentano le select dei filtri e del form
  const { data: courses } = useFetch(() => fetchCourses(), []);
  const { data: users } = useFetch(() => fetchUsers(), []);

  const employees = useMemo(
    () => (users || []).filter((u) => !u.isAdmin),
    [users],
  );

  // sortByField ordina su item[key] e non entra negli oggetti annidati:
  // corso e dipendente vanno appiattiti prima di passare i dati a DataTable.
  const rows = useMemo(
    () =>
      (assignments || []).map((assignment) => ({
        ...assignment,
        employee_name: fullName(assignment.employee),
        employee_email: assignment.employee?.email,
        course_title: assignment.course?.title,
        category: assignment.course?.category,
        duration_hours: assignment.course?.duration_hours,
        mandatory: assignment.course?.mandatory,
      })),
    [assignments],
  );

  const filterConfig = useMemo(() => {
    const categories = [
      ...new Set((courses || []).map((course) => course.category).filter(Boolean)),
    ].sort();

    return [
      {
        key: "employee_id",
        label: ASSIGNMENTS_COLUMN_LABELS.employee_name,
        type: "select",
        options: employees.map((employee) => ({
          value: employee.id,
          label: fullName(employee),
        })),
      },
      {
        key: "course_id",
        label: ASSIGNMENTS_COLUMN_LABELS.course_title,
        type: "select",
        options: (courses || []).map((course) => ({
          value: course.id,
          label: course.title,
        })),
      },
      {
        key: "category",
        label: ASSIGNMENTS_COLUMN_LABELS.category,
        type: "select",
        options: categories.map((category) => ({ value: category, label: category })),
      },
      {
        key: "status",
        label: ASSIGNMENTS_COLUMN_LABELS.status,
        type: "select",
        options: Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
    ];
  }, [courses, employees]);

  const {
    mutate: saveAssignment,
    error: saveError,
    reset: resetSaveError,
  } = useMutation(
    (formData) => {
      if (!formData.course_id || !formData.employee_id) {
        throw new Error("Corso e dipendente sono obbligatori");
      }
      if (!formData.assigned_at || !formData.due_date) {
        throw new Error("Data di assegnazione e data di scadenza sono obbligatorie");
      }
      if (formData.due_date < formData.assigned_at) {
        throw new Error(
          "La data di scadenza non può precedere la data di assegnazione",
        );
      }

      // assigned_at va sempre rispedito: se manca nel body, il backend lo riporta a oggi.
      const payload = {
        course_id: formData.course_id,
        employee_id: formData.employee_id,
        assigned_at: formData.assigned_at,
        due_date: formData.due_date,
      };

      return editingItem
        ? updateAssignment(editingItem.id, payload)
        : createAssignment(payload);
    },
    {
      onSuccess: () => {
        showSuccess(
          editingItem
            ? "Assegnazione aggiornata con successo"
            : "Corso assegnato con successo",
        );
        refetch();
        setIsModalOpen(false);
        setEditingItem(null);
      },
    },
  );

  const { mutate: removeAssignment } = useMutation(
    (assignmentId) => deleteAssignment(assignmentId),
    {
      onSuccess: () => {
        showSuccess("Assegnazione eliminata con successo");
        refetch();
      },
      onError: (message) => showError(message),
    },
  );

  const { mutate: cancelExistingAssignment } = useMutation(
    (assignmentId) => cancelAssignment(assignmentId),
    {
      onSuccess: () => {
        showSuccess("Assegnazione annullata");
        refetch();
        setViewingItem(null);
      },
      onError: (message) => showError(message),
    },
  );

  const handleEdit = (row) => {
    if (!isOpen(row.status)) {
      showError(
        "Un'assegnazione chiusa (completata o annullata) non è più modificabile",
      );
      return;
    }
    setEditingItem(row);
    resetSaveError();
    setIsModalOpen(true);
  };

  const handleDelete = async (row) => {
    const confirmDelete = window.confirm(
      `Eliminare l'assegnazione del corso "${row.course_title}" a ${row.employee_name}?`,
    );
    if (!confirmDelete) return;

    try {
      await removeAssignment(row.id);
    } catch {
      // errore gestito dall'hook (toast in onError)
    }
  };

  const handleCancel = async (row) => {
    const confirmCancel = window.confirm(
      `Annullare l'assegnazione del corso "${row.course_title}" a ${row.employee_name}?`,
    );
    if (!confirmCancel) return;

    try {
      await cancelExistingAssignment(row.id);
    } catch {
      // errore gestito dall'hook (toast in onError)
    }
  };

  const handleSubmit = async (formData) => {
    try {
      await saveAssignment(formData);
    } catch {
      // errore gestito dall'hook (stato `saveError`)
    }
  };

  const hasRows = rows.length > 0;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assegnazioni</h1>
          <p className="text-sm text-muted-foreground">
            Assegna i corsi ai dipendenti e segui lo stato di avanzamento
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            resetSaveError();
            setIsModalOpen(true);
          }}
        >
          Assegna corso
        </Button>
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
          columns={buildColumns((row) => setViewingItem(row))}
          data={rows}
          actions={{
            onEdit: handleEdit,
            onDelete: handleDelete,
          }}
        />
      )}

      {!isLoading && !error && !hasRows && (
        <p className="text-sm text-muted-foreground">
          Nessuna assegnazione trovata con i filtri selezionati.
        </p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          resetSaveError();
        }}
        title={editingItem ? "Modifica assegnazione" : "Nuova assegnazione"}
      >
        <AssignmentForm
          initialData={editingItem}
          courses={courses}
          employees={employees}
          onSubmit={handleSubmit}
          error={saveError}
        />
      </Modal>

      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Dettaglio assegnazione"
      >
        {viewingItem && (
          <div className="space-y-5">
            <DetailList
              rows={[
                [ASSIGNMENTS_COLUMN_LABELS.course_title, viewingItem.course_title],
                [ASSIGNMENTS_COLUMN_LABELS.category, viewingItem.category],
                [ASSIGNMENTS_COLUMN_LABELS.duration_hours, viewingItem.duration_hours],
                [
                  ASSIGNMENTS_COLUMN_LABELS.mandatory,
                  viewingItem.mandatory
                    ? MANDATORY_LABELS.true
                    : MANDATORY_LABELS.false,
                ],
                [ASSIGNMENTS_COLUMN_LABELS.employee_name, viewingItem.employee_name],
                [ASSIGNMENTS_COLUMN_LABELS.employee_email, viewingItem.employee_email],
                [
                  ASSIGNMENTS_COLUMN_LABELS.assigned_at,
                  formatDate(viewingItem.assigned_at),
                ],
                [ASSIGNMENTS_COLUMN_LABELS.due_date, formatDate(viewingItem.due_date)],
                [
                  ASSIGNMENTS_COLUMN_LABELS.status,
                  <StatusBadge key="status" status={viewingItem.status} />,
                ],
                [
                  ASSIGNMENTS_COLUMN_LABELS.completed_at,
                  formatDate(viewingItem.completed_at),
                ],
              ]}
            />

            {isOpen(viewingItem.status) && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(viewingItem)}
                >
                  Annulla assegnazione
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// La rotta è protetta ma non esiste una guardia admin: la pagina si difende da sola.
// Il controllo sta qui, prima di montare la vista, così a un dipendente non parte
// nemmeno la GET /users (che il backend rifiuterebbe con 403).
// La difesa vera resta comunque il middleware isAdmin lato server.
export const Assignments = () => {
  const { user } = useAuth();

  if (user && !user.isAdmin) return <Navigate to="/courses" replace />;

  return <AssignmentsView />;
};
