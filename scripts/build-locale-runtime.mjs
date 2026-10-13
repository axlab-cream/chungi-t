import fs from 'node:fs'
const source=String.raw`(function(){
 'use strict';
 const locale=document.documentElement.lang==='ja'?'ja':'en';
 const ja=locale==='ja';
 function price(raw){const n=Number(raw.replace(/,/g,''));if(!Number.isFinite(n))return raw;return ja?'¥'+Math.round(n*.118).toLocaleString('ja-JP')+' JPY':'$'+(n/1340).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USD'}
 function text(t){return t.replace(/운명상회\s*홈(?:으로)?/g,ja?'運命商会ホーム':'Fate Shop home').replace(/운명상회/g,ja?'運命商会':'Fate Shop').replace(/\bFORTUNE SHOP\b/g,'FATE SHOP').replace(/\bFortune Shop\b/g,'Fate Shop').replace(/\bsaju\b/gi,ja?'四柱推命':'Four Pillars').replace(/ 배너로 이동/g,ja?'のバナーを選択':' banner selection')}
 function priceText(t){return t.replace(/\s*(?:\(charged in KRW\)|（韓国ウォン決済）)/g,'').replace(/\bApprox\.\s*(?=[−-]?\$\d[\d,]*(?:\.\d+)?\s*USD\b)/g,'').replace(/約\s*(?=[−-]?¥\d[\d,]*\s*JPY\b)/g,'').replace(/([\d,]+)\s*(?:원|KRW)(?![A-Za-z])/g,(_a,n)=>price(n))}
 let busy=false;
 function refresh(){if(busy)return;busy=true;
 {document.querySelectorAll('img').forEach(img=>{if(!/\/(?:umsh-brand-logo|chungi-nav-logo)\.(?:png|webp)(?:\?|$)/.test(img.getAttribute('src')||''))return;const mark=document.createElement('span');mark.textContent=ja?'運命商会':'Fate Shop';mark.className='locale-wordmark';mark.style.cssText='font:700 19px Georgia,serif;letter-spacing:.04em;color:#ae8750;white-space:nowrap';img.replaceWith(mark)});}
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=walker.nextNode()){if(n.parentElement&&n.parentElement.closest('script,style,textarea,[contenteditable],blockquote,[data-raw-quote],[data-customer-quote]'))continue;const value=n.parentElement&&n.parentElement.closest('.price-line,.price,.umsh-chrome-price,.bottom-menu-item em')?priceText(text(n.nodeValue)):text(n.nodeValue);if(value!==n.nodeValue)n.nodeValue=value}
 document.querySelectorAll('[aria-label]').forEach(el=>{const old=el.getAttribute('aria-label');if(old){const val=text(old);if(val!==old)el.setAttribute('aria-label',val)}});
 document.querySelectorAll('form').forEach(form=>{if(form.querySelector('[name=birthTimeZone]')||!form.querySelector('[name=hour],[name=birthHour],[name=year]'))return;
 const wrap=document.createElement('label');wrap.style.cssText='display:block;margin:12px 0';wrap.textContent=ja?'生まれた地域の時計・タイムゾーン':'Birthplace region and recorded local time';
 const select=document.createElement('select');select.name='birthTimeZone';select.required=true;select.style.cssText='display:block;width:100%;margin-top:6px';
 const blank=document.createElement('option');blank.value='';blank.textContent=ja?'生まれた地域を選択':'Choose the birthplace region';select.appendChild(blank);
 const zones=Array.from(new Set(['Asia/Seoul','Asia/Tokyo',...(Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):['America/New_York','America/Los_Angeles','Europe/London','Australia/Sydney'])]));
 zones.forEach(zone=>{const o=document.createElement('option');o.value=zone;o.textContent=zone.replace(/_/g,' ');select.appendChild(o)});wrap.appendChild(select);form.appendChild(wrap);
 }); busy=false}
 const originalFetch=window.fetch.bind(window);
 window.fetch=function(input,init){let url;try{url=new URL(typeof input==='string'?input:input.url,location.href)}catch{return originalFetch(input,init)}
 if(url.origin===location.origin&&url.pathname.startsWith('/api/')){
  init=Object.assign({},init);init.headers=new Headers(init.headers || (input instanceof Request?input.headers:undefined));init.headers.set('X-UMSH-Locale',locale);
  if(url.pathname==='/api/user/profile'&&typeof init.body==='string'){
   try{const body=JSON.parse(init.body);const select=document.querySelector('form [name=birthTimeZone]');if(select&&body.birth&&!body.birth.birthTimeZone){if(!select.value)return Promise.reject(new Error(ja?'生まれた地域を選択してください':'Choose the birthplace region'));body.birth.birthTimeZone=select.value;init.body=JSON.stringify(body)}}catch(e){if(e instanceof SyntaxError){}else return Promise.reject(e)}
  }
 }
 return originalFetch(input,init).then(async response=>{if(response.status!==400)return response;let body;try{body=await response.clone().json()}catch{return response}const labels={NONEXISTENT_BIRTH_LOCAL_TIME:ja?'その時刻は夏時間への切り替えで存在しません。出生記録を確認してください。':'That local time did not exist during a daylight-saving change. Check the birth record.',AMBIGUOUS_BIRTH_LOCAL_TIME:ja?'その時刻は夏時間の終了で2回あります。先の時刻か後の時刻を選択してください。':'That local time occurred twice. Choose the earlier or later occurrence.',INVALID_BIRTH_TIME_ZONE:ja?'生まれた地域のタイムゾーンを選択してください。':'Choose a valid birthplace time zone.',INVALID_BIRTH_DATE_TIME:ja?'生年月日と時刻を確認してください。':'Check the birth date and recorded local time.'};if(!labels[body.code])return response;return new Response(JSON.stringify(Object.assign({},body,{error:labels[body.code]})),{status:response.status,statusText:response.statusText,headers:response.headers})})
 };
 function start(){if(!ja){const splash=document.querySelector('.splash-screen');const video=splash&&splash.querySelector('video');if(video){const mark=document.createElement('div');mark.style.cssText='position:absolute;inset:0;z-index:1;background:#18130e;pointer-events:none;display:none;align-items:center;justify-content:center;flex-direction:column;color:#d9b67b;text-align:center';const title=document.createElement('strong');title.textContent='Fate Shop';title.style.cssText='font:700 42px Georgia,serif';const sub=document.createElement('p');sub.textContent='What reading will you pick today?';mark.append(title,sub);splash.appendChild(mark);video.addEventListener('timeupdate',()=>{if(video.currentTime>=2.3)mark.style.display='flex'})}}refresh();new MutationObserver(()=>{if(!busy)requestAnimationFrame(refresh)}).observe(document.body,{childList:true,subtree:true,characterData:true})}
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();`
for(const locale of ['en','ja']){fs.mkdirSync(`.vercel-localized/${locale}/js`,{recursive:true});fs.writeFileSync(`.vercel-localized/${locale}/js/locale-runtime.js`,source)}
console.log('Locale display runtime built; no amount or checkout payload conversion')
