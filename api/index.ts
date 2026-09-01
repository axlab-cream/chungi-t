import type { IncomingMessage, ServerResponse } from 'node:http'
import app from '../src/server/app.js'

const forwardedPathParam = '__umsh_path'

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeForwardedPath(path: string | undefined): string {
  if (!path) return '/'
  return `/${path.replace(/^\/+/, '')}`
}

function restoreForwardedPath(req: VercelRequest): void {
  const currentUrl = new URL(req.url ?? '/', 'https://umsh.local')
  const forwardedPath = firstQueryValue(req.query?.[forwardedPathParam]) ?? currentUrl.searchParams.get(forwardedPathParam) ?? undefined
  if (forwardedPath === undefined) return

  currentUrl.searchParams.delete(forwardedPathParam)
  req.url = `${normalizeForwardedPath(forwardedPath)}${currentUrl.search}`
}

export default function handler(req: VercelRequest, res: ServerResponse) {
  restoreForwardedPath(req)
  return app(req, res)
}
