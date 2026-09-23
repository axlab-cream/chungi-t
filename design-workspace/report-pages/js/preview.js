(() => {
  const services = window.reportPreviewServices || []
  const byKey = Object.fromEntries(services.map((item) => [item.key, item]))
  const key = new URLSearchParams(location.search).get('service')
  const item = byKey[key] || services[0]
  const page = location.pathname.split('/').pop()
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
  const url = (name, service) => `${name}?service=${encodeURIComponent(service.key)}`
  const verified = (service) => service.source === 'verified'
  const badge = (service) => `<span class="source-pill ${verified(service) ? 'is-verified' : 'is-template'}">${verified(service) ? 'good1621 보관함 확인 · 비식별 요지' : '본문 미확인 · 편집용 틀'}</span>`
  const teaserBadge = (service) => `<span class="source-pill ${service.teaser ? 'is-verified' : 'is-template'}">${service.teaser ? '운영 티저 구조 확인 · 개인값 제거' : service.key === 'today_fortune' ? '운영 무료 결과 구조 확인 · 개인값 제거' : verified(service) ? '티저 원문 확인 필요 · 보관함 해석 기반 예시' : '운영 티저 미확인 · 편집용 틀'}</span>`

  const hub = document.querySelector('#service-index')
  if (hub) {
    hub.innerHTML = services.map((service) => `
      <article class="service-row">
        <img src="${safe(service.image)}" alt="${safe(service.title)} 대표 이미지" loading="lazy" />
        <div class="service-row-main"><small>${safe(service.category)} · ${safe(service.key)}</small><h2>${safe(service.title)}</h2><p>${safe(service.question)}</p>${badge(service)}</div>
        <div class="service-links"><a href="${url('teaser.html', service)}">티저</a><a href="${url('reading-list.html', service)}">해석 목록</a><a href="${url('reading-detail.html', service)}">해석 상세</a></div>
      </article>`).join('')
    return
  }

  const content = document.querySelector('#preview-content')
  if (!content || !item) return
  document.title = `${item.title} · ${page === 'teaser.html' ? '티저' : page === 'reading-list.html' ? '해석 목록' : '해석 상세'} · 디자인 작업실`
  document.querySelector('#page-nav').innerHTML = [
    ['teaser.html', '티저'], ['reading-list.html', '해석 목록'], ['reading-detail.html', '해석 상세'],
  ].map(([file, label]) => `<a href="${url(file, item)}" ${page === file ? 'aria-current="page"' : ''}>${label}</a>`).join('')

  const edit = (field) => `<p class="edit-note">문구 수정: js/services.js → ${safe(item.key)}.${field}</p>`
  const picture = `<img src="${safe(item.image)}" alt="${safe(item.title)} 대표 이미지" />`
  if (page === 'teaser.html') {
    if (item.teaser?.longform) {
      content.innerHTML = `
        <section class="teaser-hero" data-edit-zone>
          <p class="eyebrow">${safe(item.category)} · ${safe(item.title)} · 운영 티저 구조 기반 디자인 예시</p>
          <h1 class="display-title">${safe(item.teaser.title)}</h1>
          <p class="lead">${safe(item.teaser.lead)}</p>${teaserBadge(item)}${edit('teaser / question')}
          <figure class="teaser-figure">${picture}</figure><p class="edit-note">이미지 교체: ${safe(item.image)}</p>
        </section>
        <section class="teaser-reading longform-preview" data-edit-zone aria-label="천명사주 티저 흐름">
          <p class="eyebrow">사주 결과 입구</p><h2>좋은 말보다 지금의 흐름을 먼저 봅니다</h2>
          <p>${safe(item.summary)}</p>
          ${(item.teaser.sections || []).map(([title, text], index) => `<article class="longform-section"><span>${String(index + 1).padStart(2, '0')}</span><h3>${safe(title)}</h3><p>${safe(text)}</p></article>`).join('')}
          ${edit('teaser.sections')}
        </section>
        <section class="teaser-points" aria-label="천명사주 무료 예고">${item.teaser.signals.map(([label, text], index) => `<article class="point-card"><b>${String(index + 1).padStart(2, '0')} · ${safe(label)}</b><p>${safe(text)}</p></article>`).join('')}</section>
        <div class="teaser-action"><a class="demo-button" href="${url('reading-list.html', item)}">상세 해석 목록 디자인 보기</a><p class="demo-note">운영 결제·상담 기능은 연결하지 않은 디자인 작업실입니다.</p></div>`
      return
    }
    content.innerHTML = `
      <section class="teaser-hero" data-edit-zone>
        <p class="eyebrow">${safe(item.category)} · ${safe(item.title)} · 디자인 확인용 예시</p>
        <h1 class="display-title">${safe(item.teaser?.title || item.question)}</h1>
        ${item.teaser ? `<p class="lead">${safe(item.teaser.lead)}</p>` : ''}
        ${teaserBadge(item)}${edit('teaser / question')}
        <figure class="teaser-figure">${picture}</figure><p class="edit-note">이미지 교체: ${safe(item.image)}</p>
      </section>
      <section class="teaser-reading" data-edit-zone aria-label="미리 보는 해석">
        <p class="eyebrow">미리 보는 해석</p><h2>${safe(item.conclusion)}</h2><p>${safe(item.summary)}</p>${edit('conclusion / summary')}
      </section>
      <section class="teaser-points" aria-label="무료 티저 신호">${(item.teaser?.signals || item.sections.map((title, index) => [title, index === 0 ? item.question : index === 1 ? item.summary : item.conclusion])).map(([label, text], index) => `<article class="point-card"><b>${String(index + 1).padStart(2, '0')} · ${safe(label)}</b><p>${safe(text)}</p></article>`).join('')}</section>
      <div class="teaser-action"><a class="demo-button" href="${url('reading-list.html', item)}">해석 목록 디자인 보기</a><p class="demo-note">작업실 안에서만 이동합니다. 결제·운영 기능 없음</p></div>`
  } else if (page === 'reading-list.html') {
    content.innerHTML = `
      <header class="list-head" data-edit-zone><p class="eyebrow">${safe(item.category)} · ${verified(item) ? '운영 해석 목록 구조 기반' : '운영 원문 미확인 · 편집용 틀'}</p><h1 class="display-title">${safe(item.title)}<br />해석 목록</h1><p class="lead">${verified(item) ? '운영 리포트의 대분류와 읽는 순서를 개인값 없이 보여 줍니다.' : '운영 원문을 확인하기 전 화면 구조를 검토하는 목차입니다.'}</p>${badge(item)}${edit('sections')}</header>
      <section class="report-list" aria-label="${safe(item.title)} 해석 목차">
        <article class="report-card" data-edit-zone><div class="report-card-head"><div class="report-cover">${picture}</div><div class="report-meta"><small>${safe(item.category)} · ${safe(item.title)}</small><h2>${safe(item.question)}</h2><p>${safe(item.conclusion)}</p></div></div><div class="progress"><div class="progress-copy"><span>디자인 검토용 목차</span><b>${item.sections.length}개 주요 항목</b></div><div class="progress-bar"><span style="--progress:100%"></span></div></div><div class="report-foot">${badge(item)}<a class="report-link" href="${url('reading-detail.html', item)}">해석 보기 →</a></div><p class="edit-note">이미지 교체: ${safe(item.image)}</p></article>
        ${item.sections.map((title, index) => `<article class="outline-card" data-edit-zone><span>${String(index + 1).padStart(2, '0')}</span><div><h2>${safe(title)}</h2><p>${safe(index === 0 ? item.summary : index === 1 ? item.question : item.conclusion)}</p></div><a href="${url('reading-detail.html', item)}#section-${index + 1}" aria-label="${safe(title)} 상세 보기">→</a></article>`).join('')}
      </section>`
  } else {
    content.innerHTML = `
      <section class="detail-hero" data-edit-zone><div class="detail-hero-image">${picture}</div><div class="detail-title"><p class="eyebrow">${verified(item) ? '운영 해석 상세 구조 기반' : '운영 원문 미확인 · 편집용 틀'}</p><h1 class="display-title">${safe(item.title)}</h1><p class="lead">${safe(item.question)}</p><p class="edit-note">이미지 교체: ${safe(item.image)}</p></div></section>
      <div class="detail-source">${badge(item)}</div>
      <section class="conclusion-card" data-edit-zone><small>한 줄 결론</small><strong>${safe(item.conclusion)}</strong>${edit('conclusion')}</section>
      <section class="detail-summary" data-edit-zone><strong>한눈에 보기</strong><p>${safe(item.summary)}</p><div class="plain-box"><b>쉽게 말하면</b><p>${safe(item.question)}</p></div>${edit('summary')}</section>
      ${item.sections.map((title, index) => `<details class="report-accordion" id="section-${index + 1}" ${index === 0 ? 'open' : ''} data-edit-zone><summary>${String(index + 1).padStart(2, '0')} · ${safe(title)}</summary><div class="accordion-copy"><h3>이 항목의 핵심</h3><p>${safe(index === 0 ? item.summary : index === 1 ? item.question : item.conclusion)}</p><p class="edit-note">목차 수정: js/services.js → ${safe(item.key)}.sections[${index}]</p></div></details>`).join('')}
      <article class="detail-body"><section class="reading-section" data-edit-zone><span class="number">해석 범위</span><h2>${verified(item) ? '운영 리포트의 판단 흐름을 따라 읽습니다' : '운영 원문 확인 전의 편집용 화면입니다'}</h2><p>${verified(item) ? '실제 입력 조건과 확인된 사실을 함께 보며, 운영 리포트에서 사용하는 판단 기준을 개인값 없이 정리합니다.' : '실제 운영 해석을 확인하면 이 영역을 원문 구조에 맞춰 교체합니다.'}</p><div class="plain-box"><b>디자인 작업 안내</b><p>개인 입력값·리포트 ID·결제 권한은 복제하지 않았습니다.</p></div></section></article>`
  }

  const guide = document.querySelector('[data-guide-toggle]')
  guide?.addEventListener('click', () => {
    const active = document.body.classList.toggle('show-guides')
    guide.setAttribute('aria-pressed', String(active))
    guide.textContent = active ? '편집 가이드 숨기기' : '편집 가이드 보기'
  })
})()
