import type { Metadata } from 'next';
import '../src/index.css';
export const metadata:Metadata={title:'VerseNest | Family Scripture Memory',description:'Prepare for your Verse-a-thon and keep a lasting record of the Scripture your family has memorized.',manifest:'/manifest.webmanifest',icons:{icon:'/icons/icon-192-v2.png',apple:'/icons/apple-touch-icon-v2.png'},appleWebApp:{capable:true,title:'VerseNest'},};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><meta name="theme-color" content="#250857"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/></head><body><div id="root">{children}</div></body></html>;}
