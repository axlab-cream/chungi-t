import type {Request,Response} from 'express'
import type {ReportOwner,ReportRecord} from '../report/report-store.js'
import {configuredEnv} from '../env/load.js'
import {getReportModel} from '../report/report-generator.js'
import {chatWithOpenAI} from '../llm/openai-adapter.js'
import {localizedStoredResult,SupabaseLocaleCopyStore} from './stored-result-locale-store.js'
import {storedTranslationInstructions} from './stored-result-translation.js'

interface Dependencies {
 authenticate(req:Request,res:Response):Promise<ReportOwner|null>
 lookup(id:string,owner:ReportOwner):Promise<ReportRecord|null>
 entitled(req:Request,owner:ReportOwner,record:ReportRecord):Promise<boolean>
 project(record:ReportRecord,paid:boolean):Record<string,any>
}
const pending=new Set<string>()
/** GET never calls models or repairs original reports. POST translates authorized display prose into a separate row only. */
export function storedResultRoute(d:Dependencies){
 return async(req:Request,res:Response)=>{
  const locale=String(req.params.locale||'')
  if(locale!=='en'&&locale!=='ja'){res.status(400).json({code:'INVALID_LOCALE'});return}
  const id=String(req.params.reportId||'')
  let gate=''
  let acquired=false
  try{
   const owner=await d.authenticate(req,res);if(!owner)return
   const record=await d.lookup(id,owner)
   if(!record){res.status(404).json({code:'REPORT_NOT_FOUND'});return}
   if(record.owner?.id!==owner.id){res.status(403).json({code:'TRANSLATION_ACCESS_DENIED'});return}
   if(record.status!=='complete'){res.status(409).json({code:'ORIGINAL_READING_PENDING',sourceLocale:'ko',resultLocale:locale});return}
   const paid=await d.entitled(req,owner,record)
   const source=d.project(record,paid)
   const visible=JSON.stringify(source)
   const protectedQuotes=[record.context.concern].filter((q):q is string=>typeof q==='string' && q.length>0 && q.length<=4000 && visible.includes(JSON.stringify(q).slice(1,-1)))
   const url=configuredEnv(process.env.SUPABASE_URL)
   const serviceKey=configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
   if(!url||!serviceKey){res.status(503).json({code:'TRANSLATION_STORE_UNAVAILABLE',sourceLocale:'ko',resultLocale:locale});return}
   const generate=req.method==='POST'
   // The bulk migration remains disabled until its durable table is provisioned and reviewed.
   gate=[owner.id,record.reportId,locale,paid?'paid':'preview'].join(':')
   if(generate&&pending.has(gate)){res.status(409).json({code:'TRANSLATION_BUSY'});return}
   if(generate&&pending.size>=2){res.status(429).json({code:'TRANSLATION_BUSY'});return}
   if(generate){pending.add(gate);acquired=true}
   const result=await localizedStoredResult({source,reportId:record.reportId,ownerId:owner.id,authorizedOwnerId:owner.id,locale,access:paid?'paid':'preview',store:new SupabaseLocaleCopyStore({url,serviceKey}),generate,protectedQuotes,
    provider:generate?{translate:async request=>{
     if (request.fields.reduce((n,f)=>n+f.ko.length,0)>12000) throw new Error('TRANSLATION_BATCH_REQUIRED')
     const response=await chatWithOpenAI([{role:'system',content:storedTranslationInstructions(locale)},{role:'user',content:JSON.stringify(request)}],{model:getReportModel(),maxTokens:8000})
     try { return JSON.parse(response) } catch { throw new Error('TRANSLATION_PROVIDER_INVALID_JSON') }
    }}:undefined,
   })
   res.status(result.state==='missing'?404:200).json(result)
  }catch(error){
   const code=error instanceof Error&&/^[A-Z][A-Z0-9_]{1,100}$/.test(error.message)?error.message:'TRANSLATION_FAILED'
   const status=/ACCESS_DENIED/.test(code)?403:/STORE|PROVIDER/.test(code)?503:422
   res.status(status).json({code,sourceLocale:'ko',resultLocale:locale,originalPreserved:true})
  }finally{if(acquired)pending.delete(gate)}
 }
}
