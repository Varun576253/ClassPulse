import { ArrowUp, ClipboardCheck, Flame } from 'lucide-react';

const TeacherInsights = ({ insight, weakTopic, improvedStudent }) => (
  <section className="panel rounded-xl p-5">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">AI teacher insight</p>
        <h2 className="mt-1 text-lg font-black text-[#11233f]">Next classroom move</h2>
      </div>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
        <ClipboardCheck size={18} />
      </span>
    </div>
    <p className="min-h-16 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm leading-7 text-slate-700">
      {insight?.teacherSummary || 'Run a diagnostic session to surface misconceptions and get an AI intervention summary.'}
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-600">
            <Flame size={14} />
          </span>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Weak topic</p>
        </div>
        <p className="font-black text-[#11233f] text-sm leading-5">{weakTopic?.topicName || 'No recurring weak topic yet'}</p>
        <p className="mt-1 text-xs text-slate-400">
          {weakTopic?.affectedStudents ? `${weakTopic.affectedStudents} students flagged` : 'Check back after a few sessions'}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
            <ArrowUp size={14} />
          </span>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Most improved</p>
        </div>
        <p className="font-black text-[#11233f] text-sm leading-5">{improvedStudent?.name || 'Progress appears here'}</p>
        <p className="mt-1 text-xs text-slate-400">
          {improvedStudent ? `+${improvedStudent.improvement} score points` : 'After two sessions per student'}
        </p>
      </div>
    </div>
  </section>
);

export default TeacherInsights;
