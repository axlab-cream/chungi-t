import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStoredTranslationRequest, acceptStoredTranslation, projectStoredTranslation, generateTranslate, numericTokens, type StoredTranslationRequest, type StoredTranslationProvider } from '../../src/i18n/stored-result-translation.js'
import { MemoryLocaleCopyStore, FileLocaleCopyStore, SupabaseLocaleCopyStore, localizedStoredResult, localeCopyKey, type LocaleCopyIdentity } from '../../src/i18n/stored-result-locale-store.js'

const original = () => ({
 reportId:'original-report', resultId:'stable-result', status:'complete', title:'돈의 흐름', subtitle:'차분한 해석', publicUrl:'/r/stable-result', isPaid:true,
 owner:{email:'private@example.com',accessToken:'DO_NOT_SEND'}, birth:{year:1988}, context:{question:'PRIVATE_QUESTION'}, corpus:{fingerprint:'TECHNICAL'},
 sections:[0,1,2].map(i => ({ id:'stable-'+i,order:i,imageSrc:'/assets/chart.webp',imageKey:'stable-key',imageAlt:'흐름을 보여주는 장면',category:'돈',categoryEn:'money',classification:'성향',generationId:'gen-'+i,status:'complete',hook:'차분하게 살펴보자',interpretation:'2024년에는 2번 점검하되 결과를 보장하지 않아.',attempts:[{raw:'PRIVATE_RAW'}],storytelling:{feel:'마음이 바빠져',actions:['천천히 확인해'],tableMd:'| 항목 | 횟수 |\n| 확인 | 2 |',chartPoints:[{label:'현재',value:2,note:'참고만 해'}]}})),
 verdict:{statement:'큰 결정보다 작은 점검을 권해',decidedAt:'2024-01-01',rankedChoices:['작은 점검']}, summary:{text:'조용히 살펴보는 흐름',status:'complete'},highlights:[{title:'핵심',text:'결과는 보장하지 않아',status:'complete'}]
})
function request(access:'paid'|'preview'='paid',source=original(),locale:'en'|'ja'='en') {return createStoredTranslationRequest({source,locale,ownerId:'owner-A',authorizedOwnerId:'owner-A',access})}
function response(req:Readonly<StoredTranslationRequest>) { return {sourceHash:req.sourceHash,locale:req.locale,fields:req.fields.map(field=>({pointer:field.pointer,text:field.ko==='2024년에는 2번 점검하되 결과를 보장하지 않아.'?'In 2024, check 2 times; outcomes are not guaranteed.':field.ko.includes('| 항목 |')?'| Item | Count |\n| Check | 2 |':req.locale==='ja'?'静かに確認してね':'Check gently, without guarantees.'}))} }
const provider:StoredTranslationProvider={async translate(req){return response(req)}}
const identity = (req=request(), ownerId='owner-A'):LocaleCopyIdentity=>({ownerId,reportId:'original-report',sourceHash:req.sourceHash,locale:req.locale,access:req.access,version:'stored-translation-v2'})

