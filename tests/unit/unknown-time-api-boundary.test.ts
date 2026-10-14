import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { readBirthClock } from '../../src/saju/birth-time-certainty.js'
const source=fs.readFileSync(new URL('../../src/server/app.ts',import.meta.url),'utf8')
const ast=ts.createSourceFile('app.ts',source,ts.ScriptTarget.Latest,true)
function actual(name:string){const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return ts.transpileModule(node.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText}
const asObject=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v)?v:{}
function run(code:string,values:any={}){return vm.runInNewContext(code,{asObject,readBirthClock,InputError:Error,readBirthTimeZone:(v:any)=>v,readBirthTimeDisambiguation:(v:any)=>v,...values})}
test('actual chat certainty resolves all explicit false sources and inherits parent certainty',()=>{const fn=actual('resolveChatBirthTimeKnown');for(const body of [{birthTimeKnown:false},{context:{birthTimeKnown:false}},{birth:{birthTimeKnown:false}}])for(const parent of [true,false])assert.equal(run(fn+'\nresolveChatBirthTimeKnown(body,parent)',{body,parent}),false);assert.equal(run(fn+'\nresolveChatBirthTimeKnown({},true)'),undefined);assert.equal(run(fn+'\nresolveChatBirthTimeKnown({birthTimeKnown:true},true)'),undefined);assert.equal(run(fn+'\nresolveChatBirthTimeKnown({},false)'),true)})
test('actual generic birth parser never converts empty known hour into midnight',()=>{const fn=actual('parseBirth');const birth={year:1990,month:1,day:2,gender:'female',calendar:'solar'};assert.throws(()=>run(fn+'\nparseBirth(body)',{body:{...birth,hour:'',minute:0}}));assert.equal(run(fn+'\nparseBirth(body).hour',{body:{...birth,hour:0,minute:0}}),0);assert.equal(run(fn+'\nparseBirth(body).hour',{body:{...birth,birthTimeKnown:false}}),12)})
test('unknown stored love report does not derive monthly signals outside projection',()=>{const block=source.match(/    const loveReportYear =[^\n]+\n    const loveMonthlySignals =[\s\S]*?\n      : undefined/)?.[0];assert.ok(block);const forbidden=new Proxy({},{get(){assert.fail('Unknown analysis must not drive monthly timing')}});assert.equal(run(block+'\nloveMonthlySignals',{record:{context:{birthTimeKnown:false,serviceKey:'love_this_year'},analysis:forbidden},analysis:forbidden,LOVE_THIS_YEAR_SERVICE_KEY:'love_this_year',calculateLoveMonthlySignals(){assert.fail('Unknown monthly chart')}}),undefined)})
test('chat route passes resolved certainty to both parsing and generation',()=>{assert.ok(source.includes('birthTimeKnown: chatBirthTimeKnown !== false'));assert.ok(source.includes('birthTimeKnown: chatBirthTimeKnown,'));assert.ok(!source.includes('birthTimeKnown: req.body.birthTimeKnown !== false,'))})
