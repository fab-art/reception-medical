import { StatusBadge } from './UI';
import { statusLabel, slaInfo } from '../lib/workflow';
export default function WorkflowBadge({record}){
 const sla=slaInfo(record);
 const label = sla.breached ? `${statusLabel(record.status)} · >15d` : statusLabel(record.status);
 return <StatusBadge status={record.status} label={label}/>;
}
