import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AppIcon from './AppIcon';
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  onNotificationsChange,
  readNotifications
} from '../utils/notifications';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/impact', label: 'Impact Report', icon: TrendingUp },
  { to: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { to: '/roster', label: 'Student Roster', icon: UsersRound },
  { to: '/sessions/new', label: 'New Session', icon: PlusCircle }
];

const getTeacherProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('classpulse-teacher-profile') || '{}');
  } catch {
    return {};
  }
};

const initials = (name = 'Teacher') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'TK';

const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const NavItem = ({ item, collapsed = false, onNavigate }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'group relative flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        ].join(' ')
      }
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-sidebar-border bg-popover px-2 py-1 text-xs font-semibold text-popover-foreground opacity-0 shadow-xl transition group-hover:opacity-100">
          {item.label}
        </span>
      )}
    </NavLink>
  );
};

const SidebarAction = ({ to, icon: Icon, label, collapsed, onNavigate }) => (
  <NavLink
    to={to}
    onClick={onNavigate}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      [
        'group relative flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      ].join(' ')
    }
  >
    <Icon size={20} className="shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
    {collapsed && (
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-sidebar-border bg-popover px-2 py-1 text-xs font-semibold text-popover-foreground opacity-0 shadow-xl transition group-hover:opacity-100">
        {label}
      </span>
    )}
  </NavLink>
);

