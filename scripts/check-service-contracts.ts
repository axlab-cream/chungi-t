import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  KNOWN_SERVICE_KEYS,
  loadServiceSystemPrompt,
  normalizeServiceKey,
  type KnownServiceKey,
} from '../src/prompt/service-system.js'
import { SERVICE_VOICE_CONTRACTS } from '../src/prompt/service-voice-contracts.js'

const root = process.cwd()
const manifest = JSON.parse(readFileSync(join(root, 'prompts', 'services-manifest.json'), 'utf8')) as {
  services: Array<{ key: KnownServiceKey }>
}
const registry = JSON.parse(readFileSync(join(root, 'data', 'corpus', 'registry.json'), 'utf8')) as {
  packs: Array<{ domain?: string; role?: string }>
}

const failures: string[] = []
const manifestKeys = manifest.services.map((service) => service.key)
const contractKeys = Object.keys(SERVICE_VOICE_CONTRACTS).sort()
const knownKeys = [...KNOWN_SERVICE_KEYS].sort()

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

if (manifestKeys.length !== 20) failures.push(`services-manifest.json: expected 20 services, got ${manifestKeys.length}`)
if (!sameSet([...manifestKeys].sort(), knownKeys)) failures.push('KNOWN_SERVICE_KEYS does not match services-manifest.json')
if (!sameSet(contractKeys, knownKeys)) failures.push('SERVICE_VOICE_CONTRACTS does not cover all 20 known services')

const visibleText = (contract: (typeof SERVICE_VOICE_CONTRACTS)[KnownServiceKey]) => [
  contract.promise,
  contract.userQuestion,
  contract.emotionalState,
  contract.conversationMode,
  contract.relationshipDistance,
  contract.teaserJob,
  contract.reportJob,
  contract.requiredScenes.join(' '),
  contract.decisionCriteria.join(' '),
].join(' ')

const bannedVisible = /측정 전|자료가 아직 없어요|DEM|서버 권한|로그인과 결제 상태|해석을 준비|풀이\s*\d+|Feature JSON|serviceKey/i
for (const key of KNOWN_SERVICE_KEYS) {
  const contract = SERVICE_VOICE_CONTRACTS[key]
  if (!contract) {
    failures.push(`${key}: missing service voice contract`)
    continue
  }
  if (contract.serviceKey !== key) failures.push(`${key}: contract serviceKey mismatch`)
  if (contract.requiredScenes.length < 3) failures.push(`${key}: requiredScenes must have at least 3 scenes`)
  if (contract.decisionCriteria.length < 3) failures.push(`${key}: decisionCriteria must have at least 3 items`)
  if (contract.holdConditions.length < 3) failures.push(`${key}: holdConditions must have at least 3 items`)
  if (contract.forbiddenCustomerCopy.length < 3) failures.push(`${key}: forbiddenCustomerCopy must have at least 3 items`)
  if (bannedVisible.test(visibleText(contract))) failures.push(`${key}: contract visible guidance contains internal/customer-hostile wording`)
  const prompt = loadServiceSystemPrompt(key)
  if (!prompt.includes(`서비스별 해석 계약 · ${contract.serviceTitle}`)) failures.push(`${key}: runtime prompt does not include voice contract`)
}

const domains = new Set(registry.packs.filter((pack) => pack.role?.startsWith('single_service_')).map((pack) => pack.domain))
for (const key of KNOWN_SERVICE_KEYS) {
  const expected = key === 'newyear_flow' ? 'newyear_service' : `${key}_service`
  if (!domains.has(expected)) failures.push(`${key}: dedicated corpus domain missing (${expected})`)
}

const aliasChecks: Array<[string, KnownServiceKey]> = [
  ['cmdg', 'cmdg' as KnownServiceKey],
  ['home_pungsu', 'home_fit'],
  ['home', 'home_fit'],
  ['love_thisyear', 'love_this_year'],
  ['love_signal', 'couple_signal'],
  ['today', 'today_fortune'],
]
if (normalizeServiceKey('home_pungsu') !== 'home_fit') failures.push('home_pungsu alias must stay mapped to home_fit')
if (normalizeServiceKey('today') !== 'today_fortune') failures.push('today alias must stay mapped to today_fortune')
void aliasChecks

const outDir = join(root, 'output', 'service-contracts-qa')
mkdirSync(outDir, { recursive: true })
const report = {
  generatedAt: new Date().toISOString(),
  serviceCount: manifestKeys.length,
  services: KNOWN_SERVICE_KEYS.map((key) => {
    const contract = SERVICE_VOICE_CONTRACTS[key]
    return {
      key,
      title: contract.serviceTitle,
      userQuestion: contract.userQuestion,
      teaserJob: contract.teaserJob,
      reportJob: contract.reportJob,
      scenes: contract.requiredScenes,
      decisionCriteria: contract.decisionCriteria,
      holdConditions: contract.holdConditions,
    }
  }),
  failures,
}
writeFileSync(join(outDir, 'service-contracts-qa.json'), JSON.stringify(report, null, 2), 'utf8')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`20개 서비스 해석 계약 QA 통과: ${manifestKeys.length}개 서비스 · 계약/프롬프트/코퍼스 도메인 확인`)
