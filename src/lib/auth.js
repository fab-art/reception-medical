const SESSION_KEY='rssb:session';
export function resolveLogin(credential,settings,officers){
 const v=String(credential||'').trim(); if(!v) return null;
 if(v===String(settings.superadminPassword)) return {role:'superadmin'};
 if(v===String(settings.adminPassword)) return {role:'admin'};
 if(v===String(settings.receptionPassword)) return {role:'reception'};
 const o=officers.find(x=>x.active!==false && String(x.pin)===v);
 if(o) return {role:o.isReceptionist?'reception':'officer',officerId:o.id,officerName:o.name};
 return null;
}
export function getSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
export function setSession(s){sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}
export function clearSession(){sessionStorage.removeItem(SESSION_KEY)}
