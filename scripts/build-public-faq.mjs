import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(readFileSync(join(root, 'data/public-faq.json'), 'utf8'));
const groups = data.groups;
const all = groups.flatMap(group => group.items.map(item => ({ ...item, group })));
const check = process.argv.includes('--check');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base = 'https://umsh.kr';
const pathFor = group => '/faq' + (group ? '/' + group.id : '');
const answerText = item => [...item.paragraphs, ...(item.steps || []).map((step,i) => `${i+1}. ${step}`)].join('\n\n');
assert.ok(all.length >= 120, 'FAQ must have at least 120 substantive entries');
assert.equal(new Set(all.map(item=>item.id)).size, all.length, 'Unique FAQ ids');
assert.equal(new Set(all.map(item=>item.q)).size, all.length, 'Unique questions');
for (const item of all) {
  assert.ok(answerText(item).length >= 150, 'Answer too short: '+item.id);
  assert.ok(item.links.length && item.sources.length, 'Missing provenance/link: '+item.id);
  for (const link of item.links) assert.ok(/^\/(?!\/)/.test(link.href), 'Only local links: '+item.id);
}

const policyNav = `<nav class="policy-nav" aria-label="서비스와 정책"><a href="/about">운명상회란?</a><a href="/faq" aria-current="page">자주 묻는 질문</a><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a><a href="/refund">환불·취소 정책</a><a href="/support">고객센터</a></nav>`;
const footer = `<footer class="company-footer"><p><strong>상호</strong> 더크림유니언 <strong>대표</strong> 이정훈</p><p><strong>사업자등록번호</strong> 206-81-92596 · <strong>통신판매업신고</strong> 2026-서울강남-03303</p><p>서울특별시 강남구 도산대로 12길 18 크림빌딩</p><p>02-6953-6685 · <a href="mailto:axlab@crea-m.com">axlab@crea-m.com</a></p></footer>`;

