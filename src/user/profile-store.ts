import '../env/load.js'
import { Pool } from 'pg'
import type { BirthInput, SajuReportContext } from '../types/index.js'
import type { ReportOwner, ReportStorageMode } from '../report/report-store.js'

export interface UserBirthProfile {
  userId: string
  name: string
  birth: BirthInput
  birthTimeKnown: boolean
  context: Pick<SajuReportContext, 'target' | 'relationship' | 'orientation' | 'work'>
  createdAt: string
  updatedAt: string
}

type UserProfileRow = {
  user_id: string
  name: string
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: number
  birth_minute: number
  gender: BirthInput['gender']
  calendar: BirthInput['calendar']
  is_leap_month: boolean
  birth_time_known: boolean
  profile_payload?: {
    target?: string
    relationship?: string
    orientation?: string
    work?: string
  }
  created_at: string
  updated_at: string
}

const connectionString = process.env.DATABASE_URL
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
    })
  : null
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabasePublicKey =
  process.env.SUPABASE_PUBLISHABLE_KEY
  ?? process.env.SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY
  ?? ''
const supabaseRestUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/rest/v1/cheongi_user_profiles`
  : ''

const memoryProfiles = new Map<string, UserBirthProfile>()
let dbReady: Promise<void> | null = null

function storageMode(): ReportStorageMode {
  if (pool) return 'postgres'
  if (supabaseRestUrl && supabasePublicKey) return 'supabase'
  return 'memory'
}

function nowIso(): string {
  return new Date().toISOString()
}

function supabaseHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: supabasePublicKey,
  }
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  return headers
}

async function ensureDb(): Promise<void> {
  if (!pool) return
  if (!dbReady) {
    dbReady = pool.query(`
      CREATE TABLE IF NOT EXISTS cheongi_user_profiles (
        user_id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        birth_year INTEGER NOT NULL,
        birth_month INTEGER NOT NULL,
        birth_day INTEGER NOT NULL,
        birth_hour INTEGER NOT NULL,
        birth_minute INTEGER NOT NULL DEFAULT 0,
        gender TEXT NOT NULL,
        calendar TEXT NOT NULL DEFAULT 'solar',
        is_leap_month BOOLEAN NOT NULL DEFAULT FALSE,
        birth_time_known BOOLEAN NOT NULL DEFAULT TRUE,
        profile_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined)
  }
  await dbReady
}

function cloneProfile(profile: UserBirthProfile): UserBirthProfile {
  return JSON.parse(JSON.stringify(profile)) as UserBirthProfile
}

