import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar, { Topbar } from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Assessments from './pages/Assessments';
import HelpCenter from './pages/HelpCenter';
import Login from './pages/Login';
import NewSession from './pages/NewSession';
import Profile from './pages/Profile';
import Roster from './pages/Roster';
import SessionResults from './pages/SessionResults';
import Settings from './pages/Settings';
import StudentProgress from './pages/StudentProgress';
import StudentQuiz from './pages/StudentQuiz';

const hasTeacherSession = () => Boolean(localStorage.getItem('classpulse-teacher'));

const RequireTeacher = ({ children }) => (
  hasTeacherSession() ? children : <Navigate to="/login" replace />
);

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/quiz" element={<StudentQuiz />} />
    <Route path="/" element={<RequireTeacher><Dashboard /></RequireTeacher>} />
    <Route path="/assessments" element={<RequireTeacher><Assessments /></RequireTeacher>} />
    <Route path="/roster" element={<RequireTeacher><Roster /></RequireTeacher>} />
    <Route path="/settings" element={<RequireTeacher><Settings /></RequireTeacher>} />
    <Route path="/profile" element={<RequireTeacher><Profile /></RequireTeacher>} />
    <Route path="/help" element={<RequireTeacher><HelpCenter /></RequireTeacher>} />
    <Route path="/session/new" element={<RequireTeacher><NewSession /></RequireTeacher>} />
    <Route path="/sessions/new" element={<RequireTeacher><NewSession /></RequireTeacher>} />
    <Route path="/session/:sessionId" element={<RequireTeacher><SessionResults /></RequireTeacher>} />
    <Route path="/sessions/:sessionId" element={<RequireTeacher><SessionResults /></RequireTeacher>} />
    <Route path="/student/:studentId" element={<RequireTeacher><StudentProgress /></RequireTeacher>} />
    <Route path="/students/:studentId" element={<RequireTeacher><StudentProgress /></RequireTeacher>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/quiz';

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AppRoutes />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Navbar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <AppRoutes />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
