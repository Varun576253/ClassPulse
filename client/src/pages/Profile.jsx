import { Phone, School, UserRound } from 'lucide-react';

const getTeacherProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('classpulse-teacher-profile') || '{}');
  } catch {
    return {};
  }
};

const Profile = () => {
  const profile = getTeacherProfile();

  return (
    <div className="space-y-5">
      <section className="border-b border-slate-200 pb-5">
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">Profile</p>
        <h1 className="mt-1 text-3xl font-black text-[#11233f]">{profile.name || 'Teacher profile'}</h1>
        <p className="mt-1 text-sm text-slate-500">{profile.school || 'ClassPulse teacher workspace'}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="panel rounded-xl p-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-xl font-black text-primary-foreground">
            {(profile.name || 'Teacher').slice(0, 1).toUpperCase()}
          </span>
          <h2 className="mt-4 text-xl font-black text-[#11233f]">{profile.name || 'Teacher'}</h2>
          <p className="mt-1 text-sm text-slate-500">{profile.subject || 'Subject'} - {profile.grade || 'Grade'}</p>
        </article>

        <article className="panel rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Profile Settings</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Name', value: profile.name || 'Teacher', icon: UserRound },
              { label: 'School', value: profile.school || 'School not set', icon: School },
              { label: 'Subject', value: profile.subject || 'Subject not set', icon: School },
              { label: 'Mobile', value: profile.phone ? `+${profile.phone}` : 'Mobile not set', icon: Phone }
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                  <Icon size={13} />
                  {label}
                </div>
                <p className="mt-2 font-bold text-[#11233f]">{value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Profile;
