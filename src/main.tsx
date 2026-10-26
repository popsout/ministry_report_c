import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if(import.meta.env.PROD && import.meta.env.MODE!=='device' && 'serviceWorker' in navigator && window.isSecureContext){
 window.addEventListener('load',()=>{void navigator.serviceWorker.register(new URL('./sw.js',window.location.href.split('#')[0])).catch(()=>{});});
}
