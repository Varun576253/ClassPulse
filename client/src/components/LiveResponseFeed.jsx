import { MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LiveResponseFeed = ({ responses = [], messages = [], isLive = false }) => {
  const [newIds, setNewIds] = useState(new Set());
  const prevCountRef = useRef(responses.length);
  const feedRef = useRef(null);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    const currentCount = responses.length;
    if (currentCount > prevCount) {
      const incoming = responses.slice(-(currentCount - prevCount));
      const ids = incoming.map((r) => `${r.studentId?._id || r.studentId}-${r.submittedAt}`);
      setNewIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }, 2500);
      if (feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    }
    prevCountRef.current = currentCount;
  }, [responses]);

  const acknowledgementCount = messages.filter((m) => m.type === 'acknowledgement').length;
  const replyCount = messages.filter((m) => m.type === 'reply').length;

  return (
    <section className="panel rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Live feed</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">Student replies</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">
            <MessageCircle size={13} />
            {replyCount} replies
          </span>
          <span className="hidden items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 sm:inline-flex">
            {acknowledgementCount} ack sent
          </span>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi size={13} />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">
              <WifiOff size={13} />
              Polling
            </span>
          )}
        </div>
      </div>

      <div ref={feedRef} className="flex-1 space-y-2.5 overflow-y-auto max-h-80 pr-1">
        {!responses.length && (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <MessageCircle size={28} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-semibold text-slate-400">Waiting for quiz responses...</p>
            <p className="mt-1 text-xs text-slate-300">Responses appear here instantly</p>
          </div>
        )}
        {responses.slice().reverse().map((response) => {
          const key = `${response.studentId?._id || response.studentId}-${response.submittedAt}`;
          const isNew = newIds.has(key);
          return (
            <article
              key={key}
              className={`rounded-xl border p-3.5 transition-all duration-500 ${
                isNew
                  ? 'border-emerald-300 bg-emerald-50 shadow-md shadow-emerald-100'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#11233f] text-xs font-black text-white shrink-0">
                    {(response.studentId?.name || 'S').charAt(0).toUpperCase()}
                  </span>
                  <p className="font-black text-[#11233f] text-sm">{response.studentId?.name || 'Student'}</p>
                  {isNew && (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wide">
                      New
                    </span>
                  )}
                </div>
                <time className="text-[11px] font-semibold text-slate-400 shrink-0">
                  {response.submittedAt
                    ? new Date(response.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </time>
              </div>
              <div className="space-y-1.5">
                {(response.answers || []).map((answer, index) => (
                  <p
                    key={`${answer}-${index}`}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 border border-slate-100"
                  >
                    <span className="font-black text-slate-400 mr-1.5">A{index + 1}</span>
                    {answer}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default LiveResponseFeed;
