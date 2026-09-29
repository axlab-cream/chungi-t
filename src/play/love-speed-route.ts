import { Router, type Request, type Response } from 'express'
import { calculateLoveResult, parseLoveInput } from './love-speed.js'
import type { SajuAnalysis } from '../types/index.js'

export function loveSpeedRouter<Owner>(deps: {
  authenticate: (req: Request, res: Response) => Promise<Owner | null>
  context: (owner: Owner) => Promise<{ saju: Pick<SajuAnalysis, 'dayMasterElement'> | null; birthTimeKnown: boolean }>
}) {
  const router = Router()
  router.post('/result', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const owner = await deps.authenticate(req, res)
      if (!owner) return
      let input
      try { input = parseLoveInput(req.body) } catch { res.status(400).json({ error: '다섯 답변과 MBTI 선택을 확인해주세요.' }); return }
      const context = await deps.context(owner)
      res.json(calculateLoveResult(input, context.saju, context.birthTimeKnown))
    } catch {
      res.status(503).json({ error: '결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.' })
    }
  })
  return router
}
