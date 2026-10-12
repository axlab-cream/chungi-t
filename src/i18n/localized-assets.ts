type Locale='en'|'ja'
const ASSETS:Record<string,string>={
 'assets/umsh-brand-logo.png':'assets/umsh-brand-logo.png',
 'assets/umsh-kakao-share.jpg':'assets/umsh-kakao-share.png',
 'assets/chungi-nav-logo.webp':'assets/chungi-nav-logo.png',
 'assets/chungi-chat-logo.webp':'assets/chungi-chat-logo.png',
 'assets/umsh-splash.mp4':'assets/umsh-splash.mp4?v=locale1',
 'assets/umsh-quit-card-bg.png':'assets/umsh-quit-card-bg.png',
 'assets/umsh-signature-card-bg.png':'assets/umsh-signature-card-bg.png',
 'assets/umsh-money-card-bg.png':'assets/umsh-money-card-bg.png',
 'assets/umsh-match-card-bg.png':'assets/umsh-match-card-bg.png',
 'assets/umsh-affair-card-bg.png':'assets/umsh-affair-card-bg.png',
 'assets/umsh-petmatch-card-bg.webp':'assets/umsh-petmatch-card-bg.png',
 'assets/umsh-match-banner-visual.png':'assets/umsh-match-banner-visual.png',
 'assets/umsh-wedding-card-bg.webp':'assets/umsh-wedding-card-bg.png',
 'assets/umsh-exam-card-bg.png':'assets/umsh-exam-card-bg.png?v=exam2',
 'assets/umsh-newyear-card-bg.webp':'assets/umsh-newyear-card-bg.png',
 'assets/umsh-luckycolor-card-bg.webp':'assets/umsh-luckycolor-card-bg.png',
 'play/love-speed/share-banner-v2.png':'play/love-speed/share-banner-v2.png',
 'play/solo-nara/share-banner-v1.jpg':'play/solo-nara/share-banner-v1.jpg',
 'js/portal.js':'js/portal.js',
 'js/consultation-rail.js':'js/consultation-rail.js',
}
/** Local paths only. Reapplying never adds a second locale or creates // host URLs. */
export function localizeAssetPaths(html:string,locale:Locale):string {
 return html.replace(/(?<![A-Za-z0-9_/.:-])(?:\/(?:en|ja))?\/?((?:assets|play|js)\/[A-Za-z0-9_./-]+)(\?[^\s"'<>)]*)?/g,(all,path:string,query:string|undefined)=>{
  const target=ASSETS[path] || (Object.values(ASSETS).some(v=>v.split('?')[0]===path)?path:undefined)
  if(!target)return all
  const [base,forced]=target.split('?')
  const params=new URLSearchParams(query?.slice(1)||'')
  if(forced)for(const [key,value]of new URLSearchParams(forced))params.set(key,value)
  if(path==='js/portal.js'||path==='js/consultation-rail.js')params.set('v','20261012-2')
  const suffix=params.toString()
  return `/${locale}/${base}${suffix?'?'+suffix:''}`
 })
}
