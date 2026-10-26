import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  const configuredUrl=process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  let connections="'self'";
  if(mode!=='device' && configuredUrl){
    const url=new URL(configuredUrl);
    if(url.protocol!=='https:' || url.username || url.password)throw new Error('Use a valid HTTPS Supabase project URL');
    connections+=` ${url.origin} wss://${url.host}`;
  }
  const csp=`default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${connections}; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const offlineShell:Plugin={name:'offline-shell',apply:'build',generateBundle(_options,bundle){
    if(mode==='device')return;
    const buildId=createHash('sha256').update(Object.keys(bundle).sort().join('|')).digest('hex').slice(0,12);
    this.emitFile({type:'asset',fileName:'sw.js',source:readFileSync(new URL('./scripts/sw-template.js',import.meta.url),'utf8').replace('__BUILD_ID__',buildId)});
  }};
  const security:Plugin={name:'security-policy',apply:'build',transformIndexHtml(){return [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:csp},injectTo:'head-prepend'}];}};
  return {
    base:'./',plugins:[react(),security,offlineShell],
    ...(mode==='device'?{define:{
      'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(''),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(''),
      'import.meta.env.VITE_ENABLE_CLOUD':JSON.stringify('false'),
    }}:{}),
  };
});
