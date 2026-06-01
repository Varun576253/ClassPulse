import { Sparkles } from 'lucide-react';

const ReteachSuggestion = ({ insight }) => (
  <section className="panel rounded-xl p-5">
    <div className="flex items-start gap-3 mb-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        <Sparkles size={18} />
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">5-min intervention</p>
        <h2 className="mt-0.5 text-lg font-black text-foreground">Reteach suggestion</h2>
      </div>
    </div>
    <p className="text-sm leading-7 text-muted-foreground">
      {insight?.reteachActivity || 'Analyse responses to generate a practical reteach activity tailored to this class\'s gaps.'}
    </p>
  </section>
);

export default ReteachSuggestion;
