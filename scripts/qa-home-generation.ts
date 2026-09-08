import '../src/env/load.js'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { analyzeSaju } from '../src/saju/analyzer.js'
import { buildTemplateSajuReport, buildOpenAiSajuReportSection } from '../src/report/report-generator.js'
import { InterpretationQualityError } from '../src/report/interpretation-validation.js'
import type { BirthInput, SajuReportContext, SajuReportSection } from '../src/types/index.js'

// Synthetic QA input, not the customer's saved record. No database writes.
const birth: BirthInput = {year:1990,month:4,day:12,hour:12,minute:0,gender:'female',calendar:'solar',isLeapMonth:false}
const context: SajuReportContext = {serviceKey:'home_fit',name:'검수 샘플',target:'본인',birthTimeKnown:false,concern:'집에서는 조용하지만 아침에 피곤한 느낌이 있어요.',home:{buildingType:'아파트',livingPeriod:'3년 이상',mainPurpose:'잠·회복',stayDecision:'계속 거주',painPoints:['잠·피로'],entranceFlow:'꺾여 들어오는 구조',bedroomFeel:'조용한 편',deskPosition:'등 뒤가 벽',outsideFlow:'트인 편',terrainEvidence:{siteSimilarityScore:82,siteSimilarityLabel:'도심 평지형 주거 터',siteArchetype:'생활 편의형 안정 터',similarCases:['출퇴근 동선은 편하지만 밤 조명과 소음이 회복감을 흔드는 집','주변 편의성은 높고 침실 자극 조절이 만족도를 좌우하는 집']}}}
const analysis = analyzeSaju(birth)
const template = buildTemplateSajuReport(analysis,birth,context)
const dir='output/home-generation-qa-v9-site-similarity'
mkdirSync(dir,{recursive:true})
const file=dir+'/generated.json'
const result: {kind:string;birth:BirthInput;context:SajuReportContext;sections:SajuReportSection[];attempts:unknown[]} = existsSync(file) ? JSON.parse(readFileSync(file,'utf8')) : {kind:'synthetic-input-live-model-QA-not-saved-customer-report',birth,context,sections:[],attempts:[]}
async function generateSection(base: SajuReportSection) {
  if(result.sections.some(s=>s.id===base.id)) return
  let issues: string[]=[]
  for(let attempt=1;attempt<=3;attempt++) {
    try {
      const section = await buildOpenAiSajuReportSection(analysis,birth,base.id,context,base,{siblings:result.sections,repairIssues:issues})
      result.sections.push(section)
      result.attempts.push({id:base.id,attempt,ok:true})
      console.log(JSON.stringify({id:base.id,ok:true,attempt,characters:section.interpretation.length,model:section.model}))
      break
    } catch(error) {
      issues=error instanceof InterpretationQualityError ? error.review.issues : []
      result.attempts.push({id:base.id,attempt,ok:false,errorType:error instanceof Error ? error.name:'Unknown',issues})
      console.log(JSON.stringify({id:base.id,ok:false,attempt,issues}))
      if(!issues.length) break
    } finally { writeFileSync(file,JSON.stringify(result,null,2),'utf8') }
  }
}
for (let i=0;i<template.sections.length;i+=2) {
  await Promise.all(template.sections.slice(i,i+2).map(generateSection))
}
result.sections.sort((a,b)=>a.order-b.order)
writeFileSync(file,JSON.stringify(result,null,2),'utf8')
console.log(JSON.stringify({completed:result.sections.length,total:template.sections.length}))
if(result.sections.length!==template.sections.length) process.exitCode=1
