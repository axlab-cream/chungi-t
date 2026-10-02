import { it } from 'node:test'
import assert from 'node:assert/strict'
import { consultationAccess, consumeCredit, type CreditLedger } from '../../src/consultation/credits.js'
it('grants five lifetime answers then blocks sixth, including serialized reload',()=>{
 let ledger:CreditLedger={freeUsed:false,usedByOrder:{}}
 for(let i=0;i<5;i++){assert.equal(consultationAccess(ledger,[]).freeRemaining,5-i);consumeCredit(ledger,[]);ledger=JSON.parse(JSON.stringify(ledger))}
 assert.equal(consultationAccess(ledger,[]).remaining,0)
 assert.throws(()=>consumeCredit(ledger,[]),/CONSULTATION_PAYMENT_REQUIRED/)
})
it('preserves legacy consumed free question and paid/coupon usage',()=>{
 const ledger:CreditLedger={freeUsed:true,usedByOrder:{old:2},usedByCoupon:{coupon:1}}
 assert.equal(consultationAccess(ledger,[]).freeRemaining,4)
 consumeCredit(ledger,[])
 assert.equal(consultationAccess(ledger,[]).freeRemaining,3)
 assert.deepEqual(ledger.usedByOrder,{old:2});assert.deepEqual(ledger.usedByCoupon,{coupon:1})
})