test('provider receives only allowed human prose, not raw customer private fields',()=>{
 const req=request(); const json=JSON.stringify(req)
 for(const forbidden of ['PRIVATE_QUESTION','private@example.com','DO_NOT_SEND','PRIVATE_RAW','TECHNICAL','stable-result','stable-key'])assert.ok(!json.includes(forbidden))
 assert.ok(req.fields.every(f=>!f.pointer.startsWith('/verdict/rankedChoices/')))
 assert.ok(req.fields.some(f=>f.pointer==='/sections/0/storytelling/chartPoints/0/note'))
 assert.ok(!req.fields.some(f=>f.pointer.endsWith('/value')))
 assert.ok(Object.isFrozen(req.fields))
})
test('translated projection preserves original and binding/technical identities',()=>{
 const source=original(); const before=JSON.stringify(source);const snapshot=acceptStoredTranslation(request('paid',source),response(request('paid',source)))
 const projected=projectStoredTranslation(source,snapshot)
 assert.equal(JSON.stringify(source),before);assert.equal(projected.reportId,source.reportId);assert.equal(projected.resultId,source.resultId);assert.equal(projected.sections[0].generationId,'gen-0');assert.equal(projected.sections[0].imageSrc,'/assets/chart.webp');assert.equal(projected.isPaid,true)
 assert.equal(projected.resultLocale,'en');assert.equal(projected.sourceLocale,'ko');assert.ok(!projected.owner);assert.ok(!projected.sections[0].attempts)
})
test('preview copy has only first two allowed sections and no paid blocks',()=>{
 const source=original();const req=request('preview',source);const p=projectStoredTranslation(source,acceptStoredTranslation(req,response(req)))
 assert.equal(p.sections.length,2);assert.equal(p.summary,undefined);assert.equal(p.verdict,undefined);assert.equal(p.highlights,undefined)
 assert.equal(p.isPaid,false);assert.equal(p.paid,false);assert.equal(p.entitlement,'preview')
 assert.ok(!req.fields.some(f=>f.pointer.startsWith('/sections/2')))
 assert.notEqual(req.sourceHash,request('paid',source).sourceHash)
})
test('incomplete original, wrong owner and unknown locales are rejected',()=>{
 assert.throws(()=>request('paid',{...original(),status:'pending'}),/COMPLETE_ORIGINAL_REQUIRED/)
 assert.throws(()=>createStoredTranslationRequest({source:original(),locale:'en',ownerId:'owner-A',authorizedOwnerId:'owner-B',access:'paid'}),/ACCESS_DENIED/)
 assert.throws(()=>createStoredTranslationRequest({source:original(),locale:'en-US',ownerId:'A',authorizedOwnerId:'A',access:'paid'}),/UNSUPPORTED/)
})
test('numbers/units and protected quotations survive or fail closed',()=>{
 assert.deepEqual(numericTokens('₩9,900 · 10%'),numericTokens('9900 KRW · 10 percent'))
 const source=original();source.sections[0].interpretation='직접 한 말: “잘하고 싶어” 2번'
 const req=createStoredTranslationRequest({source,locale:'en',ownerId:'A',authorizedOwnerId:'A',access:'paid',protectedQuotes:['“잘하고 싶어”']})
 const good=response(req);good.fields.find(f=>f.pointer==='/sections/0/interpretation')!.text='Your words: “잘하고 싶어”, 2 times'
 assert.doesNotThrow(()=>acceptStoredTranslation(req,good))
 good.fields.find(f=>f.pointer==='/sections/0/interpretation')!.text='Your words: “잘하고 싶어”, 3 times'
 assert.throws(()=>acceptStoredTranslation(req,good),/FACTS_CHANGED/)
 const changed=response(request());changed.fields.find(f=>f.pointer==='/sections/0/interpretation')!.text='In 2025 check 2 times'
 assert.throws(()=>acceptStoredTranslation(request(),changed),/FACTS_CHANGED/)
})
test('duplicate, replaced pointer, wrong hash and wrong output language fail',()=>{
 const req=request();const dup=response(req);dup.fields[1].pointer=dup.fields[0].pointer
 assert.throws(()=>acceptStoredTranslation(req,dup),/INVALID_TRANSLATION_FIELD/)
 const extra=response(req);extra.fields[0].pointer='/owner/email'
 assert.throws(()=>acceptStoredTranslation(req,extra),/FACTS_CHANGED/)
 assert.throws(()=>acceptStoredTranslation(req,{...response(req),sourceHash:'wrong'}),/IDENTITY_MISMATCH/)
 const korean=response(req);korean.fields[0].text='아직 번역되지 않음'
 assert.throws(()=>acceptStoredTranslation(req,korean),/WRONG_LANGUAGE/)
})
test('changed source is stale; harmless object key order and private metadata do not trigger translation',()=>{
 const source=original();const req=request('paid',source);const snapshot=acceptStoredTranslation(req,response(req))
 const reordered=Object.fromEntries(Object.entries(source).reverse())
 assert.doesNotThrow(()=>projectStoredTranslation(reordered,snapshot))
 source.context.question='NEW_PRIVATE';assert.doesNotThrow(()=>projectStoredTranslation(source,snapshot))
 source.sections[0].interpretation='새로운 본문';assert.throws(()=>projectStoredTranslation(source,snapshot),/STALE/)
})
test('getter, unsafe key, oversized source and invalid JSON output are rejected',()=>{
 const source=original();Object.defineProperty(source,'title',{get(){throw Error('GETTER_RAN')},enumerable:true})
 assert.throws(()=>request('paid',source),/ACCESSOR_FIELD/)
 const proto=original() as any;proto.sections[0].storytelling=JSON.parse('{"__proto__":"pollute"}')
 assert.throws(()=>request('paid',proto),/UNSAFE_DATA_KEY/)
 const big=original();big.sections[0].interpretation='가'.repeat(180001)
 assert.throws(()=>request('paid',big),/TOO_LARGE/)
 const out=response(request());(out.fields[0] as any).hidden=undefined
 assert.throws(()=>acceptStoredTranslation(request(),out),/NON_JSON_DATA/)
})
test('missing copy reads cause zero provider calls; write/reuse is locale+scope+owner isolated',async()=>{
 const store=new MemoryLocaleCopyStore();const source=original();let calls=0
 const fake:StoredTranslationProvider={async translate(req){calls++;return response(req)}}
 const base={source,reportId:source.reportId,ownerId:'owner-A',authorizedOwnerId:'owner-A',locale:'en' as const,access:'paid' as const,store,provider:fake}
 assert.equal((await localizedStoredResult(base)).state,'missing');assert.equal(calls,0)
 const written=await localizedStoredResult({...base,generate:true});assert.equal(written.state,'translated');assert.equal(calls,1)
 const read=await localizedStoredResult(base);assert.equal(read.state,'translated');assert.equal(calls,1)
 assert.notEqual(localeCopyKey(identity()),localeCopyKey(identity(request(),'owner-B')))
 assert.notEqual(localeCopyKey(identity()),localeCopyKey(identity(request('preview'))))
 assert.equal((await localizedStoredResult({...base,locale:'ja'})).state,'missing')
 await assert.rejects(()=>store.get(identity(),'owner-B'),/ACCESS_DENIED/)
})
test('file store persists isolated locale copies and never needs original records',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'umsh-locale-copy-'))
 try{
 const base={source:original(),reportId:'original-report',ownerId:'owner-A',authorizedOwnerId:'owner-A',locale:'en' as const,access:'paid' as const}
 const first=await localizedStoredResult({...base,store:new FileLocaleCopyStore(dir),generate:true,provider});assert.equal(first.state,'translated')
 const second=await localizedStoredResult({...base,store:new FileLocaleCopyStore(dir)});assert.equal(second.state,'translated')
 } finally {await rm(dir,{recursive:true,force:true})}
})
test('cancelled generation and provider errors do not persist a copy',async()=>{
 const req=request();const controller=new AbortController();controller.abort()
 await assert.rejects(()=>generateTranslate({request:req,provider,signal:controller.signal}),/CANCELLED/)
 const store=new MemoryLocaleCopyStore();const base={source:original(),reportId:'original-report',ownerId:'owner-A',authorizedOwnerId:'owner-A',locale:'en' as const,access:'paid' as const,store}
 await assert.rejects(()=>localizedStoredResult({...base,generate:true,provider:{async translate(){throw Error('FAKE_PROVIDER_FAILED')}}}),/FAKE_PROVIDER_FAILED/)
 assert.equal((await localizedStoredResult(base)).state,'missing')
})
test('Supabase store checks actor before network and never exposes server credentials in error',async()=>{
 let calls=0;const store=new SupabaseLocaleCopyStore({url:'https://example.supabase.co',serviceKey:'SERVER_SECRET_DO_NOT_PRINT',fetch:async()=>{calls++;return new Response('{}',{status:403})}})
 await assert.rejects(()=>store.get(identity(),'wrong'),/ACCESS_DENIED/);assert.equal(calls,0)
 await assert.rejects(()=>store.get(identity(),'owner-A'),/^Error: TRANSLATION_STORE_READ_FAILED_403$/);assert.equal(calls,1)
})

