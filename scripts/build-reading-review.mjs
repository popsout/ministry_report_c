// Usage: node scripts/build-reading-review.mjs
// esbuild is provided by the pinned Vite development toolchain. No data is bundled by production builds.
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const events=JSON.parse(readFileSync(root+'private-import/bible-events.json','utf8'));
const result=await build({absWorkingDir:root,entryPoints:['scripts/reading-review.tsx'],bundle:true,write:false,outdir:'review-output',minify:true,format:'iife',jsx:'automatic',define:{__BIBLE_REVIEW_EVENTS__:JSON.stringify(events),'process.env.NODE_ENV':'"production"'}});
const script=result.outputFiles.find(file=>file.path.endsWith('.js')).text.replaceAll('</script','<\\/script');
const css=result.outputFiles.find(file=>file.path.endsWith('.css')).text;
const extra='.review-banner{display:flex;align-items:center;gap:10px;padding:13px 16px;margin-bottom:24px;border:1px solid #e5d7ee;border-radius:9px;background:#eee6f5;color:#6d5288;font-size:12px;line-height:1.8}.review-banner svg{flex-shrink:0}@media(max-width:760px){.review-banner{font-size:11px}}';
const hash=createHash('sha256').update(script).digest('base64');
const csp=`default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>히브리어 성경 · 개인 검토용 미리보기</title><style>${css}${extra}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
const output=root+'private-import/bible-review.html';writeFileSync(output,html);console.log('Private review artifact:',output,'events:',events.length);
