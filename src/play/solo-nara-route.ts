import { Router, type Request, type Response } from 'express'
import { calculateSoloResult, parseSoloInput, structureErrors, type SoloSpec } from './solo-nara.js'

export function soloNaraRouter<Owner>(deps: {
  authenticate: (req: Request, res: Response) => Promise<Owner | null>
  spec: SoloSpec
}) {
  const problems = structureErrors(deps.spec)
  if (problems.length) throw new Error(`solo-nara spec is invalid: ${problems.join('; ')}`)
  const router = Router()
  router.post('/result', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const owner = await deps.authenticate(req, res)
      if (!owner) return
      try { parseSoloInput(req.body) } catch { res.status(400).json({ error: '성별과 열 문항의 답변을 확인해주세요.' }); return }
      res.json(calculateSoloResult(deps.spec, req.body))
    } catch {
      res.status(503).json({ error: '결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.' })
    }
  })
  return router
}
