import { useState } from 'react';
import RoleShell from '../components/RoleShell';
import ReceptionDashboard from './ReceptionDashboard';
import ReceptionQueue from './ReceptionQueue';
import NewReception from './NewReception';
import InvoiceWorkspace from './InvoiceWorkspace';
import { IconHome, IconList, IconPlus } from '../components/Icons';
const NAV=[{id:'dashboard',label:'HQ Reception Dashboard',icon:IconHome},{id:'queue',label:'Correction & Intake Queue',icon:IconList},{id:'new',label:'Register District Submission',icon:IconPlus}];
export default function ReceptionApp(props){const[view,setView]=useState('dashboard');const[selected,setSelected]=useState(null);const common={...props,goTo:setView};return <RoleShell roleLabel="HQ Reception" nav={NAV} view={view} setView={setView}>{selected?<InvoiceWorkspace record={selected} {...common} actorRole="reception" actorName={props.officer?.name||'HQ Reception'} onClose={()=>setSelected(null)} onRefresh={props.setReceptions}/>:view==='dashboard'?<ReceptionDashboard {...common} open={setSelected}/>:view==='queue'?<ReceptionQueue {...common} open={setSelected}/>:<NewReception {...common}/>}</RoleShell>}
