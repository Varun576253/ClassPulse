import { Link } from 'react-router-dom';

const understoodTone = {
  yes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  no: 'border-rose-200 bg-rose-50 text-rose-800'
};

const riskTone = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-rose-100 text-rose-800'
};

const StudentCard = ({ student }) => {
  const studentId = student.studentId?._id || student.studentId || student._id;
  const name = student.name || student.studentId?.name || 'Student';
  const risk = student.riskLevel || student.studentId?.riskLevel;

  return (
    <article className={`rounded-lg border p-4 transition hover:-translate-y-0.5 ${understoodTone[student.understood] || 'border-slate-200 bg-white'}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/students/${studentId}`} className="block truncate font-black hover:underline">{name}</Link>
          <p className="mt-1 text-sm opacity-80">Confidence: {student.confidenceLevel || 'medium'}</p>
        </div>
        <span className="rounded-md bg-white/80 px-2 py-1 text-sm font-black">{Math.round(student.score || 0)}%</span>
      </div>
      {risk && <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-bold uppercase ${riskTone[risk]}`}>{risk} risk</span>}
    </article>
  );
};

export default StudentCard;
