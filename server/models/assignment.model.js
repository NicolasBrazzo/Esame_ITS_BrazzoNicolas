const supabase = require("../config/db_connection");

const TABLE_NAME = "E_CourseAssignments";

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
  findAssignmentsByCourseId,
  findAssignedCourseIdsByEmployeeId,
};
