import assert from 'node:assert/strict';
const base=process.env.PUBLIC_PREVIEW_URL || 'http://localhost:8790';
const get=async path=>{const r=await fetch(base+path);assert.equal(r.status,200,path);return r.text()};
const about=await get('/about');
assert.equal((about.match(/data-service-pick=/g)||[]).length,14);
assert.equal((about.match(/class="shell service-detail"/g)||[]).length,14);
assert.ok(about.includes('data-brand-video'));
assert.ok(!about.includes('sc-for'));
const json=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d]});
const schemas=json(about);
const services=schemas.filter(s=>s['@type']==='Service');
assert.equal(services.length,14);
const catalog=await (await fetch(base+'/api/services')).json();
for(const svc of services){const entry=catalog.services.find(s=>'https://umsh.kr'+s.href===svc.url);assert.ok(entry);assert.equal(+svc.offers.price,entry.amount);assert.equal(svc.name,entry.title)}
for(const m of about.matchAll(/<img[^>]+src="([^"]+)"/g)){const r=await fetch(base+m[1],{method:'HEAD'});assert.equal(r.status,200,m[1]);}
assert.ok(!json(await get('/faq')).some(s=>s['@type']==='FAQPage'));
for(const group of ['use','payment','report','reading']){
 const html=await get('/faq/'+group);
 const faq=json(html).find(s=>s['@type']==='FAQPage');
 assert.equal(faq.mainEntity.length,6);
 assert.equal((html.match(/class="shell faq-question"/g)||[]).length,6);
 for(const q of faq.mainEntity){assert.ok(html.includes(q.name));assert.ok(html.includes(q.acceptedAnswer.text));}
 assert.ok(html.includes('https://umsh.kr/faq/'+group));
}
const my=await get('/my');assert.ok(my.includes('href="/about"'));assert.ok(my.includes('href="/faq"'));
for(const path of ['/api/user/profile','/api/user/orders'])assert.equal((await fetch(base+path)).status,401);
console.log('PASS: 14 service prices/art paths, 24 FAQ answers/schema, public MY and protected APIs');
