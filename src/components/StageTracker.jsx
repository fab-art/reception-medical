import { currentStage } from '../lib/workflow';
const stages=[['hq_reception','HQ Reception'],['verification','Verification'],['finance','Finance / Paid']];
export default function StageTracker({status}){
 const stage=currentStage(status); const order=stages.map(x=>x[0]); const idx=order.indexOf(stage);
 return <div className="flex items-center gap-1 text-[10px]">{stages.map(([id,label],i)=><div key={id} className="flex items-center gap-1"><span className={`px-2 py-1 rounded-full ${i<idx?'bg-rssb-teal-light text-rssb-teal':i===idx?'bg-rssb-blue-light text-rssb-blue font-semibold':'bg-gray-100 text-gray-400'}`}>{label}</span>{i<stages.length-1&&<span className="text-gray-300">→</span>}</div>)}</div>
}
