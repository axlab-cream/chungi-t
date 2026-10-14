import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = (name: string) => readFileSync(new URL('../../사주/js/' + name + '-service.js', import.meta.url), 'utf8');
function actual(name: string, fn: string, globals: any = {}) {
 const text=source(name),start=text.indexOf('function '+fn+'(');assert.notEqual(start,-1);const body=text.indexOf('{',start);let depth=1,end=body+1;
 while(depth && end<text.length){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++;}
 return vm.runInNewContext('('+text.slice(start,end)+')',{BIRTH_TIME_UNKNOWN:'UNKNOWN',pad2:(v:any)=>String(v).padStart(2,'0'),...globals});
}
const draft=(time:string,known?:boolean)=>({service_key:'love_thisyear',profile_mode:'new_profile',birth_date:'1990-02-03',birth_time:time,birthTimeKnown:known,gender:'female',calendar_type:'solar',relationship_status:'single',partner_star_basis:'gender_auto'});
for(const [clock,known] of [['',false],['12:00',false],['00:00',true],['23:59',true]] as const)test('thisyear actual request '+clock+' / '+known,()=>{const p=actual('thisyear','buildRequest')(draft(clock,known));assert.equal(p.selfBirthTimeKnown,known);if(known)assert.equal(p.selfBirth.hour,Number(clock.slice(0,2)));else assert.equal(p.selfBirth.hour,undefined);});
for(const clock of ['','24:00','12','08:60'])test('thisyear rejects known invalid '+clock,()=>assert.equal(actual('thisyear','buildRequest')(draft(clock,true)),null));
function form(time:string,unknown:boolean){const values:any={'#name':{value:'Test'},'#birth':{value:'1990-02-03'},'#time':{value:time},'#gender':{value:'여성'},'#birthTimeUnknown':{checked:unknown}};return{querySelector:(s:string)=>values[s]};}
for(const [clock,unknown] of [['',true],['12:00',true],['00:00',false],['23:59',false]] as const)test('pass actual cache handler '+clock+' / '+unknown,()=>{let saved='';const p=actual('pass-angle','saveProfileFromForm',{storageAvailable:()=>true,localStorage:{setItem:(_:any,v:any)=>saved=v},STORAGE:{userProfile:'profile'}})(form(clock,unknown));assert.equal(p.birthTimeKnown,!unknown);assert.equal(JSON.parse(saved).birthTimeKnown,!unknown);if(unknown)assert.equal(p.birth.hour,undefined);});
for(const clock of ['','24:00','09:60'])test('pass rejects unmarked invalid '+clock,()=>assert.equal(actual('pass-angle','saveProfileFromForm',{storageAvailable:()=>false})(form(clock,false)),null));
for(const name of ['thisyear','lucky'])test(name+' actual formatter respects unknown noon',()=>{const label=actual(name,'formatBirth')({birthTimeKnown:false,birth:{year:1990,month:2,day:3,hour:12}});assert.match(label,/UNKNOWN/);assert.doesNotMatch(label,/12시/);});
test('pass actual saved cache never infers null as midnight',()=>{const p=actual('pass-angle','readSavedProfile',{localGet:()=>({name:'Test',birth:{year:1990,month:2,day:3,hour:null,gender:'female'}}),STORAGE:{userProfile:'profile'}})();assert.equal(p.profile.birthTimeKnown,false);assert.equal(p.profile.birth.hour,undefined);});
for(const clock of ['', '24:00','08:60'])test('quit rejects actual invalid known '+clock,()=>{const f=form(clock,false);const query=f.querySelector;f.querySelector=(s:string)=>s==='#name'?{value:'홍길동'}:query(s);assert.equal(actual('quit','saveProfileFromForm',{readGender:()=> 'female',writeJson:()=>{},STORAGE:{profile:'p'}})(f,{}),null);});
for(const [clock,certainty] of [['00:00','known'],['23:59','known'],['12:00','unknown']] as const)test('marry actual partner clock '+clock+' / '+certainty,()=>{const p=actual('marry','buildRequest',{RELATION_LABEL:{},FOCUS_LABEL:{}})({partner:{known:true,birth_date:'1990-02-03',birth_time:clock,birth_time_known:certainty}});assert.equal(p.partnerBirthTimeKnown,certainty==='known');assert.equal(p.partnerBirth.hour,certainty==='known'?Number(clock.slice(0,2)):undefined);});
for(const clock of ['', '24:00', '08:60'])test('marry rejects known invalid partner '+clock,()=>assert.equal(actual('marry','buildRequest',{RELATION_LABEL:{},FOCUS_LABEL:{}})({partner:{known:true,birth_date:'1990-02-03',birth_time:clock,birth_time_known:'known'}}),null));
test('lucky actual autofill clears unknown noon without synthetic profile',async()=>{
 const text=source('lucky'),start=text.indexOf('async function enhanceSajuInput()'),end=text.indexOf('// ------------------------------------------------------- report retrieval',start);
 const time:any={value:'',disabled:false},unknown:any={checked:false};
 const f:any={name:{value:''},birth:{value:''},time,calendar:{value:''},gender:{value:''},addEventListener:()=>{},querySelector:()=>unknown};
 const fn=vm.runInNewContext('('+text.slice(start,end).trim()+')',{ $:(s:string)=>s==='#sajuForm'?f:s==='.lucky-saved-profile'?{}:null,initAuth:async()=>({}),api:async()=>({profile:{name:'Test',birthTimeKnown:false,birth:{year:1990,month:2,day:3,hour:12,gender:'female'}}}),pad:(v:any)=>String(v).padStart(2,'0') });
 await fn();assert.equal(time.value,'');assert.equal(time.disabled,true);assert.equal(unknown.checked,true);
});
for(const root of ['사주','.vercel-localized/en','.vercel-localized/ja'])for(const prod of ['love/this-year','me/pass-angle','me/lucky'])test(root+'/'+prod+' actual unknown control',()=>{
 const html=readFileSync(new URL('../../'+root+'/'+prod+'/02-step-2-saju-input/index.html',import.meta.url),'utf8');
 const binding=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.startsWith('(()=>{const time='));assert.ok(binding);
 const handlers:any={},time:any={value:'12:00',disabled:false,addEventListener:()=>{},form:{addEventListener:()=>{}}},unknown:any={checked:true,addEventListener:(e:string,fn:any)=>handlers[e]=fn};
 vm.runInNewContext(binding!,{document:{getElementById:(id:string)=>id==='birthTimeUnknown'?unknown:time}});handlers.change();assert.equal(time.value,'');assert.equal(time.disabled,true);unknown.checked=false;handlers.change();assert.equal(time.disabled,false);assert.equal(time.value,'');
});
