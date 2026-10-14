import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const read = (rel:string) => fs.readFileSync(new URL('../../'+rel, import.meta.url), 'utf8')
for(const locale of ['en','ja']) {
  test(`${locale}: missing legacy dependencies retire without publishing fixture reports`,()=>{
    for(const rel of ['flow/newyear/01-step-1-story/index.html','flow/newyear/02-step-2-saju-input/index.html','flow/newyear/04-step-4-report/index.html'])assert.ok(!read(`.vercel-localized/${locale}/${rel}`).includes('src="../assets/app.js"'),rel)
    const couple = read(`.vercel-localized/${locale}/match/couple/06-step-6_1-report-detail/index.html`)
    for(const forbidden of ['src="../06-detail-data.js"','COUPLE_MATCH_DETAIL_DATA','DETAIL_MAP','isLocalReview()'])assert.ok(!couple.includes(forbidden),forbidden)
    for(const slot of ['progress','state','sections'])assert.ok(couple.includes(`data-umsh-slot="${slot}"`))
    assert.ok(couple.includes('id="legacy-detail-content" hidden'))
    assert.ok(couple.includes('#legacy-detail-content[hidden],.rail[hidden],#btn-copy[hidden]{display:none!important}'))
    assert.ok(couple.includes(locale==='en'?'aria-label="Back to preview"':'aria-label="プレビューに戻る"'))
    for(const step of ['04-step-4-report','06-step-6_1-report-detail']){
      const html=read(`.vercel-localized/${locale}/work/job-choice/${step}/index.html`)
      for(const forbidden of ['shared/job-choice-data.js','JobChoice.buildReport','JobChoice.loadJobInput','stage.insertAdjacentHTML'])assert.ok(!html.includes(forbidden),step+' '+forbidden)
      assert.ok(html.includes('/js/umsh-report-access.js'))
      assert.ok(html.includes('/js/jobchoice-service.js'))
    }
  })
  test(`${locale}: lean input helper preserves actual inputs but never creates reports or paid flags`,()=>{
    const source=read(`.vercel-localized/${locale}/work/job-choice/shared/job-choice-input.js`)
    const data=new Map<string,string>();const writes:string[]=[]
    const storage={getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>{writes.push(key);data.set(key,value)}}
    const window:any={};new vm.Script(source).runInNewContext({window,sessionStorage:storage,localStorage:storage,document:{getElementById:()=>null},fetch:()=>assert.fail('No API'),Date:class{static now(){assert.fail('No synthetic IDs')}}})
    const api=window.JobChoice
    for(const name of ['buildReport','buildTeaser','buildDetail','deriveSignal','deriveBirthFacts','markPaid','hasEntitlement','DEMO_INPUT','RAG_EVIDENCE'])assert.equal(api[name],undefined,name)
    assert.equal(api.loadStoredProfile().complete,false)
    assert.equal(writes.length,0)
    const profile={name:'Ana O’Neil',gender:'female',birthDate:'1990-01-02',birthTime:'08:20',birthTimeKnown:true,calendarType:'lunar',birthPlace:'Tokyo',profileId:'private-profile'}
    data.set('umsh_birth_profile',JSON.stringify(profile));assert.equal(api.loadStoredProfile().profile.calendarType,'lunar')
    assert.ok(!/[가-힣]/.test(api.profileLabel(profile)))
    const input={profileSource:'stored_profile',profile,offer:{companyName:'Owner company',roleName:'Analyst',workMode:'remote',commute:'From home',salaryFeeling:'low',decisionDate:'2026-11-01',concernPoint:'Only customer words'}}
    api.saveJobInput(input)
    assert.deepEqual(JSON.parse(data.get('umsh_job_choice_input')!),input)
    assert.deepEqual(writes.sort(),['umsh_job_choice_input','umsh_job_choice_profile'].sort())
    for(const name of ['umsh_job_choice_report','umsh_job_choice_report_id','umsh_job_choice_entitlement'])assert.equal(data.has(name),false,name)
    assert.ok(read(`.vercel-localized/${locale}/work/job-choice/02-step-2-saju-input/index.html`).includes('shared/job-choice-input.js?v=20261014-unknown-time'))
  })
  test(`${locale}: pure signal media controller matches neutral KO behavior without app or report logic`,()=>{
    const source=read(`.vercel-localized/${locale}/love/signal/signal-video.js`)
    assert.equal(source,read('사주/love/signal/signal-video.js'))
    assert.ok(!/fetch\(|sessionStorage|localStorage|payment|entitlement|buildReport/.test(source))
    new vm.Script(source)
  })
}

for (const locale of ['en','ja']) test(`${locale}: actual input-page inline submit saves only inputs and rejects missing fields/storage`, () => {
  const html=read(`.vercel-localized/${locale}/work/job-choice/02-step-2-saju-input/index.html`)
  const inline=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)).map(m=>m[1]).find(s=>s.includes('const form = document.getElementById("jobChoiceForm")'))!
  for(const blockedStorage of [false,true]) for(const storedBirthTimeKnown of [true,false,null]) {
    const handlers:Record<string,Function>={};const data=new Map<string,string>();data.set('umsh_job_choice_report','saved-original-report');data.set('umsh_job_choice_report_id','original-id');data.set('umsh_job_choice_entitlement','original-marker')
    const storage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{if(blockedStorage)throw Error('denied');data.set(k,v)}}
    const classes={add(){},remove(){}};const status={querySelector:()=>({textContent:''})};const toggle={addEventListener:(event:string,fn:Function)=>handlers['toggle:'+event]=fn,textContent:''};const error={textContent:'',classList:classes};const fields={classList:classes}
    const raw={name:'Ana',gender:'female',birthDate:'1990-01-02',birthTime:'08:20',calendarType:'lunar',birthPlace:'Tokyo',companyName:'User company',roleName:'Analyst',workMode:'remote',commute:'Home',salaryFeeling:'low',decisionDate:'2026-11-01',concernPoint:'User words'}
    if(storedBirthTimeKnown !== null) data.set('umsh_job_choice_profile',JSON.stringify({...raw,birthTime:storedBirthTimeKnown?raw.birthTime:'12:00',birthTimeKnown:storedBirthTimeKnown}));
    const form:any={elements:{...Object.fromEntries(Object.entries(raw).map(([k,value])=>[k,{value}])),birthTimeUnknown:{checked:false,addEventListener:(event:string,fn:Function)=>handlers['unknown:'+event]=fn}},addEventListener:(event:string,fn:Function)=>handlers['form:'+event]=fn}
    const nodes:any={jobChoiceForm:form,profileFields:fields,profileStatus:status,toggleProfile:toggle,formError:error};const back={addEventListener:(event:string,fn:Function)=>handlers['back:'+event]=fn}
    const window:any={location:{href:'start',hash:'#step-2-saju-input'},history:{replaceState(){}},addEventListener:(event:string,fn:Function)=>handlers['window:'+event]=fn};const context:any={window,document:{getElementById:(id:string)=>nodes[id]||null,querySelector:()=>back},sessionStorage:storage,localStorage:storage,fetch:()=>assert.fail('No API'),URL,URLSearchParams}
    vm.createContext(context);new vm.Script(read(`.vercel-localized/${locale}/work/job-choice/shared/job-choice-input.js`)).runInContext(context);context.JobChoice=window.JobChoice;new vm.Script(inline).runInContext(context)
    assert.equal(typeof handlers['form:submit'],'function');assert.equal(window.location.href,'start')
    // A complete browser cache is not account provenance. Only the bridge's current account event enables it.
    handlers['form:submit']({preventDefault(){}});assert.equal(window.location.href,'start');assert.equal(data.has('umsh_job_choice_input'),false);assert.ok(error.textContent)
    if(storedBirthTimeKnown !== null) handlers['window:umsh-jobchoice-account-profile']({detail:{profile:{...raw,birthTime:storedBirthTimeKnown?raw.birthTime:'12:00',birthTimeKnown:storedBirthTimeKnown}}})
    form.elements.companyName.value='';let prevented=0;handlers['form:submit']({preventDefault(){prevented++}});assert.equal(window.location.href,'start');assert.ok(error.textContent);assert.equal(data.has('umsh_job_choice_input'),false)
    form.elements.companyName.value=raw.companyName;handlers['form:submit']({preventDefault(){prevented++}});assert.equal(prevented,2)
    if(blockedStorage || storedBirthTimeKnown === null){assert.equal(window.location.href,'start');assert.ok(error.textContent)}else{assert.equal(window.location.href,'../04-step-4-report/index.html#step-4-report');const saved=JSON.parse(data.get('umsh_job_choice_input')!);assert.equal(saved.offer.concernPoint,raw.concernPoint);assert.equal(saved.profile.birthTimeKnown,storedBirthTimeKnown);assert.equal(saved.profile.birthTime,storedBirthTimeKnown?raw.birthTime:'')}
    assert.equal(data.get('umsh_job_choice_report'),'saved-original-report');assert.equal(data.get('umsh_job_choice_report_id'),'original-id');assert.equal(data.get('umsh_job_choice_entitlement'),'original-marker')
  }
})

