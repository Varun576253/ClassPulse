import { HelpCircle, Mail, MessageSquareText } from 'lucide-react';

const HelpCenter = () => (
  <div className="space-y-5">
    <section className="border-b border-slate-200 pb-5">
      <p className="text-xs font-black uppercase tracking-wider text-blue-600">Help Center</p>
      <h1 className="mt-1 text-3xl font-black text-[#11233f]">Support</h1>
      <p className="mt-1 text-sm text-slate-500">Find help for sessions, assessments, roster, and account access.</p>
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      {[
        {
          title: 'Sessions',
          detail: 'Start a check-in, collect student replies, and run AI analysis from the session page.',
          icon: MessageSquareText
        },
        {
          title: 'Assessments',
          detail: 'Upload question papers and answer sheets, then review scores and intervention groups.',
          icon: HelpCircle
        },
        {
          title: 'Account',
          detail: 'Use password reset from the login page if you need a fresh access code.',
          icon: Mail
        }
      ].map(({ title, detail, icon: Icon }) => (
        <article key={title} className="panel rounded-xl p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <Icon size={18} />
          </span>
          <h2 className="mt-4 text-lg font-black text-[#11233f]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
        </article>
      ))}
    </section>
  </div>
);

export default HelpCenter;
