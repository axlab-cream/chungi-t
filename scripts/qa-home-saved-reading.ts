import '../src/env/load.js'
const id = '66770b5c-97b6-4427-aedd-b455a17a4360'
const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!base || !key) { console.log('READ_NOT_CONFIGURED'); process.exit(1) }
const url = new URL('/rest/v1/cheongi_reports', base)
url.searchParams.set('report_id', `eq.${id}`)
url.searchParams.set('select', 'payload')
url.searchParams.set('limit', '1')
const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
if (!response.ok) { console.log(`READ_STATUS_${response.status}`); process.exit(1) }
const rows = await response.json()
const record = rows[0]?.payload
if (!record) { console.log('NOT_FOUND'); process.exit(1) }
console.log(JSON.stringify({ sections: record.report?.sections?.map((s: any) => ({id:s.id,category:s.category,hook:s.hook,interpretation:s.interpretation,status:s.status})) }))
