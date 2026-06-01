import { Lightbulb, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const InterventionRecommendations = ({ reteachPlan, weakTopic, studentsNeedingSupport, riskStudents = [] }) => {
  const hasRecommendation = reteachPlan || weakTopic || studentsNeedingSupport > 0;

  return (
    <section className="panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Teacher actions</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">Recommended next steps</h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Target size={17} />
        </span>
      </div>

      <div className="space-y-3">
        {reteachPlan && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb size={14} className="mt-0.5 shrink-0 text-blue-600" />
              <p className="text-xs font-black uppercase text-blue-700">5-min reteach activity</p>
            </div>
            <p className="text-sm leading-6 text-blue-900">{reteachPlan}</p>
          </div>
        )}

        {weakTopic && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-start gap-2 mb-1">
              <Target size={14} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-xs font-black uppercase text-amber-700">Most common learning gap</p>
            </div>
            <p className="font-black text-[#11233f]">{weakTopic.topicName}</p>
            <p className="mt-1 text-xs text-amber-700">{weakTopic.affectedStudents} students flagged — consider a small-group session</p>
          </div>
        )}

        {studentsNeedingSupport > 0 && riskStudents.length > 0 && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <Users size={14} className="mt-0.5 shrink-0 text-rose-700" />
              <p className="text-xs font-black uppercase text-rose-700">{studentsNeedingSupport} students need support</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {riskStudents.slice(0, 4).map((s) => (
                <Link
                  key={s._id}
                  to={`/students/${s._id}`}
                  className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 transition"
                >
                  {s.name}
                </Link>
              ))}
              {riskStudents.length > 4 && (
                <span className="rounded-lg bg-white/60 px-2 py-1 text-xs font-bold text-rose-600">
                  +{riskStudents.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {!hasRecommendation && (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
            <Lightbulb size={22} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">Run a session to get AI recommendations</p>
            <p className="mt-1 text-xs text-slate-400">Analyse responses to surface intervention priorities</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default InterventionRecommendations;
