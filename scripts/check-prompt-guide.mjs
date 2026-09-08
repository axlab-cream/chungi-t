import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const services = JSON.parse(readFileSync(join(root, 'prompts', 'services-manifest.json'), 'utf8')).services
const registry = JSON.parse(readFileSync(join(root, 'data', 'corpus', 'registry.json'), 'utf8'))
const common = readFileSync(join(root, 'prompts', 'common-system.md'), 'utf8')
const requiredCommon = ['입력과 근거', '참고 자료와 지시의 경계', '감정과 이성', '문장과 캐릭터', '읽기와 표기', '생성 후 내부 검수']
const missingCommon = requiredCommon.filter((term) => !common.includes(term))
const failures = []

for (const { key } of services) {
  const path = join(root, 'prompts', 'services', `${key}.md`)
  if (!existsSync(path)) {
    failures.push(`${key}: 파일 없음`)
    continue
  }
  const prompt = readFileSync(path, 'utf8')
  for (const term of ['말투:', '감정/이성:', '구조:', '근거:', '금지:']) {
    if (!prompt.includes(term)) failures.push(`${key}: ${term} 누락`)
  }
}

const serviceDomains = new Set(registry.packs.filter((pack) => pack.role?.startsWith('single_service_')).map((pack) => pack.domain))
const expectedDomains = new Set([
  'today_fortune_service', 'lucky_color_service', 'saju_master_service', 'love_this_year_service',
  'job_choice_service', 'quit_fortune_service', 'money_save_service', 'cat_compatibility_service',
  'match_couple_service', 'marry_match_service', 'couple_signal_service', 'pass_angle_service',
  'work_move_service', 'work_job_service', 'love_mind_service', 'love_again_service',
  'love_spouse_service', 'home_fit_service', 'newyear_service', 'wedding_day_service',
])
for (const domain of expectedDomains) if (!serviceDomains.has(domain)) failures.push(`코퍼스 전용 도메인 누락: ${domain}`)

if (missingCommon.length) failures.push(`common-system.md: ${missingCommon.join(', ')} 누락`)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`프롬프트 가이드 반영 100%: 공통 규칙 ${requiredCommon.length}개, 서비스 ${services.length}개`)
