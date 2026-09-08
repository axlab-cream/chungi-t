import '../src/env/load.js'
import { analyzeSaju } from '../src/saju/analyzer.js'
import { buildWeddingContext, buildWeddingReport, buildWeddingTeaser, parseWeddingRequest } from '../src/day/wedding-service.js'
import { buildOpenAiSajuReportSection } from '../src/report/report-generator.js'
import type { BirthInput, SajuReportContext } from '../src/types/index.js'
const birth: BirthInput = {year:1990,month:4,day:12,hour:12,minute:0,gender:'female',calendar:'solar',isLeapMonth:false}
const input = parseWeddingRequest({candidateDate1:'2027-05-15',candidateDate2:'2027-05-22',candidateDate3:'2027-10-09',partnerBirth:'1988-03-11',partnerTime:'14:30',format:'예식장',familyLimit:'가족 일정 조율 필요'})
const analysis = analyzeSaju(birth)
const teaser = buildWeddingTeaser(analysis,input)
const context: SajuReportContext = {...buildWeddingContext('샘플',input),birthTimeKnown:true,wedding:{facts:teaser.frame,teaser:{headline:teaser.headline,lines:teaser.lines}}}
const report = buildWeddingReport(analysis,birth,context,input,'local-qa-only')
await Promise.all(['1-1','6-1'].map(async id => {
  try {
    const section = await buildOpenAiSajuReportSection(analysis,birth,id,context,report.sections.find(s=>s.id===id),{siblings:report.sections})
    console.log(JSON.stringify({id,ok:true,model:section.model,characters:section.interpretation.length,paragraphs:section.interpretation.split(/\n\s*\n/).length,hook:section.hook,interpretation:section.interpretation}))
  } catch(error) {
    // Never print API error objects, request headers or credentials.
    console.log(JSON.stringify({id,ok:false,errorType:error instanceof Error ? error.name : 'UnknownError'}))
    process.exitCode=1
  }
}))
