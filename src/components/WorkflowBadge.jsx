import { statusLabel, statusColor } from '../lib/workflow';

export default function WorkflowBadge({ status, small }) {
  const color = statusColor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ backgroundColor: color + '1a', color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {statusLabel(status)}
    </span>
  );
}
