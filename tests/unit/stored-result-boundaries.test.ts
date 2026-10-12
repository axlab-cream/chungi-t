import test from 'node:test'
import assert from 'node:assert/strict'
import {createStoredTranslationRequest,acceptStoredTranslation,projectStoredTranslation} from '../../src/i18n/stored-result-translation.js'

test('routing enums and original choice values are never sent as translation fields or rewritten',()=>{
 const original={reportId:'r',status:'complete',title:'해석',sections:[{id:'s',status:'complete',category:'연애',classification:'궁합',hook:'안내',interpretation:'설명'}],verdict:{statement:'조언',rankedChoices:['종합','customer-option-A'],decidedAt:'2026-10-12'}}
 const before=JSON.stringify(original)
 const request=createStoredTranslationRequest({source:original,locale:'en',ownerId:'owner',authorizedOwnerId:'owner',access:'paid'})
 assert.ok(request.fields.every(f=>!f.pointer.endsWith('/category')&&!f.pointer.endsWith('/classification')&&!f.pointer.includes('/rankedChoices/')))
 const accepted=acceptStoredTranslation(request,{sourceHash:request.sourceHash,locale:'en',fields:request.fields.map(f=>({pointer:f.pointer,text:'A qualified interpretation.'}))})
 const copy=projectStoredTranslation(original,accepted)
 assert.equal(copy.sections[0].category,'연애')
 assert.equal(copy.sections[0].classification,'궁합')
 assert.deepEqual(copy.verdict.rankedChoices,['종합','customer-option-A'])
 assert.equal(JSON.stringify(original),before)
})

test('empty authorised preview is not marked as a translated result',()=>{
 assert.throws(()=>createStoredTranslationRequest({source:{reportId:'r',status:'complete',sections:[]},locale:'en',ownerId:'owner',authorizedOwnerId:'owner',access:'preview'}),/TRANSLATION_SOURCE_PROSE_EMPTY/)
})