test('signal videos observe, load once, pause offscreen and honor reduced motion without API',()=>{
  for(const reduced of [false,true]){
    const source=read('.vercel-localized/en/love/signal/signal-video.js');let observerCallback:any;let loaded=0,played=0,paused=0;const observed:any[]=[]
    class Video {dataset={videoSrc:'../assets/signal/videos/01-scene-01-hero.mp4',videoPriority:'normal',signalVideoLoaded:''};src='';preload='';load(){loaded++}play(){played++;return Promise.resolve()}pause(){paused++}matches(){return true}addEventListener(){}closest(){return null}}
    const video=new Video();const window:any={matchMedia:()=>({matches:reduced}),IntersectionObserver:true};const document={querySelectorAll:()=>[video]};class Observer{constructor(callback:any){observerCallback=callback}observe(v:any){observed.push(v)}}
    new vm.Script(source).runInNewContext({window,document,HTMLVideoElement:Video,IntersectionObserver:Observer})
    window.umshSignalVideos.observe();assert.equal(observed.length,reduced?0:1)
    if(reduced){assert.equal(loaded,0);assert.equal(played,0)}else{observerCallback([{target:video,isIntersecting:true}]);observerCallback([{target:video,isIntersecting:true}]);observerCallback([{target:video,isIntersecting:false}]);assert.equal(loaded,1);assert.equal(played,2);assert.equal(paused,1);assert.equal(video.src,video.dataset.videoSrc)}
  }
})

