import {readFileSync} from 'node:fs'
const {sections}=JSON.parse(readFileSync('output/home-generation-qa-v2/generated.json','utf8'))
const sentences=s=>s.interpretation.replace(/\[[^\]]+\]/g,'').split(/(?<=[.!?])\s+|\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>=45)
const overlaps=[]
for(let i=0;i<sections.length;i++) for(let j=i+1;j<sections.length;j++) {
 const set=new Set(sentences(sections[i])); const shared=sentences(sections[j]).filter(x=>set.has(x))
 if(shared.length) overlaps.push({a:sections[i].id,b:sections[j].id,shared})
}
console.log(JSON.stringify({count:sections.length,overlaps,sections:sections.map(s=>({id:s.id,characters:s.interpretation.length,headings:[...s.interpretation.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1]),rooms:['현관','침실','책상','창밖'].filter(w=>s.interpretation.includes(w)),internal:/풀이\s*\d+|에서 보는 핵심|겁주기보다 확인 방법/.test(s.interpretation)}))},null,2))