function rowToProfile(row: UserProfileRow): UserBirthProfile {
  return {
    userId: row.user_id,
    name: row.name,
    birth: {
      year: Number(row.birth_year),
      month: Number(row.birth_month),
      day: Number(row.birth_day),
      hour: Number(row.birth_hour),
      minute: Number(row.birth_minute ?? 0),
      gender: row.gender === 'female' ? 'female' : 'male',
      calendar: row.calendar === 'lunar' ? 'lunar' : 'solar',
      isLeapMonth: Boolean(row.is_leap_month),
    },
    birthTimeKnown: Boolean(row.birth_time_known),
    context: {
      target: row.profile_payload?.target,
      relationship: row.profile_payload?.relationship,
      orientation: row.profile_payload?.orientation,
      work: row.profile_payload?.work,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function profileToRow(profile: UserBirthProfile): UserProfileRow {
  return {
    user_id: profile.userId,
    name: profile.name,
    birth_year: profile.birth.year,
    birth_month: profile.birth.month,
    birth_day: profile.birth.day,
    birth_hour: profile.birth.hour,
    birth_minute: profile.birth.minute ?? 0,
    gender: profile.birth.gender,
    calendar: profile.birth.calendar,
    is_leap_month: Boolean(profile.birth.isLeapMonth),
    birth_time_known: profile.birthTimeKnown,
    profile_payload: {
      target: profile.context.target,
      relationship: profile.context.relationship,
      orientation: profile.context.orientation,
      work: profile.context.work,
    },
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  }
}

export function buildUserBirthProfile(params: {
  owner: ReportOwner
  name: string
  birth: BirthInput
  birthTimeKnown?: boolean
  context?: Pick<SajuReportContext, 'target' | 'relationship' | 'orientation' | 'work'>
}): UserBirthProfile {
  const timestamp = nowIso()
  return {
    userId: params.owner.id,
    name: params.name.trim(),
    birth: {
      year: params.birth.year,
      month: params.birth.month,
      day: params.birth.day,
      hour: params.birth.hour,
      minute: params.birth.minute ?? 0,
      gender: params.birth.gender,
      calendar: params.birth.calendar,
      isLeapMonth: Boolean(params.birth.isLeapMonth),
    },
    birthTimeKnown: params.birthTimeKnown ?? true,
    context: {
      target: params.context?.target,
      relationship: params.context?.relationship,
      orientation: params.context?.orientation,
      work: params.context?.work,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function getUserBirthProfile(owner: ReportOwner): Promise<UserBirthProfile | null> {
  if (storageMode() === 'memory') {
    const profile = memoryProfiles.get(owner.id)
    return profile ? cloneProfile(profile) : null
  }

  if (storageMode() === 'supabase') {
    if (!owner.accessToken) return null
    const response = await fetch(`${supabaseRestUrl}?user_id=eq.${encodeURIComponent(owner.id)}&select=*`, {
      headers: supabaseHeaders(owner.accessToken),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Supabase 사주 프로필 조회에 실패했습니다.')
    }
    const rows = await response.json() as UserProfileRow[]
    return rows[0] ? rowToProfile(rows[0]) : null
  }

  if (!pool) return null
  await ensureDb()
  const result = await pool.query<UserProfileRow>(
    'SELECT * FROM cheongi_user_profiles WHERE user_id = $1',
    [owner.id],
  )
  return result.rows[0] ? rowToProfile(result.rows[0]) : null
}

export async function saveUserBirthProfile(profile: UserBirthProfile, owner: ReportOwner): Promise<UserBirthProfile> {
  const previous = await getUserBirthProfile(owner)
  const next: UserBirthProfile = {
    ...profile,
    userId: owner.id,
    createdAt: previous?.createdAt ?? profile.createdAt,
    updatedAt: nowIso(),
  }
  const row = profileToRow(next)

  if (storageMode() === 'memory') {
    memoryProfiles.set(owner.id, cloneProfile(next))
    return cloneProfile(next)
  }

  if (storageMode() === 'supabase') {
    if (!owner.accessToken) {
      throw new Error('회원 인증 정보가 없어 사주 프로필을 저장하지 못했습니다.')
    }
    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(owner.accessToken),
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Supabase 사주 프로필 저장에 실패했습니다.')
    }
    const rows = await response.json() as UserProfileRow[]
    return rows[0] ? rowToProfile(rows[0]) : cloneProfile(next)
  }

  if (!pool) throw new Error('Postgres 저장소가 설정되지 않았습니다.')
  await ensureDb()
  const result = await pool.query<UserProfileRow>(
    `
      INSERT INTO cheongi_user_profiles (
        user_id,
        name,
        birth_year,
        birth_month,
        birth_day,
        birth_hour,
        birth_minute,
        gender,
        calendar,
        is_leap_month,
        birth_time_known,
        profile_payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, COALESCE($13::timestamptz, NOW()), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        birth_year = EXCLUDED.birth_year,
        birth_month = EXCLUDED.birth_month,
        birth_day = EXCLUDED.birth_day,
        birth_hour = EXCLUDED.birth_hour,
        birth_minute = EXCLUDED.birth_minute,
        gender = EXCLUDED.gender,
        calendar = EXCLUDED.calendar,
        is_leap_month = EXCLUDED.is_leap_month,
        birth_time_known = EXCLUDED.birth_time_known,
        profile_payload = EXCLUDED.profile_payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      row.user_id,
      row.name,
      row.birth_year,
      row.birth_month,
      row.birth_day,
      row.birth_hour,
      row.birth_minute,
      row.gender,
      row.calendar,
      row.is_leap_month,
      row.birth_time_known,
      JSON.stringify(row.profile_payload ?? {}),
      row.created_at,
    ],
  )
  return rowToProfile(result.rows[0])
}

export function getUserProfileStorageMode(): ReportStorageMode {
  return storageMode()
}
