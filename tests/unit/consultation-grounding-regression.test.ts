import test from 'node:test'
import assert from 'node:assert/strict'
import {validConsultationLanguage,consultationLanguageSystem} from '../../src/i18n/consultation-language.js'

test('independently rejected live-sample assertions are blocked before save/charge',()=>{
 assert.equal(validConsultationLanguage('Adding even two minutes of friction between an impulse and checkout breaks the automatic habit.','en'),false)
 assert.equal(validConsultationLanguage('君の命式は土の気が強くて貯める力はある。','ja'),false)
 assert.equal(validConsultationLanguage('食神の巡りで日々の心地よさにお金が流れやすい。','ja'),false)
})
test('small conditional actions remain available without inventing affordability or timing',()=>{
 assert.equal(validConsultationLanguage('Review which subscriptions you still use, and check the contract before cancelling one. What are your essential monthly expenses?','en'),true)
 assert.equal(validConsultationLanguage('まずはサブスクの利用状況を確認してみよう。解約するなら契約条件も見てね。毎月の生活費はどのくらい？','ja'),true)
 assert.equal(consultationLanguageSystem('Korean original','ko'),'Korean original')
 assert.match(consultationLanguageSystem('base','en'),/cannot establish saving ability/)
 assert.match(consultationLanguageSystem('base','ja'),/命式だけで貯める力/)
})
