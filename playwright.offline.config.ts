import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'**/*.prod.ts',workers:1,timeout:60000,
 use:{baseURL:'http://127.0.0.1:5181',launchOptions:{executablePath:process.env.CHROMIUM_PATH||undefined}},
 webServer:{command:'npm run build && npm run preview -- --port 5181 --strictPort',url:'http://127.0.0.1:5181',reuseExistingServer:false,timeout:120000,env:{VITE_ENABLE_CLOUD:'true'}},
});
