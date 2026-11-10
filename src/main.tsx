import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if(import.meta.env.PROD && import.meta.env.MODE!=='device' && 'serviceWorker' in navigator && window.isSecureContext){
 window.addEventListener('load',()=>{
  void navigator.serviceWorker.register(new URL('./sw.js',window.location.href.split('#')[0]),{updateViaCache:'none'}).then(registration=>{
   const update=()=>{if(document.visibilityState==='visible')void registration.update().catch(()=>{});};
   document.addEventListener('visibilitychange',update);
   window.addEventListener('online',update);
   window.setInterval(update,60000);
   update();
  }).catch(()=>{});
 });
}