test('qualitative flow values are prose, chart numeric values remain untouched',()=>{
 const source=original() as any;source.sections[0].storytelling.flowSteps=[{label:'지금',value:'천천히',note:'확인해'}]
 const req=request('paid',source)
 assert.ok(req.fields.some(field=>field.pointer==='/sections/0/storytelling/flowSteps/0/value'))
 assert.ok(!req.fields.some(field=>field.pointer==='/sections/0/storytelling/chartPoints/0/value'))
 const p=projectStoredTranslation(source,acceptStoredTranslation(req,response(req)))
 assert.equal(p.sections[0].storytelling.chartPoints[0].value,2)
 assert.equal(p.sections[0].storytelling.flowSteps[0].value,'Check gently, without guarantees.')
})
test('Japanese output and locale identity are separately validated',()=>{
 const req=request('paid',original(),'ja');const output=response(req)
 assert.doesNotThrow(()=>acceptStoredTranslation(req,output))
 const wrong={...output,locale:'en'};assert.throws(()=>acceptStoredTranslation(req,wrong),/IDENTITY_MISMATCH/)
 const english=output.fields.map(field=>({...field,text:field.text.replaceAll('静かに確認してね','Check gently')}))
 assert.throws(()=>acceptStoredTranslation(req,{...output,fields:english}),/WRONG_LANGUAGE/)
})
