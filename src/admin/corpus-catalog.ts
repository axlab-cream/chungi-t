import { basename, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCorpusSnapshot } from '../rag/corpus-registry.js'
import { serviceTitleForKey } from '../server/service-directory.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = resolve(__dirname, '../../data')

const ROLE_COPY: Record<string, { label: string, description: string }> = {
  stable_foundation: {
    label: '명리 기본 근거',
    description: '모든 서비스가 사주 원리와 용어를 해석할 때 공통으로 참고합니다.',
  },
  longform_depth: {
    label: '장문 해석 보강',
    description: '리포트 설명이 얕아지지 않도록 배경 원리와 해석 깊이를 보강합니다.',
  },
  user_choice_grounding: {
    label: '사용자 입력 연결',
    description: '사용자가 입력 화면에서 고른 답을 리포트의 판단 근거와 연결합니다.',
  },
  quality_gap_patch: {
    label: '품질 누락 보완',
    description: '검수에서 자주 빠진 해석 항목을 보충해 답변 완성도를 높입니다.',
  },
  paid_narrative_density_patch: {
    label: '유료 리포트 장면 보강',
    description: '유료 리포트에 실제 생활 장면과 구체적인 행동 맥락을 더합니다.',
  },
  advanced_quality_gap_patch: {
    label: '고급 명리 판단 보강',
    description: '격국·조후·통관·만세력 등 고급 판단에 필요한 근거를 보완합니다.',
  },
  structured_saju_atoms: {
    label: '구조화된 사주 요소',
    description: '오행과 십신 등 계산 결과를 일관된 데이터 구조로 제공합니다.',
  },
  intent_and_prompt_frames: {
    label: '질문 의도·답변 틀',
    description: '질문 유형을 분류하고 답변이 따라야 할 기본 구성을 제공합니다.',
  },
}

const KIND_LABELS: Record<string, string> = {
  chunks: '검색 지식',
  structured: '구조화 자료',
  templates: '답변 틀',
}

function roleCopy(role: string, serviceTitle: string): { label: string, description: string } {
  if (role.startsWith('single_service_')) {
    return {
      label: '서비스 전용 판단 근거',
      description: `${serviceTitle} 리포트가 질문에 맞는 근거를 찾을 때 우선 참고합니다.`,
    }
  }
  return ROLE_COPY[role] ?? {
    label: '기타 검색 근거',
    description: '리포트 생성 중 관련 질문과 일치할 때 참고하는 보조 자료입니다.',
  }
}

export function getAdminCorpusSnapshot() {
  const corpus = getCorpusSnapshot()
  return {
    ...corpus,
    activePacks: corpus.activePacks.map((pack) => {
      const serviceTitle = serviceTitleForKey(pack.serviceKey) ?? '공통'
      const copy = roleCopy(pack.role, serviceTitle)
      return {
        ...pack,
        serviceTitle,
        kindLabel: KIND_LABELS[pack.kind] ?? '기타 자료',
        roleLabel: copy.label,
        roleDescription: copy.description,
        fileName: basename(pack.path),
        downloadUrl: `/api/admin/v1/corpus/${encodeURIComponent(pack.id)}/download`,
      }
    }),
  }
}

export function resolveActiveCorpusDownload(packId: string): { absolutePath: string, fileName: string } | undefined {
  const pack = getCorpusSnapshot().activePacks.find((item) => item.id === packId)
  if (!pack) return undefined
  const absolutePath = resolve(DATA_ROOT, pack.path)
  if (!absolutePath.startsWith(DATA_ROOT + sep)) return undefined
  return { absolutePath, fileName: basename(pack.path) }
}
