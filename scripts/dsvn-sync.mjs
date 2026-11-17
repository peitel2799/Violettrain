#!/usr/bin/env node
/**
 * Full DSVN sync (timetable + fares) for a long date range, without the
 * serverless time limit. Reads DSVN's public pages one lookup at a time, so a
 * range of ~3 months takes 1–2 hours.
 *
 *   npm run dsvn:sync -- --until 2027-06-30            # database from .env.local
 *   npm run dsvn:sync -- --until 2027-06-30 --cloud    # linked Supabase cloud project
 *
 * Options: --from YYYY-MM-DD (default today), --until YYYY-MM-DD (default +29 days),
 *          --env-file <path>, --cloud, --skip-fares, --reproject
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { addDays, runDsvnSync, vietnamToday } from '../src/lib/dsvn-sync-core.ts'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
const isoDate = /^\d{4}-\d{2}-\d{2}$/

function readEnvFile(path) {
  if (!existsSync(path)) throw new Error(`Không tìm thấy ${path}`)
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')]
    }))
}

function cloudCredentials() {
  const refFile = 'supabase/.temp/project-ref'
  if (!existsSync(refFile)) throw new Error('Chưa link Supabase cloud: chạy `npx supabase link --project-ref <ref>` trước.')
  const ref = readFileSync(refFile, 'utf8').trim()
  const output = execSync(`npx supabase projects api-keys --project-ref ${ref} -o json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const keys = []
  const collect = (node) => {
    if (Array.isArray(node)) node.forEach(collect)
    else if (node && typeof node === 'object') {
      if (typeof node.api_key === 'string') keys.push(node)
      else Object.values(node).forEach(collect)
    }
  }
  collect(JSON.parse(output.slice(output.search(/[[{]/))))
  const service = keys.find((key) => key.name === 'service_role') ?? keys.find((key) => key.type === 'secret')
  if (!service) throw new Error('Không lấy được service key của project cloud (đã `npx supabase login` chưa?).')
  return { url: `https://${ref}.supabase.co`, serviceKey: service.api_key, label: `cloud ${ref}` }
}

function localCredentials() {
  const file = value('env-file') ?? '.env.local'
  const env = readEnvFile(file)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error(`${file} thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY`)
  return { url, serviceKey, label: `${url} (${file})` }
}

const from = value('from') ?? vietnamToday()
const until = value('until') ?? addDays(from, 29)
if (!isoDate.test(from) || !isoDate.test(until)) {
  console.error('Ngày phải có dạng YYYY-MM-DD, ví dụ --until 2027-06-30')
  process.exit(2)
}

const credentials = flag('cloud') ? cloudCredentials() : localCredentials()
const supabase = createClient(credentials.url, credentials.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const stamp = () => new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })

console.log(`[${stamp()}] Đồng bộ DSVN ${from} → ${until} vào ${credentials.label}`)
const result = await runDsvnSync({
  supabase,
  trigger: 'script',
  from,
  until,
  reproject: flag('reproject'),
  skipFares: flag('skip-fares'),
  log: (line) => console.log(`[${stamp()}] ${line}`),
})

const { errors, ...summary } = result
console.log(JSON.stringify(summary, null, 2))
if (errors.length) {
  console.log(`${errors.length} lỗi (tối đa 30 dòng đầu):`)
  for (const error of errors.slice(0, 30)) console.log(`  - ${error}`)
}
process.exit(result.status === 'failed' ? 1 : 0)
