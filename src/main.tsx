import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { StoreProvider } from './lib/store'
import App from './App'
import { configured } from './lib/supabase'
import './styles.css'
const updateSW=registerSW({ immediate:true, onNeedRefresh(){ if(window.confirm('Une mise à jour de Winter Arc est disponible. L’installer maintenant ?'))void updateSW(true) } })
const app = import.meta.env.PROD && !configured
  ? <main style={{maxWidth:520,margin:'12vh auto',padding:30,fontFamily:'sans-serif',color:'#554A43'}}><h1>Winter Arc ♡</h1><p>Configuration privée indisponible. Contacte l'administrateur pour activer Supabase.</p></main>
  : <StoreProvider><App/></StoreProvider>
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{app}</React.StrictMode>)
