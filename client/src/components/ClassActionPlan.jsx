import { CheckCircle2, ChevronRight, Clock, Sparkles } from 'lucide-react';

const ClassActionPlan = ({ insight = {}, groups = {}, topic = '' }) => {
  const needsSupport = groups.needsSupport?.length || 0;
  const advanced = groups.advanced?.length || 0;
  const total = Object.values(groups).reduce((s, a) => s + (a?.length || 0), 0);

  const actions = [];

  if (insight.commonMistake || insight.recurringMisconception) {
    actions.push({
      priority: 'Immediate',
      color: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-200',
      dot: 'bg-rose-500',
      text: `Address class-wide gap: "${insight.commonMistake || insight.recurringMisconception}"`
    });
  }

  if (needsSupport > 0) {
    actions.push({
      priority: 'Next 5 min',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      dot: 'bg-amber-500',
      text: `Pull ${needsSupport} struggling student${needsSupport !== 1 ? 's' : ''} into a small reteach group before continuing`
    });
  }

  if (insight.reteachActivity) {
    actions.push({
      priority: 'Today',
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      dot: 'bg-blue-500',
      text: insight.reteachActivity
    });
  }

  if (advanced > 0 && needsSupport > 0) {
    actions.push({
      priority: 'This lesson',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      dot: 'bg-emerald-500',
      text: `Pair ${advanced} advanced student${advanced !== 1 ? 's' : ''} as peer tutors with students who need support`
    });
  }

  actions.push({
    priority: 'Follow-up',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    dot: 'bg-violet-500',
    text: `Run a 2-question spot-check in the next session to verify ${topic || 'this topic'} gaps have closed`
  });

  return (
    <section className="panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#11233f] text-white">
              <Sparkles size={15} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">AI-generated</p>
              <h2 className="text-lg font-black text-[#11233f] leading-tight">Class action plan</h2>
            </div>
          </div>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-2xl font-black text-[#11233f]">{total}</p>
            <p className="text-xs text-slate-400">students mapped</p>
          </div>
        )}
      </div>

      {insight.teacherSummary && (
        <div className="mb-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-sm leading-7 text-slate-700">{insight.teacherSummary}</p>
        </div>
      )}

      <div className="space-y-2.5">
        {actions.map((action, idx) => (
          <div key={idx} className={`flex gap-3 rounded-xl border p-3.5 ${action.bg}`}>
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-black text-white ${action.dot}`}>
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Clock size={11} className={action.color} />
                  <span className={`text-[10px] font-black uppercase tracking-wide ${action.color}`}>{action.priority}</span>
                </div>
                <p className="text-sm text-slate-700 leading-5">{action.text}</p>
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0 mt-1 text-slate-300" />
          </div>
        ))}
      </div>

      {insight.mostAffectedTopic && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
          <CheckCircle2 size={15} className="text-amber-700 shrink-0" />
          <p className="text-xs font-bold text-amber-800">
            Most affected concept: <span className="font-black">{insight.mostAffectedTopic}</span>
            {insight.estimatedTimeSaved && ` · Saved ~${insight.estimatedTimeSaved} of manual grading`}
          </p>
        </div>
      )}
    </section>
  );
};

export default ClassActionPlan;
