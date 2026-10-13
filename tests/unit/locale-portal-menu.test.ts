import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

for(const locale of ['en','ja'])test(`${locale} portal visible literals localized while lookup categories stay intact`,()=>{
 const file=new URL(`../../.vercel-localized/${locale}/js/portal.js`,import.meta.url)
 const text=fs.readFileSync(file,'utf8')
 new vm.Script(text)
 const source=ts.createSourceFile('portal.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 const seen:string[]=[]
 function visit(n:ts.Node){
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){
   const s=n.text;if(/[가-힣]/.test(s)){
    if(ts.isPropertyAssignment(n.parent)&&n.parent.name.getText(source)==='category')seen.push(s)
    else assert.ok(['을','를','은','는'].includes(s),`Unexpected Korean display string: ${s}`)
   }
  }else if(ts.isTemplateExpression(n))assert.doesNotMatch(n.getText(source),/[가-힣]/)
  ts.forEachChild(n,visit)
 }
 visit(source)
 assert.ok(seen.includes('연애')&&seen.includes('궁합')&&seen.includes('종합'))
 assert.ok(text.includes(locale==='en'?'Search readings':'鑑定を検索'))
 assert.ok(text.includes(locale==='en'?'You are signed in.':'ログインできたよ。'))
 assert.ok(text.includes(locale==='en'?'Viewed today':'本日は確認済み'))
})
