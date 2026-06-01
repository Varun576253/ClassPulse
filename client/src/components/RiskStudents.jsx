import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const tones = {
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-rose-100 text-rose-800 border-rose-200'
};

const RiskStudents = ({ students = [] }) => (
  <section className="panel rounded-xl p-5">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Early alerts</p>
        <h2 className="mt-1 text-lg font-black text-[#11233f]">Students to watch</h2>
      </div>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
        <AlertTriangle size={17} />
      </span>
    </div>
    <div className="space-y-2">
      {!students.length && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-sm font-bold text-emerald-800">All clear</p>
          <p className="mt-0.5 text-xs text-emerald-600">No medium or high risk flags right now</p>
        </div>
      )}
      {students.slice(0, 5).map((student) => (
        <Link
          key={student._id}
          to={`/students/${student._id}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50 group"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
            {student.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-[#11233f]">{student.name}</span>
            <span className="block truncate text-xs text-slate-400">{student.learningProfile?.weakTopics?.[0] || 'Needs a fresh check-in'}</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase ${tones[student.riskLevel] || tones.medium}`}>
              {student.riskLevel}
            </span>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400" />
          </div>
        </Link>
      ))}
    </div>
  </section>
);

export default RiskStudents;
