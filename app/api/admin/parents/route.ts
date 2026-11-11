import {env} from 'cloudflare:workers';
import {listParents} from '../../../../src/server/accountApi';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>listParents(request,env.DB);
