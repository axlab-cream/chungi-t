import {readFileSync,writeFileSync} from 'node:fs'
const dir='output/home-generation-qa-v9-site-similarity'
const result=JSON.parse(readFileSync(dir+'/generated.json','utf8'))
const prior=JSON.parse(readFileSync('output/home-generation-qa-v2/generated.json','utf8'))
const sentences=s=>s.interpretation.replace(/\[[^\]]+\]/g,'').split(/(?<=[.!?])\s+|\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>=45)
const pairs=[]
for(let i=0;i<result.sections.length;i++)for(let j=i+1;j<result.sections.length;j++){
 const other=new Set(sentences(result.sections[j]));const shared=sentences(result.sections[i]).filter(s=>other.has(s))
 if(shared.length)pairs.push({a:result.sections[i].id,b:result.sections[j].id,shared})
}
const metrics=sections=>({total:sections.length,dayMasterDefinitions:sections.filter(s=>/일간\s*[（(은이가:]|태어난 날의 천간/.test(s.interpretation)).length,inputRecaps:sections.filter(s=>s.id!=='home-fit-overall'&&/확인된 입력|입력하셨|현재 입력|현재 항목|이 항목에서는/.test(s.interpretation)).length,publicEvidenceLabels:sections.filter(s=>/(터 유사도|측정값|사용자 체감|계산값|전통 상징)/.test(s.interpretation)).length,actionMetadata:sections.filter(s=>/(오늘|7일)[^.\n]{0,80}(비용|난이도|관찰 지표)/.test(s.interpretation)).length,customerBadDataLabels:sections.filter(s=>/측정\s*전|자료\s*(?:없|미확인|부족)|DEM/.test(s.interpretation)).length})
const review={before:metrics(prior.sections),after:metrics(result.sections),exactLongSentenceOverlaps:pairs,attempts:result.attempts}
writeFileSync(dir+'/editorial-review.json',JSON.stringify(review,null,2))
writeFileSync(dir+'/readings.md','# 집 풍수 개선 후 실제 생성 샘플\n\n터 유사도 포함 가상 검수 입력입니다. 개인 저장 리포트 원본은 아니며, 아래는 12장 생성 원문과 자동 문구 검수 결과입니다.\n\n'+result.sections.map(s=>'## '+s.category+'\n\n'+s.hook+'\n\n'+s.interpretation).join('\n\n---\n\n'))
console.log(JSON.stringify(review,null,2))
