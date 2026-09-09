(() => {
  const form=document.querySelector('[data-faq-search]');
  if(!form) return;
  const input=form.querySelector('input');
  const reset=form.querySelector('[data-search-reset]');
  const entries=Array.from(document.querySelectorAll('[data-faq-entry]'));
  const groups=Array.from(document.querySelectorAll('[data-faq-group]'));
  const status=document.querySelector('[data-search-status]');
  const empty=document.querySelector('[data-search-empty]');
  const normalize=s=>s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9가-힣]/g,'');
  const indexed=entries.map(el=>({el,text:normalize(el.dataset.search||el.textContent)}));
  const suggestions=document.querySelector('[data-suggestions]');
  if(suggestions) suggestions.hidden=false;
  let timer;
  function search(updateUrl=true) {
    const value=input.value.trim().slice(0,120);
    const tokens=value.split(/\s+/).map(normalize).filter(Boolean);
    let found=0;
    for(const {el,text} of indexed) {el.hidden=!tokens.every(token=>text.includes(token));if(!el.hidden) found++;}
    for(const group of groups) group.hidden=!Array.from(group.querySelectorAll('[data-faq-entry]')).some(el=>!el.hidden);
    empty.hidden=found!==0;
    reset.hidden=!value;
    status.textContent=value?`“${value}” 검색 결과 ${found}개`:`${entries.length}개 질문을 확인할 수 있습니다.`;
    if(updateUrl) {const url=new URL(location.href);if(value) url.searchParams.set('q',value);else url.searchParams.delete('q');history.replaceState(null,'',url);}
  }
  form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);search();});
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,120);});
  reset.addEventListener('click',()=>{input.value='';search();input.focus();});
  document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.query;search();input.focus();}));
  function openHash() {
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const target=document.getElementById(id);
    if(target?.matches('details.knowledge-answer')){
      if(target.hidden){input.value='';search();}
      target.open=true;
      requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
    }
  }
  input.value=(new URLSearchParams(location.search).get('q')||'').slice(0,120);
  search(false);openHash();
  window.addEventListener('hashchange',openHash);
  window.addEventListener('popstate',()=>{input.value=(new URLSearchParams(location.search).get('q')||'').slice(0,120);search(false);openHash();});
})();
