(() => {
const input = document.getElementById('faq-search');
const entries = [...document.querySelectorAll('details')];
const groups = [...document.querySelectorAll('.group')];
document.querySelector('.search-box').hidden = false;
const normalize = value => value.toLocaleLowerCase().replace(/\s/g, '');
const update = () => {
const query = normalize(input.value); let count = 0;
entries.forEach(entry => {
const match = !query || normalize(entry.textContent).includes(query);
entry.hidden = !match;
if (match) count++;
if (query && match) entry.open = true;
});
groups.forEach(group => group.hidden = ![...group.querySelectorAll('details')].some(entry => !entry.hidden));
document.querySelector('.empty').hidden = count > 0;
document.getElementById('search-status').textContent = query ? '검색 결과 ' + count + '개 질문' : '전체 24개 질문';
};
input.addEventListener('input', update);
document.getElementById('clear-search').addEventListener('click', () => { input.value = ''; update(); input.focus(); });
document.querySelectorAll('.categories a').forEach(link => link.addEventListener('click', () => { input.value = ''; update(); }));
const revealHash = () => {
const target = document.getElementById(location.hash.slice(1));
if (target && target.tagName === 'DETAILS') { input.value = ''; update(); target.open = true; target.scrollIntoView(); }
};
window.addEventListener('hashchange', revealHash); revealHash();
window.addEventListener('beforeprint', () => entries.forEach(entry => {entry.dataset.printOpen=String(entry.open);entry.open=true;}));
window.addEventListener('afterprint', () => entries.forEach(entry => {entry.open=entry.dataset.printOpen==='true';}));
})();
