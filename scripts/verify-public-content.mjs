import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../data/public-faq.json',import.meta.url),'utf8'));
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
const hub=await get('/faq');
assert.equal((hub.match(/data-faq-entry/g)||[]).length,126);
assert.equal((hub.match(/<h1>/g)||[]).length,1);
assert.ok(!hub.includes('faq-crumb'));
const links=new Set();
for(const group of data.groups){
 const html=await get('/faq/'+group.id);
 const faq=json(html).find(s=>s['@type']==='FAQPage');
 assert.equal(faq.mainEntity.length,group.items.length);
 assert.equal((html.match(/class="knowledge-answer"/g)||[]).length,group.items.length);
 for(const [i,q] of faq.mainEntity.entries()){
  const item=group.items[i];
  assert.equal(q.name,item.q);
  assert.ok(html.includes(escape(q.name)));
  assert.ok(html.includes('id="'+item.id+'"'));
  assert.equal(q.acceptedAnswer.text,[...item.paragraphs,...item.steps.map((s,j)=>`${j+1}. ${s}`)].join('\n\n'));
  for(const p of [...item.paragraphs,...item.steps]) assert.ok(html.includes(escape(p)));
  item.links.forEach(link=>links.add(link.href.split('#')[0]));
 }
 assert.ok(html.includes('https://umsh.kr/faq/'+group.id));
}
for(const path of links)assert.equal((await fetch(base+path,{method:'HEAD'})).status,200,path);
const my=await get('/my');assert.ok(my.includes('href="/about"'));assert.ok(my.includes('href="/faq"'));
for(const path of ['/api/user/profile','/api/user/orders'])assert.equal((await fetch(base+path)).status,401);
console.log('PASS: 14 service prices/art paths, 126 FAQ answers/schema in 11 groups, all action links, public MY and protected APIs');
