const supabase = require("../config/db_connection");

const TABLE_NAME = "E_Courses";

// get all courses
const findAllCourses = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error("DATABASE_FIND_ALL_COURSES_ERROR");
  }
  return data;
};

// get courses by a list of ids (usata per la visibilità dei dipendenti: solo i corsi assegnati)
const findCoursesByIds = async (ids) => {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error("DATABASE_FIND_ALL_COURSES_ERROR");
  }
  return data;
};

// find course by id
const findCourseById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error("DATABASE_FIND_COURSE_ERROR");
  }
  return data;
};

// find course by title (usata per il vincolo di unicità)
const findCourseByTitle = async (title) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("title", title)
    .maybeSingle();
  if (error) {
    throw new Error("DATABASE_FIND_COURSE_ERROR");
  }
  return data;
};

// create new course
const createNewCourse = async (title, description, category, durationHours, mandatory) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([
      {
        title,
        description,
        category,
        duration_hours: durationHours,
        mandatory,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error("DATABASE_CREATE_COURSE_ERROR");
  }

  return data;
};

// edit course by id
const updateCourseById = async (id, courseData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(courseData)
    .eq("id", id)
    .select()
    .maybeSingle();   // null se l'id non esiste: il controller risponde 404

  if (error) {
    throw new Error("DATABASE_EDIT_COURSE_ERROR");
  }

  return data;
};

// delete course by id
const deleteCourseById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();   // null se l'id non esiste: il controller risponde 404

  if (error) {
    throw new Error("DATABASE_DELETE_COURSE_ERROR");
  }

  return data;
};

// disable course by id (soft delete: active = false)
const disableCourseById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ active: false })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error("DATABASE_DISABLE_COURSE_ERROR");
  }

  return data;
};

module.exports = {
  findAllCourses,
  findCoursesByIds,
  findCourseById,
  findCourseByTitle,
  createNewCourse,
  updateCourseById,
  deleteCourseById,
  disableCourseById,
};
