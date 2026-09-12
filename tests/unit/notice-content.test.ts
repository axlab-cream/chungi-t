import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { parseNoticeDraftFields, parseNoticeScheduleAt } from '../../src/admin/notice-content.js'

describe('운영 공지 구조화 입력', () => {
  it('제목과 본문만 허용하고 공백을 정리한다', () => {
    assert.deepEqual(parseNoticeDraftFields({ title: '  서비스 안내  ', body: '  확인해 주세요.  ' }), {
      title: '서비스 안내',
      body: '확인해 주세요.',
    })
  })

  it('알 수 없는 필드와 HTML 형태 입력을 거절한다', () => {
    assert.throws(() => parseNoticeDraftFields({ title: '안내', body: '본문', href: 'https://example.com' }), /NOTICE_FIELDS_INVALID/)
    assert.throws(() => parseNoticeDraftFields({ title: '<b>안내</b>', body: '본문' }), /NOTICE_TEXT_INVALID/)
    assert.throws(() => parseNoticeDraftFields({ title: '안내', body: '<script>alert(1)</script>' }), /NOTICE_TEXT_INVALID/)
  })

  it('빈 값과 길이 초과를 거절한다', () => {
    assert.throws(() => parseNoticeDraftFields({ title: '', body: '본문' }), /NOTICE_TITLE_INVALID/)
    assert.throws(() => parseNoticeDraftFields({ title: '안내', body: '가'.repeat(1001) }), /NOTICE_BODY_INVALID/)
  })
})

describe('운영 공지 예약 시각', () => {
  it('현재보다 1분 뒤인 ISO 시각만 허용한다', () => {
    const now = new Date('2026-09-12T03:00:00.000Z')
    assert.equal(parseNoticeScheduleAt('2026-09-12T03:01:00.000Z', now), '2026-09-12T03:01:00.000Z')
    assert.throws(() => parseNoticeScheduleAt('2026-09-12T03:00:59.999Z', now), /NOTICE_SCHEDULE_AT_INVALID/)
    assert.throws(() => parseNoticeScheduleAt('내일', now), /NOTICE_SCHEDULE_AT_INVALID/)
  })
})

describe('운영 공지 데이터베이스 권한', () => {
  it('RPC는 빈 search_path와 service_role 전용 실행 권한을 사용한다', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20260911224332_support_notice_version_functions.sql', import.meta.url), 'utf8')
    assert.equal((sql.match(/security definer/gi) ?? []).length, 2)
    assert.equal((sql.match(/set search_path = ''/gi) ?? []).length, 2)
    for (const name of ['create_support_notice_draft', 'publish_support_notice_draft']) {
      assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^;]+ from public, anon, authenticated`, 'i'))
      assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^;]+ to service_role`, 'i'))
    }
    assert.match(sql, /where state = 'draft'/i)
    assert.match(sql, /and state = 'published'/i)
  })

  it('승인·예약 RPC가 revision과 checksum을 검증하고 service_role만 허용한다', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20260912093000_support_notice_approval_schedule.sql', import.meta.url), 'utf8')
    for (const name of ['update_support_notice_draft', 'request_support_notice_approval', 'approve_support_notice_draft', 'schedule_support_notice_draft', 'cancel_support_notice_schedule', 'publish_due_support_notices']) {
      assert.match(sql, new RegExp(`create or replace function public\\.${name}`, 'i'))
      assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^;]+ from public, anon, authenticated`, 'i'))
      assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^;]+ to service_role`, 'i'))
    }
    assert.match(sql, /approved_checksum = checksum/i)
    assert.match(sql, /approval_requested_at = null/i)
    assert.match(sql, /scheduled_at = null/i)
    assert.match(sql, /scheduled_at <= now\(\)/i)
    const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as { crons?: Array<{ path?: string, schedule?: string }> }
    assert.deepEqual(vercel.crons, [{ path: '/api/cron/ops', schedule: '* * * * *' }])
  })
})
