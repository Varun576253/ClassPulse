const TEACHER_ID_KEY = 'classpulse-teacher';
const TEACHER_PROFILE_KEY = 'classpulse-teacher-profile';

export const getTeacherId = () => localStorage.getItem(TEACHER_ID_KEY) || '';

export const getTeacherProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(TEACHER_PROFILE_KEY) || '{}');
  } catch {
    return {};
  }
};

export const saveTeacherSession = (teacher) => {
  localStorage.setItem(TEACHER_ID_KEY, teacher._id);
  localStorage.setItem(TEACHER_PROFILE_KEY, JSON.stringify(teacher));
  window.dispatchEvent(new Event('classpulse-profile-change'));
};

export const clearTeacherSession = () => {
  localStorage.removeItem(TEACHER_ID_KEY);
  localStorage.removeItem(TEACHER_PROFILE_KEY);
  window.dispatchEvent(new Event('classpulse-profile-change'));
};