function nav(group) {
  return `<nav class="knowledge-categories" aria-label="질문 분류"><a href="/faq" ${group?'':'aria-current="page"'}>전체 <span>${all.length}</span></a>${groups.map(g=>`<a href="/faq/${g.id}" ${g.id===group?.id?'aria-current="page"':''}>${escape(g.name)} <span>${g.items.length}</span></a>`).join('')}</nav>`;
}
function search(group) {
  return `<form class="knowledge-search" action="${pathFor(group)}" method="get" role="search" data-faq-search><label for="faq-query">고민이나 궁금한 내용을 검색하세요</label><div class="knowledge-search-row"><input id="faq-query" name="q" type="search" placeholder="예: 이직, 상대 생년월일, 결제 오류" autocomplete="off" maxlength="120" aria-describedby="search-help"><button type="submit">검색</button><button type="button" data-search-reset hidden>초기화</button></div><p id="search-help">${group?'현재 분류에서 검색합니다. 더 넓게 찾으려면 <a href="/faq">전체 질문</a>을 이용하세요.':'서비스를 몰라도 괜찮습니다. 지금 겪는 문제의 키워드로 찾아보세요.'}</p></form>`;
}
function answer(item) {
  return `<details class="knowledge-answer" id="${item.id}" data-faq-entry data-search="${escape([item.q,item.keywords,...item.paragraphs].join(' '))}"><summary><span class="question-mark" aria-hidden="true">Q</span><h2>${escape(item.q)}</h2><span class="question-toggle" aria-hidden="true">+</span></summary><div class="knowledge-answer-body">${item.example?'<p class="example-label">이용 상황 예시 · 실제 고객 후기나 성과 보장이 아닙니다</p>':''}${item.paragraphs.map((p,i)=>`<p${i===0?' class="direct-answer"':''}>${escape(p)}</p>`).join('')}${item.steps?.length?`<section class="knowledge-workflow" aria-label="확인 순서"><h3>이렇게 확인해 보세요</h3><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol></section>`:''}<div class="knowledge-next"><span>다음으로 확인할 곳</span>${item.links.map(link=>`<a href="${escape(link.href)}">${escape(link.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div><a class="knowledge-permalink" href="${pathFor(item.group)}#${item.id}">이 질문 바로가기</a></div></details>`;
}
function hubEntry(item,g) {
  return `<article class="knowledge-result" data-faq-entry data-search="${escape([item.q,item.keywords,...item.paragraphs].join(' '))}"><h3><a href="/faq/${g.id}#${item.id}">${escape(item.q)} <span aria-hidden="true">↗</span></a></h3><p>${escape(item.paragraphs[0])}</p></article>`;
}
function render(group) {
  const items = group ? all.filter(item=>item.group.id===group.id) : all;
  const path = pathFor(group);
  const title = group ? group.name + ' 자주 묻는 질문' : '자주 묻는 질문';
  const description = group ? `운명상회 ${group.name} 질문 ${items.length}개. ${group.intro}` : `운명상회 이용·결제·오류 해결부터 연애, 궁합, 직장, 돈, 집 관련 상담 선택까지 ${all.length}개 질문과 상세 안내를 확인하세요.`;
  const breadcrumb = [{name:'홈',item:base+'/'},{name:'자주 묻는 질문',item:base+'/faq'},...(group?[{name:group.name,item:base+path}]:[])];
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'BreadcrumbList',itemListElement:breadcrumb.map((item,i)=>({'@type':'ListItem',position:i+1,...item}))},
    group ? {'@type':'FAQPage','@id':base+path+'#faq',url:base+path,name:title,inLanguage:'ko-KR',dateModified:data.updated,mainEntity:items.map(item=>({'@type':'Question','@id':base+path+'#'+item.id,name:item.q,acceptedAnswer:{'@type':'Answer',text:answerText(item)}}))} : {'@type':'CollectionPage',url:base+path,name:title,inLanguage:'ko-KR',dateModified:data.updated,hasPart:groups.map(g=>({'@type':'WebPage',name:g.name,url:base+pathFor(g)}))}
  ]};
  const content = group ? `<section class="knowledge-answers" aria-label="${escape(group.name)} 답변">${items.map(answer).join('\n')}</section>` : groups.map(g=>`<section class="knowledge-group" data-faq-group><header><h2><a href="/faq/${g.id}">${escape(g.name)} <span>${g.items.length}</span></a></h2><p>${escape(g.intro)}</p></header><div class="knowledge-results">${g.items.map(item=>hubEntry(item,g)).join('\n')}</div><a class="knowledge-group-link" href="/faq/${g.id}">${escape(g.name)} 상세 답변 보기 →</a></section>`).join('\n');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · 운명상회</title>
<meta name="description" content="${escape(description)}"><link rel="canonical" href="${base+path}"><meta name="robots" content="index,follow"><meta property="og:type" content="website"><meta property="og:site_name" content="운명상회"><meta property="og:title" content="${escape(title)} · 운명상회"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${base+path}"><meta property="og:image" content="${base}/assets/umsh-kakao-share.jpg?v=20260904-wide"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/css/policy.css?v=20260909-logo"><link rel="stylesheet" href="/css/faq-knowledge.css?v=20260909-126"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script><script src="/js/faq-knowledge.js?v=20260909-126" defer></script></head>
<body><main class="policy-page knowledge-page"><header class="policy-header"><a class="brand" href="/" aria-label="운명상회 홈"><img src="/assets/umsh-brand-logo.png" width="118" height="57" alt="운명상회"></a><a class="home-link" href="/my">MY로 돌아가기</a></header>
<section class="knowledge-intro"><h1>${escape(group?group.name:title)}</h1><p>${escape(group?group.intro:'어떤 상담이 맞을지, 이용 중 막힌 문제는 어떻게 확인할지 찾아보세요.')}</p><div class="knowledge-meta"><span>${group?`${items.length}개 질문 · 전체 ${all.length}개 안내`:`${all.length}개 질문 · ${groups.length}개 분류`}</span><span>내용 확인 ${data.updated.replaceAll('-','.')}</span></div></section>
${search(group)}${group?'':`<div class="knowledge-suggestions" aria-label="빠른 검색" data-suggestions hidden>${['이직','결혼 날짜','상대 생년월일','돈이 모이지','결제 오류','고양이'].map(q=>`<button type="button" data-query="${q}">${q}</button>`).join('')}</div>`}
${nav(group)}<p class="knowledge-count" data-search-status role="status" aria-live="polite">${items.length}개 질문을 확인할 수 있습니다.</p><noscript><p>검색은 JavaScript를 켜면 사용할 수 있습니다. 아래 분류와 질문 링크로도 모든 답변을 읽을 수 있습니다.</p></noscript>
<aside class="knowledge-empty" data-search-empty hidden><h2>일치하는 질문을 찾지 못했습니다</h2><p>짧은 키워드로 다시 검색하거나 전체 상담 목록을 확인해 보세요.</p><a href="/faq">전체 질문</a><a href="/search">상담 찾아보기</a><a href="/support">고객센터 문의</a></aside>
${content}<aside class="knowledge-support"><h2>서비스 선택과 운영 문의는 구분해 주세요</h2><p>어떤 상담을 볼지 고민이라면 <a href="/about#services">서비스 소개</a>를, 결제·환불·오류라면 <a href="/support">고객센터</a>를 이용하세요. 운세는 참고용 콘텐츠이며 실제 문제의 해결이나 미래 결과를 보장하지 않습니다.</p><a class="knowledge-support-link" href="/support">고객센터 문의하기 →</a></aside>${policyNav}${footer}</main></body></html>\n`;
}

function output(path, content) {
  const target=join(root,path);
  if(check) assert.equal(readFileSync(target,'utf8').replace(/\r\n/g,'\n'),content, 'Stale generated page: '+path);
  else { mkdirSync(dirname(target),{recursive:true}); writeFileSync(target,content); }
}
output('사주/faq.html',render(null));
for(const group of groups) output('사주/faq/'+group.id+'.html',render(group));
const sitemapPath=join(root,'사주/sitemap.xml');
const sitemap=readFileSync(sitemapPath,'utf8').replace(/\r\n/g,'\n').replace(/\s*<url>\s*<loc>https:\/\/umsh\.kr\/faq(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g,'').replace('</urlset>',[null,...groups].map(g=>`  <url><loc>${base+pathFor(g)}</loc><lastmod>${data.updated}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n')+'\n</urlset>');
output('사주/sitemap.xml',sitemap);
console.log(`${check?'Verified':'Generated'} ${all.length} FAQs in ${groups.length} categories`);
