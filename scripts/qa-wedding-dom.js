(async () => {
  const root = document.querySelector('.phone');
  const outside = () => [...root.querySelectorAll('h1,h2,h3,p,a.item,input,select')].filter(n => {
    const r=n.getBoundingClientRect(); return r.width>0 && (r.left < -1 || r.right > innerWidth+1);
  }).map(n=>n.textContent.slice(0,50));
  const overlap = () => [...root.querySelectorAll('img')].filter(img => {
    const a=img.getBoundingClientRect();
    return [...root.querySelectorAll('h1,h2,h3,p')].some(n=>{const b=n.getBoundingClientRect();return a.width>0 && b.height>0 && a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;});
  }).length;
  const result = {path:location.pathname,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,outside:outside(),imageTextOverlap:overlap(),chrome:document.querySelectorAll('.umsh-service-shell').length};
  if(root.id==='step-6_1-report') {
    const payload=await fetch('/api/report/qa-wedding').then(r=>r.json());
    result.sections=payload.report.sections.map(section=>{
      history.replaceState(null,'','?reportId=qa-wedding&section='+section.id);
      window.UMSHWeddingReading.render(payload);
      return {id:section.id,title:root.querySelector('[data-title]').textContent,paragraphs:root.querySelectorAll('[data-body] p').length,outside:outside(),imageTextOverlap:overlap()};
    });
    history.replaceState(null,'','?reportId=qa-wedding&section=1-1');
    window.UMSHWeddingReading.render(payload);
  }
  return JSON.stringify(result);
})()