const SidebarContent = ({ collapsed, onToggle, onNavigate, showClose }) => {
  const navigate = useNavigate();

  const signOut = () => {
    localStorage.removeItem('classpulse-teacher');
    localStorage.removeItem('classpulse-teacher-profile');
    navigate('/login');
  };

  return (
    <aside
      className={[
        'relative z-30 flex h-screen shrink-0 flex-col overflow-visible border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[4rem] min-w-[4rem]' : 'w-64 min-w-[16rem]'
      ].join(' ')}
    >
      <div className={[
        'flex items-center border-b border-sidebar-border transition-[height] duration-300 ease-in-out',
        collapsed ? 'h-20 flex-col justify-center gap-1 px-2' : 'h-16 justify-between px-4'
      ].join(' ')}>
        <Link to="/" onClick={onNavigate} className={['flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-2'].join(' ')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <AppIcon size={24} className="text-primary" />
          </span>
          {!collapsed && (
            <span className="truncate font-semibold text-sidebar-foreground">
              ShikshaSathi
            </span>
          )}
        </Link>
        {showClose ? (
          <button
            type="button"
            onClick={onNavigate}
            className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
            title="Close menu"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 p-2" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-2">
        <SidebarAction to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onNavigate={onNavigate} />
        <button
          type="button"
          onClick={signOut}
          className={[
            'group relative flex h-11 w-full items-center rounded-lg text-sm font-medium text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          ].join(' ')}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="truncate">Sign out</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-sidebar-border bg-popover px-2 py-1 text-xs font-semibold text-popover-foreground opacity-0 shadow-xl transition group-hover:opacity-100">
              Sign out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

const Navbar = ({ mobileOpen, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <div className="hidden shrink-0 lg:block">
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
          />
          <div className="relative">
            <SidebarContent
              collapsed={false}
              onNavigate={onMobileClose}
              showClose
            />
          </div>
        </div>
      )}
    </>
  );
};

const buildSearchResults = ({ students, assessments, sessions, query }) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const matches = (values) => values.some((value) =>
    String(value || '').toLowerCase().includes(normalized)
  );

  return [
    ...students
      .filter((student) => matches([student.name, student.grade, student.phone]))
      .slice(0, 5)
      .map((student) => ({
        key: `student-${student._id}`,
        label: student.name,
        meta: `Student - ${student.grade || 'Roster'}`,
        to: `/students/${student._id}`
      })),
    ...assessments
      .filter((assessment) => matches([assessment.title, assessment.topic, assessment.subject, assessment.grade]))
      .slice(0, 5)
      .map((assessment) => ({
        key: `assessment-${assessment._id}`,
        label: assessment.title || assessment.topic || 'Assessment',
        meta: `Assessment - ${String(assessment.status || 'ready').replaceAll('_', ' ')}`,
        to: `/assessments?assessmentId=${assessment._id}`
      })),
    ...sessions
      .filter((session) => matches([session.topic, session.subject, session.grade, session.status]))
      .slice(0, 5)
      .map((session) => ({
        key: `session-${session._id}`,
        label: session.topic,
        meta: `Session - ${String(session.status || 'pending')}`,
        to: `/sessions/${session._id}`
      }))
  ].slice(0, 8);
};

const SearchBox = ({ compact = false }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({ students: [], assessments: [], sessions: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    const teacherId = localStorage.getItem('classpulse-teacher') || '';
    if (!open || loaded || !teacherId) return undefined;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [studentsRes, assessmentsRes, sessionsRes] = await Promise.all([
          api.get(`/students/${teacherId}`),
          api.get(`/assessments/teacher/${teacherId}`),
          api.get(`/sessions/teacher/${teacherId}`)
        ]);
        if (cancelled) return;
        setData({
          students: studentsRes.data.students || [],
          assessments: assessmentsRes.data.assessments || [],
          sessions: sessionsRes.data.sessions || []
        });
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loaded, open]);

  const results = useMemo(() => buildSearchResults({ ...data, query }), [data, query]);

  const goToResult = (to) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  if (compact) {
    return (
      <div className="relative sm:hidden">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md text-foreground hover:bg-secondary"
          title="Search"
          onClick={() => setOpen((value) => !value)}
        >
          <Search size={20} />
        </button>
        {open && (
          <div className="fixed inset-x-4 top-20 z-50 text-left">
            <div className="rounded-lg border border-border bg-popover p-2 shadow-xl">
              <SearchBox />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        className="h-9 w-full rounded-md border border-input bg-input pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 sm:w-[220px] md:w-[300px]"
        placeholder="Search students, assessments, sessions..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      {open && query.trim() && (
        <div className="absolute left-0 top-11 z-50 w-full min-w-[300px] rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-xl">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 size={15} className="animate-spin" />
              Searching...
            </div>
          )}
          {error && <p className="px-2 py-3 text-sm font-semibold text-destructive">{error}</p>}
          {!loading && !error && !results.length && (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matching students, assessments, or sessions found.</p>
          )}
          {!loading && !error && results.map((result) => (
            <button
              key={result.key}
              type="button"
              onClick={() => goToResult(result.to)}
              className="block w-full rounded-md px-2 py-2 text-left hover:bg-secondary"
            >
              <span className="block truncate text-sm font-semibold">{result.label}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.meta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Topbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getTeacherProfile);
  const teacherName = profile.name || 'Teacher';
  const teacherEmail = profile.phone ? `+${profile.phone}` : 'teacher@school.edu';
  const [notifications, setNotifications] = useState(readNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => onNotificationsChange(setNotifications), []);
  useEffect(() => {
    const updateProfile = () => setProfile(getTeacherProfile());
    window.addEventListener('classpulse-profile-change', updateProfile);
    window.addEventListener('storage', updateProfile);
    return () => {
      window.removeEventListener('classpulse-profile-change', updateProfile);
      window.removeEventListener('storage', updateProfile);
    };
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const openNotification = (notification) => {
    markNotificationRead(notification.id);
    setNotificationOpen(false);
    if (notification.to) navigate(notification.to);
  };

  const profileLinks = [
    { label: 'Profile', to: '/profile', icon: UserRound },
    { label: 'Settings', to: '/settings', icon: Settings },
    { label: 'Help Center', to: '/help', icon: HelpCircle }
  ];

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md text-foreground hover:bg-secondary lg:hidden"
          onClick={onMenuClick}
          title="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <SearchBox />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SearchBox compact />

        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-foreground hover:bg-secondary"
            title="Notifications"
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <span className="relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
          </button>
          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-xl">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <p className="text-sm font-semibold">Notifications</p>
                {!!notifications.length && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={markAllNotificationsRead} className="text-xs font-bold text-primary hover:underline">
                      Mark All As Read
                    </button>
                    <button type="button" onClick={clearNotifications} className="text-xs font-bold text-muted-foreground hover:text-destructive">
                      Clear All Notifications
                    </button>
                  </div>
                )}
              </div>
              {!notifications.length && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No new notifications</p>
              )}
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={[
                      'block w-full rounded-md px-2 py-2 text-left hover:bg-secondary',
                      notification.read ? '' : 'bg-secondary/80'
                    ].join(' ')}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{notification.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.detail}</span>
                      </span>
                      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{formatNotificationTime(notification.createdAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
            title="Profile menu"
            onClick={() => setProfileOpen((value) => !value)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(teacherName)}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-xl">
              <div className="px-2 py-2">
                <p className="text-sm font-medium">{teacherName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{teacherEmail}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              {profileLinks.map(({ label, to, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(to);
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
