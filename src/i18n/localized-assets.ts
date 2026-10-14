import { mapDisplayHtml, displayAttributes, replaceDisplayAttribute } from './html-display-tokens.js'

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

/** Normalize the real root, including extra attributes; never examples or script literals. */
export function normalizeLocaleRoot(html:string,locale:Locale):string {
 return mapDisplayHtml(html,(token,kind)=>{
  if(kind!=='tag'||!/^<html\b/i.test(token))return token
  const attribute=displayAttributes(token).find(a=>a.name==='lang')
  return attribute?replaceDisplayAttribute(token,attribute,locale):token.replace(/^<html\b/i,match=>match+' lang="'+locale+'"')
 })
}
/** Known public visual trees only. No JS, HTML, JSON or API fallback. */
export function rebaseSharedVisualPaths(html:string,locale:Locale,pageRel:string,localizedExists:(canonical:string)=>boolean=()=>false):string {
 return mapDisplayHtml(html,(token,kind)=>{
  if(kind!=='tag')return token
  const name=/^<([a-z][\w:-]*)\b/i.exec(token)?.[1].toLowerCase()
  const attributes=displayAttributes(token)
  const fields=['img','video','source'].includes(name||'')?['src','poster']:[]
  for(const attribute of attributes.filter(a=>fields.includes(a.name)).reverse()){
   const value=attribute.value
   if(!value||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value))continue
   let canonical:string
   let decoded:string
   try {canonical=new URL(value,'https://umsh.invalid/'+locale+pageRel).pathname;decoded=decodeURIComponent(canonical)}catch{continue}
   if(/%(?:2f|5c|00)/i.test(canonical)||decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').includes('..'))continue
   if(/^\/(?:en|ja)\//.test(canonical)&&!canonical.startsWith('/'+locale+'/'))continue
   canonical=canonical.replace(new RegExp('^/'+locale+'(?=/)'), '')
   if(canonical.includes('\\')||canonical.includes('\0')||canonical.split('/').includes('..'))continue
   if(!sharedPublicVisualPath(canonical))continue
   if(!/\.(?:png|jpe?g|webp|avif|svg|gif|ico|mp4|webm)$/i.test(canonical))continue
   if(localizedExists(decodeURIComponent(canonical)))continue
   const suffix=value.match(/[?#][^]*$/)?.[0]||''
   token=replaceDisplayAttribute(token,attribute,canonical+suffix)
  }
  return token
 })
}

const CUSTOMER_VISUAL_BASES = ['day/wedding','flow/newyear','love/signal','love/this-year','match/cat','match/couple','match/marry','me/lucky','me/pass-angle','money/save','place/home','work/job-choice','work/move','work/quit','love/again','love/mind','love/spouse','work/job','today/free']
/** A same-origin pointer to an existing public binary subtree, never a filesystem/HTML/code fallback. */
export function sharedPublicVisualPath(encodedPath:string):string|undefined {
 if(!encodedPath.startsWith('/')||encodedPath.startsWith('//')||/%(?:2f|5c|00)/i.test(encodedPath))return
 let decoded:string;try{decoded=decodeURIComponent(encodedPath)}catch{return}
 if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(p=>p==='..'||p==='.')||/[?#]/.test(decoded))return
 if(!/\.(?:png|jpe?g|webp|avif|svg|gif|ico|mp4|webm|mp3|woff2?|ttf|otf)$/i.test(encodedPath))return
 const fixed=/^\/(?:assets|cmdg\/assets|love\/assets)\//.test(decoded)
 const customer=CUSTOMER_VISUAL_BASES.some(base=>{
  if(!decoded.startsWith('/'+base+'/'))return false
  const tail=decoded.slice(base.length+2)
  return /^(?:assets|IMAGE|shared|(?:01-step-1-story|02-step-2-saju-input|04-step-4-report|05-step-5-chat|06-step-6_1-report-detail)\/assets)\//.test(tail)
 })
 return fixed||customer?encodedPath:undefined
}
