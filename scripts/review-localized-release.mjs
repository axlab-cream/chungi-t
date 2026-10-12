import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
const original=execFileSync('git',['show','HEAD:src/saju/calculator.ts'])
let working=fs.readFileSync('src/saju/calculator.ts','utf8')
const cr=original.includes(13)
working=working.replace(/\r?\n/g,cr?'\r\n':'\n')
fs.writeFileSync('src/saju/calculator.ts',working)
for(const l of ['en','ja']){
 const t=fs.readFileSync('.vercel-localized/'+l+'/portal.html','utf8')
 console.log(l,'already prefixed assets:',(t.match(/(?:src|poster)="\/(en|ja)\/assets\/[^" ]+/g)||[]).length)
}
