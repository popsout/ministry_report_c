import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>({
  base:'./', plugins:[react()],
  ...(mode==='device'?{define:{
    'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(''),
    'import.meta.env.VITE_ENABLE_CLOUD':JSON.stringify('false'),
  }}:{}),
}));
