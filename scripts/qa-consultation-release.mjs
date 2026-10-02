// Read-only production smoke checks. No authenticated writes or customer data.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.env.QA_BASE_URL || 'https://umsh.kr';
const output = process.argv[2];
const results = [];
for (const [path, status, marker] of [
  ['/',200,'운명상회'], ['/consultation/',200,'consultation-form'],
  ['/coupons.html',200,'coupon-code'], ['/my',200,'쿠폰'],
  ['/vault?tab=history',200,'consultation-vault'],
  ['/ops/constellation-7f3c/coupons',200,'쿠폰'],
  ['/ops/constellation-7f3c/popup',200,'팝업'],
  ['/api/health',200,null], ['/api/coupons',401,null],
  ['/api/admin/v1/coupons',401,null],
]) {
  const response = await fetch(new URL(path,base));
  const body = await response.text();
  results.push({path,status:response.status,pass:response.status === status && (!marker || body.includes(marker))});
}
for (const name of ['consultation.js','coupons.js','payment.js']) {
  const response = await fetch(new URL('/js/'+name,base));
  const bytes = Buffer.from(await response.arrayBuffer());
  const local = await readFile(new URL('../사주/js/'+name,import.meta.url));
  results.push({path:'/js/'+name,status:response.status,sha256:createHash('sha256').update(bytes).digest('hex'),pass:response.status === 200 && bytes.equals(local)});
}
const voice = await fetch(new URL('/api/consultation-voice',base),{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
results.push({path:'/api/consultation-voice',status:voice.status,pass:voice.status === 401});
const context = await fetch(new URL('/api/consultation/context',base));
const contextBody = await context.json().catch(() => ({code:'NON_JSON_RESPONSE'}));
results.push({path:'/api/consultation/context',status:context.status,code:contextBody.code,pass:context.status === 503 && contextBody.code === 'CONSULTATION_SETUP_REQUIRED',note:'Expected current setup gate; this is NOT proof of live consultation success.'});
const report = {at:new Date().toISOString(),base,results,pass:results.every(row=>row.pass)};
if(output) await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.pass) process.exitCode=1;
