import test from 'node:test'
import assert from 'node:assert/strict'
import {storedResultRoute} from '../../src/i18n/stored-result-route.js'
const owner={id:'member-1'}
const record:any={reportId:'report-1',owner,birth:{year:1990,month:1,day:1,hour:12,gender:'female',calendar:'solar'},context:{},report:{title:'원본',sections:[]},status:'complete'}
function response(){const state:any={status:200};return {state,res:{status(n:number){state.status=n;return this},json(v:any){state.body=v;return this}} as any}}
function request(locale='en',method='GET'){return {params:{reportId:'report-1',locale},method} as any}
test('foreign locale is validated before authentication',async()=>{
 let authenticated=false;const {state,res}=response();await storedResultRoute({authenticate:async()=>{authenticated=true;return owner},lookup:async()=>record,entitled:async()=>true,project:()=>record.report})(request('xx'),res)
 assert.equal(state.status,400);assert.equal(authenticated,false)
})
test('owner mismatch denies translation before entitlement or provider',async()=>{
 let checks=0;const {state,res}=response();await storedResultRoute({authenticate:async()=>owner,lookup:async()=>({...record,owner:{id:'other'}}),entitled:async()=>{checks++;return true},project:()=>record.report})(request('ja','POST'),res)
 assert.equal(state.status,403);assert.equal(checks,0)
})
test('incomplete original is not generated or repaired by translation',async()=>{
 let projected=false;const {state,res}=response();await storedResultRoute({authenticate:async()=>owner,lookup:async()=>({...record,status:'generating'}),entitled:async()=>true,project:()=>{projected=true;return record.report}})(request(),res)
 assert.equal(state.status,409);assert.equal(state.body.code,'ORIGINAL_READING_PENDING');assert.equal(projected,false)
})
test('missing durable configuration fails closed without changing source',async()=>{
 const original=JSON.stringify(record);const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY
 delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY
 try{const {state,res}=response();await storedResultRoute({authenticate:async()=>owner,lookup:async()=>record,entitled:async()=>false,project:(_record,paid)=>{assert.equal(paid,false);return {...record.report,status:'complete',reportId:record.reportId}}})(request('en','POST'),res)
 assert.equal(state.status,503);assert.equal(state.body.code,'TRANSLATION_STORE_UNAVAILABLE');assert.equal(JSON.stringify(record),original)
 }finally{if(oldUrl!==undefined)process.env.SUPABASE_URL=oldUrl;if(oldKey!==undefined)process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey}
})
