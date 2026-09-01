import type { IncomingMessage, ServerResponse } from 'node:http'
import app from '../src/server/app.js'

const forwardedPathParam = '__umsh_path'
const functionPathPrefix = '/api/index'

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
  if (forwardedPath === undefined && !currentUrl.pathname.startsWith(functionPathPrefix)) return

  currentUrl.searchParams.delete(forwardedPathParam)
  const normalizedPath = forwardedPath === undefined
    ? normalizeForwardedPath(currentUrl.pathname.slice(functionPathPrefix.length))
    : normalizeForwardedPath(forwardedPath)
  req.url = `${normalizedPath}${currentUrl.search}`
}

export default function handler(req: VercelRequest, res: ServerResponse) {
  restoreForwardedPath(req)
  return app(req, res)
}
