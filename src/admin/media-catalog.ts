import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 미디어(이미지·첨부 자산) 카탈로그.
 *
 * 이 서비스에는 미디어를 저장하는 데이터베이스 표가 없다 — 이미지는 배포에 실린 정적
 * 파일 그 자체다(`사주/**`, vercel.json 의 includeFiles 로 함수 번들에 포함됨). 그래서
 * 저장소를 새로 만드는 대신 **실제로 배포된 파일**을 훑어 카탈로그를 만든다. 어떤 서비스
 * 페이지가 그 파일을 실제로 참조하는지까지 세어, 어디에도 안 쓰이는 자산(정리 대상)을
 * 구분한다. 임의 수치나 예시 행은 만들지 않는다.
 */

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const STATIC_ROOT = join(PROJECT_ROOT, '사주')
const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif'])

export type AdminMediaAsset = {
  /** 공개 URL 경로. `사주/` 가 정적 루트이므로 그 아래 상대 경로 그대로다. */
  path: string
  bytes: number
  /** 이 파일명을 실제로 참조하는 HTML 페이지 수. */
  referencedBy: number
  status: 'in_use' | 'unused'
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
}

const CACHE_MS = 5 * 60_000
let cached: { at: number; assets: AdminMediaAsset[] } | null = null

/**
 * 배포 파일은 요청 중에 바뀌지 않는다(다음 배포에서만 바뀐다). 그런데도 캐시를 짧게
 * (5분) 두는 것은 무한이 아니라 — 로컬 개발에서 파일을 고치며 확인할 때 서버를 다시
 * 켜지 않아도 곧 반영되게 하기 위해서다.
 */
export function getMediaCatalog(): AdminMediaAsset[] {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.assets
  const files: string[] = []
  walk(STATIC_ROOT, files)
  const images = files.filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()))
  const htmlText = files.filter((file) => file.endsWith('.html')).map((file) => readFileSync(file, 'utf8'))
  const assets = images.map((file) => {
    const publicPath = `/${relative(STATIC_ROOT, file).split(sep).join('/')}`
    const fileName = basename(file)
    const referencedBy = htmlText.filter((text) => text.includes(fileName)).length
    const status: AdminMediaAsset['status'] = referencedBy > 0 ? 'in_use' : 'unused'
    return { path: publicPath, bytes: statSync(file).size, referencedBy, status }
  })
  // 정리가 필요한(미사용) 자산을 먼저 보여준다 — 관리자가 실제로 할 일이 있는 줄이 위로 온다.
  assets.sort((a, b) => (a.status === b.status ? b.bytes - a.bytes : a.status === 'unused' ? -1 : 1))
  cached = { at: Date.now(), assets }
  return assets
}

/** 테스트가 파일 변경 뒤 즉시 다시 훑게 한다. */
export function resetMediaCatalogCache(): void { cached = null }
