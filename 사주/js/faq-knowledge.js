(() => {
  const form=document.querySelector('[data-faq-search]');
  if(!form) return;
  const input=form.querySelector('input');
  const reset=form.querySelector('[data-search-reset]');
  const entries=Array.from(document.querySelectorAll('[data-faq-entry]'));
  const groups=Array.from(document.querySelectorAll('[data-faq-group]'));
  const status=document.querySelector('[data-search-status]');
  const empty=document.querySelector('[data-search-empty]');
  const categories=document.querySelector('.knowledge-categories');
  // 2026-10-12: 분류 페이지(/faq/payment 등)에서 검색 버튼을 누르면 전체 질문에서 찾는다.
  const isCategoryPage=location.pathname.replace(/\/$/,'')!=='/faq';
  const normalize=s=>s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9가-힣]/g,'');
  // "환불 받고 싶어요"처럼 문장으로 쳐도 찾도록 흔한 끝말(조사·어미)을 떼고, 뜻 없는 말은 뺀다.
  const STOP=new Set(['어떻게','어떡해','왜','뭐','뭔가','무엇','하고','싶어','싶어요','싶다','하나요','되나요','있나요','없나요','해요','돼요','안돼요','안되요','안돼','안되','방법','알려줘','알려주세요','궁금해요','질문']);
  const ENDINGS=/(하고싶어요|하고싶어|싶어요|싶어|해주세요|주세요|하려면|하나요|되나요|있나요|없나요|인가요|할까요|나요|해요|돼요|어요|아요|에서|으로|부터|까지|이랑|하고|은|는|이|가|을|를|에|의|로|도|만|요)$/;
  const stem=token=>{const t=token.replace(ENDINGS,'');return t.length>=1?t:token;};
  const indexed=entries.map(el=>({el,text:normalize(el.dataset.search||el.textContent)}));
  const suggestions=document.querySelector('[data-suggestions]');
  if(suggestions) suggestions.hidden=false;
  let timer;
  function search(updateUrl=true) {
    const value=input.value.trim().slice(0,120);
    const words=value.split(/\s+/).map(normalize).filter(Boolean);
    const tokens=words.filter(w=>!STOP.has(w)).map(stem).filter(Boolean);
    const terms=tokens.length?tokens:words;
    // 먼저 모든 낱말이 들어간 질문을 찾고, 없으면 낱말 하나라도 맞는 질문을 많이 맞는 순서로 보여 준다.
    let found=0, loose=false;
    for(const {el,text} of indexed) {el.hidden=!terms.every(t=>text.includes(t));if(!el.hidden) found++;}
    if(value&&!found&&terms.length>1) {
      loose=true;
      for(const {el,text} of indexed) {el.hidden=!terms.some(t=>t.length>=2&&text.includes(t));if(!el.hidden) found++;}
    }
    for(const group of groups) group.hidden=!Array.from(group.querySelectorAll('[data-faq-entry]')).some(el=>!el.hidden);
    // 검색 중에는 분류 버튼 묶음을 접어 결과가 검색창 바로 아래 보이게 한다.
    if(categories) categories.hidden=!!value;
    empty.hidden=found!==0;
    reset.hidden=!value;
    status.textContent=value?(loose?`“${value}”에 딱 맞는 질문이 없어 비슷한 질문 ${found}개를 보여 드려요`:`“${value}” 검색 결과 ${found}개`):`${entries.length}개 질문을 확인할 수 있습니다.`;
    if(updateUrl) {const url=new URL(location.href);if(value) url.searchParams.set('q',value);else url.searchParams.delete('q');history.replaceState(null,'',url);}
  }
  // 버튼·Enter·추천 검색어로 찾으면 결과 첫 줄로 화면을 내린다(폰에서 결과가 화면 밖에 있었다).
  function showResults() {
    if(!input.value.trim()) return;
    const target=empty.hidden?status:empty;
    // 위쪽 고정 헤더에 결과 개수 줄이 가리지 않게 헤더 높이만큼 덜 내린다.
    const header=document.querySelector('.umsh-service-shell,.appbar');
    const offset=(header&&getComputedStyle(header).position.match(/fixed|sticky/)?header.getBoundingClientRect().height:0)+12;
    requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:'smooth'}));
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();clearTimeout(timer);
    const value=input.value.trim().slice(0,120);
    if(isCategoryPage&&value) {location.href='/faq?q='+encodeURIComponent(value);return;}
    search();input.blur();showResults();
  });
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,120);});
  reset.addEventListener('click',()=>{input.value='';search();input.focus();});
  document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.query;search();showResults();}));
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
  if(input.value&&!location.hash) showResults();
  window.addEventListener('hashchange',openHash);
  window.addEventListener('popstate',()=>{input.value=(new URLSearchParams(location.search).get('q')||'').slice(0,120);search(false);openHash();});
})();
