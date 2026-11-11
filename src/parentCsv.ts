import type {ParentRow} from './accountTypes';
function cell(value:string){return '"'+(/^[\s]*[=+\-@\t\r\n]/.test(value)?"'"+value:value).replace(/"/g,'""')+'"';}
// A marketing export never includes parents who declined or withdrew permission.
export function subscriberCsv(parents:ParentRow[]){return '\uFEFF'+[['Name','Email','Opted in at','Signed up at'],...parents.filter(parent=>parent.marketingOptIn).map(parent=>[parent.name,parent.email,parent.consentAt??'',parent.createdAt])].map(row=>row.map(cell).join(',')).join('\r\n');}
