import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const schemas=html=>[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d];});
const base='https://umsh.kr';
const robots=read('사주/robots.txt');
assert.match(robots,/User-agent: \*/);
assert.match(robots,/Allow: \/\s/);
assert.ok(robots.includes('Sitemap: '+base+'/sitemap.xml'));
assert.match(robots,/Disallow: \/api\//);
const sitemap=read('사주/sitemap.xml');
assert.match(sitemap,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length,'Duplicate sitemap URLs');
for(const value of urls){const url=new URL(value);assert.equal(url.origin,base);assert.equal(url.search,'');assert.equal(url.hash,'');assert.ok(!/^\/(api|profile|orders|vault|payment|r)(\/|$)/.test(url.pathname),'Private sitemap URL');}
const home=schemas(read('사주/portal.html')),about=schemas(read('사주/about.html'));
const org=home.find(s=>s['@type']==='Organization'),other=about.find(s=>s['@type']==='Organization');
assert.ok(org&&other,'Organization missing');
for(const key of ['@id','name','legalName','url','logo','email'])assert.equal(org[key],other[key],`Organization ${key} mismatch`);
assert.equal(org['@id'],base+'/#organization');
const website=home.find(s=>s['@type']==='WebSite');
assert.equal(website?.url,base+'/');assert.equal(website?.publisher?.['@id'],org['@id']);
const data=JSON.parse(read('data/public-faq.json'));
assert.ok(!schemas(read('사주/faq.html')).some(s=>s['@type']==='FAQPage'),'Hub must not duplicate full FAQ schema');
let total=0;
for(const group of data.groups){
 const path='/faq/'+group.id,html=read('사주'+path+'.html');
 assert.ok(urls.includes(base+path),'Missing sitemap category '+path);
 assert.ok(html.includes('rel="canonical" href="'+base+path+'"'));
 assert.ok(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(html));
 const faq=schemas(html).find(s=>s['@type']==='FAQPage');
 assert.equal(faq?.mainEntity?.length,group.items.length);
 for(const [i,item] of group.items.entries()){
  assert.equal(faq.mainEntity[i].name,item.q);
  assert.equal(faq.mainEntity[i].acceptedAnswer.text,[...item.paragraphs,...item.steps.map((s,j)=>`${j+1}. ${s}`)].join('\n\n'));
 }
 total+=group.items.length;
}
for(const path of ['/','/about','/my','/faq'])assert.ok(urls.includes(base+path));
console.log(`PASS SEO: robots, ${urls.length} sitemap URLs, consistent Organization/WebSite, ${total} FAQ answers`);
