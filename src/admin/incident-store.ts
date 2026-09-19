import { configuredEnv } from '../env/load.js'

type Row = Record<string, unknown>
const baseUrl = configuredEnv(process.env.SUPABASE_URL)?.replace(/\/$/, '')
const serviceKey = configuredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

function table(name: string): string {
  if (!baseUrl || !serviceKey) throw new Error('INCIDENT_STORE_UNAVAILABLE')
  return `${baseUrl}/rest/v1/${name}`
}
function headers(): Record<string, string> {
  if (!serviceKey) throw new Error('INCIDENT_STORE_UNAVAILABLE')
  const result: Record<string, string> = { apikey: serviceKey }
  if (!serviceKey.startsWith('sb_secret_') && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(serviceKey)) result.authorization = `Bearer ${serviceKey}`
  return result
}

export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export const INCIDENT_STATUSES = ['open', 'investigating', 'mitigated', 'resolved', 'closed'] as const
export type IncidentSeverity = typeof INCIDENT_SEVERITIES[number]
export type IncidentStatus = typeof INCIDENT_STATUSES[number]
export type AdminIncident = {
  id: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  summary: string
  affectedArea: string | null
  ownerEmail: string | null
  createdByEmail: string
  revision: number
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}
export type IncidentUpdateNote = { id: string; incidentId: string; author: string; text: string; createdAt: string }

const SELECT = 'id,title,severity,status,summary,affected_area,owner_email,created_by_email,revision,created_at,updated_at,resolved_at'

function incident(row: Row): AdminIncident {
  return {
    id: String(row.id),
    title: String(row.title),
    severity: String(row.severity) as IncidentSeverity,
    status: String(row.status) as IncidentStatus,
    summary: String(row.summary),
    affectedArea: row.affected_area ? String(row.affected_area) : null,
    ownerEmail: row.owner_email ? String(row.owner_email) : null,
    createdByEmail: String(row.created_by_email),
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  }
}
function updateNote(row: Row): IncidentUpdateNote {
  return { id: String(row.id), incidentId: String(row.incident_id), author: String(row.author_email), text: String(row.text), createdAt: String(row.created_at) }
}

export async function listIncidents(limit = 100): Promise<AdminIncident[]> {
  const request = new URL(table('admin_incidents'))
  request.searchParams.set('select', SELECT)
  request.searchParams.set('order', 'status.asc,created_at.desc')
  request.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)))
  const response = await fetch(request, { headers: headers() })
  if (!response.ok) throw new Error('INCIDENT_LOOKUP_FAILED')
  return (await response.json() as Row[]).map(incident)
}

export async function createIncident(input: { title: string; severity: IncidentSeverity; summary: string; affectedArea?: string; ownerEmail?: string; actorEmail: string }): Promise<AdminIncident> {
  const response = await fetch(table('admin_incidents'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({
      title: input.title, severity: input.severity, summary: input.summary,
      affected_area: input.affectedArea || null, owner_email: input.ownerEmail || null,
      created_by_email: input.actorEmail.toLowerCase(),
    }),
  })
  if (!response.ok) throw new Error('INCIDENT_CREATE_FAILED')
  const rows = await response.json() as Row[]
  if (!rows[0]) throw new Error('INCIDENT_CREATE_FAILED')
  return incident(rows[0])
}

/**
 * status 를 resolved·closed 로 옮기면 resolved_at 을 지금 시각으로 찍는다. 되돌리면
 * (예: 재발로 open 으로 되돌리면) 다시 비운다 — "해결 시각"이 마지막 값으로 굳지 않는다.
 */
export async function updateIncident(input: { id: string; expectedRevision: number; severity: IncidentSeverity; status: IncidentStatus; ownerEmail: string | null }): Promise<AdminIncident | null> {
  const request = new URL(table('admin_incidents'))
  request.searchParams.set('id', `eq.${input.id}`)
  request.searchParams.set('revision', `eq.${input.expectedRevision}`)
  const closing = input.status === 'resolved' || input.status === 'closed'
  const response = await fetch(request, {
    method: 'PATCH',
    headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({
      severity: input.severity, status: input.status, owner_email: input.ownerEmail,
      revision: input.expectedRevision + 1, updated_at: new Date().toISOString(),
      resolved_at: closing ? new Date().toISOString() : null,
    }),
  })
  if (!response.ok) throw new Error('INCIDENT_UPDATE_FAILED')
  const rows = await response.json() as Row[]
  return rows[0] ? incident(rows[0]) : null
}

export async function listIncidentUpdates(incidentId: string): Promise<IncidentUpdateNote[]> {
  const request = new URL(table('admin_incident_updates'))
  request.searchParams.set('incident_id', `eq.${incidentId}`)
  request.searchParams.set('select', 'id,incident_id,author_email,text,created_at')
  request.searchParams.set('order', 'created_at.asc')
  const response = await fetch(request, { headers: headers() })
  if (!response.ok) throw new Error('INCIDENT_UPDATE_LOOKUP_FAILED')
  return (await response.json() as Row[]).map(updateNote)
}

export async function createIncidentUpdate(input: { incidentId: string; text: string; actorEmail: string }): Promise<IncidentUpdateNote> {
  const response = await fetch(table('admin_incident_updates'), {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ incident_id: input.incidentId, text: input.text.trim(), author_email: input.actorEmail.toLowerCase() }),
  })
  if (!response.ok) throw new Error('INCIDENT_UPDATE_CREATE_FAILED')
  const rows = await response.json() as Row[]
  if (!rows[0]) throw new Error('INCIDENT_UPDATE_CREATE_FAILED')
  return updateNote(rows[0])
}
