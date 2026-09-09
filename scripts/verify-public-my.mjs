import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const helperSource = fs.readFileSync(root+'사주/js/umsh-account-pages.js','utf8');
const mySource = fs.readFileSync(root+'사주/js/my.js','utf8');
let passed = 0;
for (const mode of ['guest','member','disabled','expired']) {
  const redirects=[];
  const member={access_token:'test-only',user:{email:'member@example.test'}};
  const client={auth:{getSession:async()=>({data:{session:mode==='guest'?null:member}})}};
  const win={location:{pathname:'/my',search:'',hash:'',replace:v=>redirects.push(v)},supabase:{createClient:()=>client},UMSHAuthSession:{enforceDeviceAuthSession:async s=>mode==='expired'?null:s}};
  win.UMSHAuthSession.createClient=()=>client;
  const ctx=vm.createContext({window:win,fetch:async()=>({json:async()=>({enabled:mode!=='disabled'})})});
  vm.runInContext(helperSource,ctx);
  const optional=await win.UMSHAccountPages.requireSession('my',{optional:true});
  assert.equal(redirects.length,0);
  assert.equal(Boolean(optional),mode==='member');
  await win.UMSHAccountPages.requireSession('profile');
  assert.equal(redirects.length,mode==='member'?0:1);
  passed++;
}
for(const mode of ['guest','member','offline']){
  const user={innerHTML:'guest'},status={},login={hidden:false},memberNode={hidden:true},logout={addEventListener(){}};
  const auth={session:{access_token:'test-only',user:{email:'member@example.test'}},client:{}};
  let requests=0;
  const win={UMSHAccountPages:{mountAccountChrome(){},requireSession:async(_entry,opts)=>{assert.equal(opts.optional,true);if(mode==='offline')throw Error('offline');return mode==='member'?auth:null},authHeaders:()=>({Authorization:'Bearer test-only'}),escapeHtml:s=>s}};
  const doc={querySelector:s=>({'[data-my-user]':user,'[data-my-status]':status,'[data-my-login]':login,'[data-my-logout]':logout}[s]),querySelectorAll:()=>[memberNode]};
  vm.runInNewContext(mySource,{window:win,document:doc,fetch:async()=>{requests++;return{ok:true,json:async()=>({profile:null})}}});
  await new Promise(r=>setImmediate(r));
  assert.equal(requests,mode==='member'?1:0);
  assert.equal(memberNode.hidden,mode!=='member');
  assert.equal(login.hidden,mode==='member');
  passed++;
}
console.log(`${passed} public-MY/session cases passed`);
