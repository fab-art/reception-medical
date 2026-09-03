const STAGES = [
  { key: 'received', label: 'Submitted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'verified', label: 'Verified' },
  { key: 'paid', label: 'Paid' },
];

export default function ProgressSteps({ status, compact }) {
  const idx = Math.max(0, STAGES.findIndex((s) => s.key === status));
  if (compact) {
    return (
      <div className="flex items-center gap-1" aria-label={`Stage: ${STAGES[idx]?.label}`}>
        {STAGES.map((s, i) => (
          <span
            key={s.key}
            className={`w-2 h-2 rounded-full ${i < idx ? 'bg-rssb-teal' : i === idx ? 'bg-rssb-teal ring-2 ring-rssb-teal/25' : 'bg-gray-200'}`}
            title={s.label}
          />
        ))}
        <span className="text-[10px] text-gray-500 ml-1 font-medium">{STAGES[idx]?.label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center mb-2">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex-1 flex items-center">
          <div className="flex flex-col items-center flex-1">
            <div className={`w-3.5 h-3.5 rounded-full border-2 ${i <= idx ? 'bg-rssb-teal border-rssb-teal' : 'bg-white border-gray-300'}`} />
            <div className={`text-[10px] mt-1 ${i <= idx ? 'text-rssb-teal font-medium' : 'text-gray-400'}`}>{s.label}</div>
          </div>
          {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-3 ${i < idx ? 'bg-rssb-teal' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}