for(const locale of ['en','ja'])test(`${locale}: throwing browser storage getters cannot abort profile lookup or saving`,()=>{
  const source=read(`.vercel-localized/${locale}/work/job-choice/shared/job-choice-input.js`)
  const profile={name:'Owner',gender:'female',birthDate:'1990-01-02',birthTime:'08:20',calendarType:'lunar'}
  const good={getItem:(key:string)=>key==='umsh_job_choice_profile'?JSON.stringify(profile):null,setItem(){}}
  for(const denied of ['local','session','both']){
    const window:any={};const sandbox:any={window}
    Object.defineProperty(sandbox,'sessionStorage',{get(){if(denied==='session'||denied==='both')throw Error('session blocked');return good}})
    Object.defineProperty(sandbox,'localStorage',{get(){if(denied==='local'||denied==='both')throw Error('local blocked');return good}})
    vm.createContext(sandbox);new vm.Script(source).runInContext(sandbox)
    const api=window.JobChoice;assert.equal(api.loadStoredProfile().complete,denied!=='both')
    assert.equal(api.saveJobInput({profile,offer:{}})!==false,denied==='local')
  }
})

for(const locale of ['en','ja'])test(`${locale}: generated input date controls localize labels without changing values`,()=>{
  const groups=['birthDate','decisionDate'].map(name=>{
    const attrs={'aria-label':'생년월일'};const parts=['year','month','day'].map(part=>{const a={'aria-label':part,'data-umsh-ymd-part':part};const option={value:'',textContent:'년'};return {part,value:part==='year'?'2025':'02',options:[option,{value:'02',textContent:'02'}],getAttribute:(k:string)=>(a as any)[k],setAttribute:(k:string,v:string)=>(a as any)[k]=v}})
    return {previousElementSibling:{tagName:'INPUT',name},parts,getAttribute:(k:string)=>(attrs as any)[k],setAttribute:(k:string,v:string)=>(attrs as any)[k]=v,querySelectorAll:()=>parts}
  });const document={readyState:'complete',querySelectorAll:()=>groups,getElementById:()=>null};const sandbox:any={window:{},document};new vm.Script(read(`.vercel-localized/${locale}/work/job-choice/shared/job-choice-input.js`)).runInNewContext(sandbox)
  assert.equal(groups[0].getAttribute('aria-label'),locale==='en'?'Birth date':'生年月日');assert.equal(groups[1].getAttribute('aria-label'),locale==='en'?'Planned start or decision date':'入社予定日・判断予定日')
  for(const group of groups)for(const select of group.parts){const expected=({year:locale==='en'?'Year':'年',month:locale==='en'?'Month':'月',day:locale==='en'?'Day':'日'} as any)[select.part];assert.equal(select.getAttribute('aria-label'),expected);assert.equal(select.options[0].textContent,expected);assert.equal(select.value,select.part==='year'?'2025':'02');assert.equal(select.options[1].value,'02');assert.equal(select.options[1].textContent,'02')}
})
