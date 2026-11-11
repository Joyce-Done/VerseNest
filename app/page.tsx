'use client';
import { useEffect,useState } from 'react';
import App from '../src/App';
import {ParentAccountGate} from '../src/components/ParentAccount';
export default function Home(){const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);return mounted?<ParentAccountGate><App/></ParentAccountGate>:<main className="app-loading"><img src="/brand/versenest-logo.png" alt="VerseNest" width="110" height="110"/><p>Opening your family's verses…</p></main>;}
