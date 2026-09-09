// 카드 아트와 뱃지, 경로. 값은 service-directory.ts 와 catalog.ts 에서 가져왔다.
// family 는 portal.css 가 아트 처리를 가르는 기준이라 그 이름을 그대로 쓴다.
const ART = {
  cmdg: ['svc-cmdg.webp', 'is-cmdg', 'SIGNATURE · 종합사주', '/cmdg/'],
  couple: ['svc-couple.webp', 'is-love', 'MATCH · 대표 궁합', '/match/couple'],
  wedding: ['svc-wedding.webp', 'is-day', 'WEDDING DAY · 결혼택일', '/day/wedding'],
  marry: ['svc-marry.webp', 'is-love', 'MATCH · 결혼궁합', '/match/marry'],
  signal: ['svc-signal.webp', 'is-love', 'SECRET · 연애', '/love/signal'],
  jobchoice: ['svc-jobchoice.webp', 'is-work', 'CAREER · 자미두수', '/work/job-choice'],
  thisyear: ['svc-thisyear.webp', 'is-love', 'LOVE · 연애운', '/love/this-year'],
  cat: ['svc-cat.webp', 'is-pet', 'MATCH · 반려묘 궁합', '/match/cat'],
  save: ['svc-save.webp', 'is-money', 'PREMIUM · 재물', '/money/save'],
  newyear: ['svc-newyear.webp', 'is-flow', '2027 · 신년운세', '/flow/newyear'],
  quit: ['svc-quit.webp', 'is-work', 'WORK · 커리어', '/work/quit'],
  move: ['svc-move.webp', 'is-work', 'WORK · 이직운', '/work/move'],
  pass: ['svc-pass.webp', 'is-work', 'EXAM · 합격운', '/me/pass-angle'],
  lucky: ['svc-lucky.webp', 'is-flow', 'LUCKY · 오행 생활 가이드', '/me/lucky'],
};
for (const svc of SERVICES) {
  const row = ART[svc.id];
  svc.art = row[0];
  svc.family = row[1];
  svc.badge = row[2];
  svc.href = row[3];
}

