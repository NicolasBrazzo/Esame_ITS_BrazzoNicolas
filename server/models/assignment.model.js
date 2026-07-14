const supabase = require("../config/db_connection");

const TABLE_NAME = "E_CourseAssignments";

// get all assignments — ogni filtro viene applicato solo se presente (vedi FILTERS_BE.md).
// Il corso e il dipendente collegati vengono inclusi nella riga: `!inner` serve a filtrare
// per `course.category` (le due FK sono NOT NULL, quindi l'inner join non scarta righe).
const findAllAssignments = async (filters = {}) => {
  let query = supabase
    .from(TABLE_NAME)
    .select(
      `*,
       course:E_Courses!inner (id, title, category, duration_hours, mandatory, active),
       employee:E_Users!inner (id, first_name, last_name, email)`
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.course_id) query = query.eq("course_id", filters.course_id);
  if (filters.employee_id) query = query.eq("employee_id", filters.employee_id);
  if (filters.category) query = query.eq("course.category", filters.category);

  const { data, error } = await query;
  if (error) {
    throw new Error("DATABASE_FIND_ALL_ASSIGNMENTS_ERROR");
  }
  return data;
};

// find assignment by id (include corso e dipendente collegati, come nell'elenco)
const findAssignmentById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(
      `*,
       course:E_Courses!inner (id, title, category, duration_hours, mandatory, active),
       employee:E_Users!inner (id, first_name, last_name, email)`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error("DATABASE_FIND_ASSIGNMENT_ERROR");
  }
  return data;
};

// find an assignment still open (status = 'assigned') for a course/employee pair.
// Usata per il vincolo di unicità: lo stesso corso non si riassegna a un dipendente
// che ce l'ha ancora da completare (le assegnazioni chiuse restano nello storico).
const findOpenAssignmentByCourseAndEmployee = async (courseId, employeeId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("course_id", courseId)
    .eq("employee_id", employeeId)
    .eq("status", "assigned")
    .maybeSingle();
  if (error) {
    throw new Error("DATABASE_FIND_ASSIGNMENT_ERROR");
  }
  return data;
};

// create new assignment (status e completed_at restano ai default: 'assigned' / null)
const createNewAssignment = async (courseId, employeeId, assignedAt, dueDate) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([
      {
        course_id: courseId,
        employee_id: employeeId,
        assigned_at: assignedAt,
        due_date: dueDate,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error("DATABASE_CREATE_ASSIGNMENT_ERROR");
  }

  return data;
};

// edit assignment by id (usata anche dai cambi di stato: /complete e /cancel)
const updateAssignmentById = async (id, assignmentData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(assignmentData)
    .eq("id", id)
    .select()
    .maybeSingle();   // null se l'id non esiste: il controller risponde 404

  if (error) {
    throw new Error("DATABASE_EDIT_ASSIGNMENT_ERROR");
  }

  return data;
};

// delete assignment by id
const deleteAssignmentById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();   // null se l'id non esiste: il controller risponde 404

  if (error) {
    throw new Error("DATABASE_DELETE_ASSIGNMENT_ERROR");
  }

  return data;
};

// find assignments by course id (usata per bloccare l'eliminazione di un corso con assegnazioni)
const findAssignmentsByCourseId = async (courseId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("course_id", courseId);
  if (error) {
    throw new Error("DATABASE_FIND_ASSIGNMENTS_ERROR");
  }
  return data;
};

// find the course ids assigned to an employee (usata per la visibilità dei corsi lato dipendente)
const findAssignedCourseIdsByEmployeeId = async (employeeId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("course_id")
    .eq("employee_id", employeeId);
  if (error) {
    throw new Error("DATABASE_FIND_ASSIGNMENTS_ERROR");
  }
  return data.map((row) => row.course_id);
};

module.exports = {
  findAllAssignments,
  findAssignmentById,
  findOpenAssignmentByCourseAndEmployee,
  createNewAssignment,
  updateAssignmentById,
  deleteAssignmentById,
  findAssignmentsByCourseId,
  findAssignedCourseIdsByEmployeeId,
};
