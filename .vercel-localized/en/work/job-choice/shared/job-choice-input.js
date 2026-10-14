(function () {
  'use strict';
  const TEXT = {"empty":"No saved birth-chart profile","self":"Me","time":"Birth time not entered","lunar":"Lunar calendar","solar":"Solar calendar","birthDate":"Birth date","decisionDate":"Planned start or decision date","year":"Year","month":"Month","day":"Day","unknown":"Birth time unknown"};
  const safeParse = value => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
  const storageFor = label => { try { return label === 'session' ? sessionStorage : localStorage; } catch { return null; } };
  const get = (storage,key) => { try { return storage.getItem(key); } catch { return null; } };
  const set = (storage,key,value) => { try { storage.setItem(key,value); return true; } catch { return false; } };
  const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
  function normalizeProfile(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const birthTimeKnown=source.birthTimeKnown !== false;
    return {name:source.name||source.nickname||source.displayName||source.display_name||'',gender:source.gender||source.sex||'unspecified',birthDate:source.birthDate||source.birth_date||source.birthday||source.date||'',birthTime:birthTimeKnown?(source.birthTime||source.birth_time||source.time||''):'',birthTimeKnown,calendarType:source.calendarType||source.calendar_type||source.calendar||'solar',birthPlace:source.birthPlace||source.birth_place||source.place||'',profileId:source.profileId||source.profile_id||''};
  }
  const isProfileComplete = profile => Boolean(profile && profile.name && profile.birthDate && profile.calendarType && (profile.birthTimeKnown === false || validTime(profile.birthTime)));
  function loadStoredProfile() {
    for (const key of ['umsh_job_choice_profile','umsh_birth_profile','umsh_saju_profile','umsh_user_profile','umsh_profile','aios_profile']) {
      for (const label of ['session','local']) {
        const raw = safeParse(get(storageFor(label),key));
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) { const profile=normalizeProfile(raw); return {key,profile,complete:isProfileComplete(profile),storage:label}; }
      }
    }
    return {key:'',profile:normalizeProfile({}),complete:false,storage:''};
  }
  function profileLabel(profile) {
    if (!profile || !profile.birthDate) return TEXT.empty;
    return [profile.name||TEXT.self,profile.birthDate,profile.birthTimeKnown===false?TEXT.unknown:(profile.birthTime||TEXT.time),profile.calendarType==='lunar'?TEXT.lunar:TEXT.solar].join(' · ');
  }
  function saveJobInput(input) {
    const normalized={profileSource:input.profileSource||'session',profile:normalizeProfile(input.profile),offer:{companyName:input.offer?.companyName||'',roleName:input.offer?.roleName||'',workMode:input.offer?.workMode||'',commute:input.offer?.commute||'',salaryFeeling:input.offer?.salaryFeeling||'',decisionDate:input.offer?.decisionDate||'',concernPoint:input.offer?.concernPoint||''}};
    if (!set(storageFor('session'),'umsh_job_choice_input',JSON.stringify(normalized))) return false;
    if (!set(storageFor('session'),'umsh_job_choice_profile',JSON.stringify(normalized.profile))) return false;
    return {input:normalized};
  }
  function localizeInputDates() {
    for (const group of document.querySelectorAll?.('#jobChoiceForm .umsh-ymd') || []) {
      const source=group.previousElementSibling;
      if (source?.tagName!=='INPUT' || !['birthDate','decisionDate'].includes(source.name)) continue;
      const groupLabel=source.name==='birthDate'?TEXT.birthDate:TEXT.decisionDate;
      if (group.getAttribute('aria-label')!==groupLabel) group.setAttribute('aria-label',groupLabel);
      for (const select of group.querySelectorAll('select[data-umsh-ymd-part]')) {
        const label=TEXT[select.getAttribute('data-umsh-ymd-part')];
        if (!label) continue;
        if (select.getAttribute('aria-label')!==label) select.setAttribute('aria-label',label);
        if (select.options[0]?.value==='' && select.options[0].textContent!==label) select.options[0].textContent=label;
      }
    }
  }
  if (typeof document!=='undefined') {
    const startDateLabels=()=>{localizeInputDates();const form=document.getElementById?.('jobChoiceForm');if (form && typeof MutationObserver!=='undefined') new MutationObserver(localizeInputDates).observe(form,{childList:true,subtree:true});};
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',startDateLabels,{once:true}); else startDateLabels();
  }
  // The authenticated server reader owns report identity, contents and entitlement.
  // Keep the existing input-page API only, with no synthetic reading/paid side effects.
  window.JobChoice={loadStoredProfile,normalizeProfile,isProfileComplete,profileLabel,saveJobInput,hydrateContracts:()=>{}};
})();
