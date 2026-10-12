import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
const base=process.cwd(),scratch=base+'/.cache/line-ending-review'
process.chdir(base);fs.mkdirSync(scratch,{recursive:true})
const files=execFileSync('git',['diff','HEAD','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(f=>f.startsWith('src/')&&f.endsWith('.ts'))
for(const file of files){let original;try{original=execFileSync('git',['show','HEAD:'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore']})}catch{continue}
 const current=fs.readFileSync(file,'utf8'),old=original.replace(/\r\n?/g,'\n'),now=current.replace(/\r\n?/g,'\n')
 if(old===now){fs.writeFileSync(file,original);continue}
 const oldLines=old.split('\n'),lines=now.split('\n'),ends=original.match(/\r?\n/g)||[],def=ends.filter(x=>x==='\r\n').length>ends.length/2?'\r\n':'\n'
 fs.writeFileSync(scratch+'/old',old);fs.writeFileSync(scratch+'/new',now)
 let diff='';try{diff=execFileSync('git',['diff','--no-index','--unified=0','--',scratch+'/old',scratch+'/new'],{encoding:'utf8',stdio:['ignore','pipe','ignore']})}catch(e){diff=String(e.stdout||'')}
 const mapped=[];let oi=0,ni=0
 for(const h of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)){
  const os=Number(h[1]),oc=h[2]===undefined?1:Number(h[2]),ns=Number(h[3]),nc=h[4]===undefined?1:Number(h[4]),start=nc===0?ns:ns-1
  while(ni<start){mapped[ni++]=ends[oi++]||def}
  for(let k=0;k<nc;k++)mapped[start+k]=def
  oi=(oc===0?os:os-1)+oc;ni=start+nc
 }
 while(ni<lines.length){mapped[ni++]=ends[oi++]||def}
 fs.writeFileSync(file,lines.map((line,i)=>line+(i<lines.length-1?(mapped[i]||def):'')).join(''))
}
function clean(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+d.name;if(d.isDirectory())clean(p);else if(/\.(html|js)$/.test(d.name)){const before=fs.readFileSync(p,'utf8');const after=before.replace(/^[\t ]+\r?$/gm,'').replace(/(?:\r?\n){2,}$/,'\n');if(after!==before)fs.writeFileSync(p,after)}}}
clean('.vercel-localized');fs.rmSync(scratch,{recursive:true,force:true});console.log('Preserved original unchanged source line endings; cleaned blank whitespace in localized outputs')
