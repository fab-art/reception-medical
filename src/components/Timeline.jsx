import { STAGES, STAGE_LABELS, statusStage } from '../lib/workflow';

// Full audit trail for one invoice — every submit/verify/reconcile/transit/
// lead/manager/finance action, who did it, and when.
export function Timeline({ events = [] }) {
  if (!events.length) return <p className="text-sm text-gray-400 py-4 text-center">No activity recorded yet.</p>;
  return (
    <ol className="relative border-l-2 border-gray-100 ml-2">
      {events.map((e) => (
        <li key={e.id} className="mb-5 ml-4">
          <div className="absolute w-2.5 h-2.5 bg-rssb-blue rounded-full -left-[5.5px] mt-1.5 border-2 border-white" />
          <div className="text-xs text-gray-400">{new Date(e.at).toLocaleString()} &middot; {e.actor || 'system'}</div>
          <div className="text-sm text-gray-800 mt-0.5">{e.note || e.action}</div>
        </li>
      ))}
    </ol>
  );
}

// Compact horizontal pipeline stepper showing where an invoice sits across
// the seven macro-stages of the process.
export function PipelineStepper({ status }) {
  const current = statusStage(status);
  const currentIdx = STAGES.indexOf(current);
  return (
    <div className="flex items-center overflow-x-auto py-1">
      {STAGES.map((s, i) => {
        const active = i === currentIdx;
        const complete = status === 'facility_paid' ? true : i < currentIdx;
        return (
          <div key={s} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center min-w-[86px]">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                  active ? 'bg-rssb-blue text-white' : complete ? 'bg-rssb-teal text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {complete ? '✓' : i + 1}
              </div>
              <div className={`text-[10px] mt-1 text-center ${active ? 'text-rssb-blue font-medium' : 'text-gray-400'}`}>{STAGE_LABELS[s]}</div>
            </div>
            {i < STAGES.length - 1 && <div className={`w-8 h-0.5 mb-4 ${i < currentIdx ? 'bg-rssb-teal' : 'bg-gray-100'}`} />}
          </div>
        );
      })}
    </div>
  );
}
