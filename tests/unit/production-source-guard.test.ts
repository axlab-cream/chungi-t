import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('../../scripts/check-production-source.mjs', import.meta.url))

function git(cwd: string, ...args: string[]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, `fixture git ${args[0]} failed: ${result.stderr}`)
  return result.stdout.trim()
}

function run(cwd: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', timeout: 40_000, windowsHide: true })
  assert.ifError(result.error)
  return { status: result.status, output: result.stdout + result.stderr }
}

function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'umsh-production-source-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const remote = join(root, 'remote.git')
  const work = join(root, 'work')
  mkdirSync(work)
  git(root, 'init', '--bare', '--initial-branch=main', remote)
  git(work, 'init', '--initial-branch=main')
  git(work, 'config', 'user.name', 'Source Guard Test')
  git(work, 'config', 'user.email', 'source-guard@example.invalid')
  git(work, 'remote', 'add', 'origin', remote)
  writeFileSync(join(work, 'source.txt'), 'original\n')
  git(work, 'add', 'source.txt')
  git(work, 'commit', '-m', 'fixture initial source')
  git(work, 'push', '-u', 'origin', 'main')
  const initial = git(work, 'rev-parse', 'HEAD')
  function advanceRemote() {
    const writer = join(root, 'writer')
    git(root, 'clone', remote, writer)
    git(writer, 'config', 'user.name', 'Source Guard Test')
    git(writer, 'config', 'user.email', 'source-guard@example.invalid')
    writeFileSync(join(writer, 'new-service.txt'), 'new service\n')
    git(writer, 'add', 'new-service.txt')
    git(writer, 'commit', '-m', 'fixture remote update')
    git(writer, 'push', 'origin', 'main')
    return git(writer, 'rev-parse', 'HEAD')
  }
  return { root, remote, work, initial, advanceRemote }
}

test('clean current source passes and prints hashes plus manual-only scope', t => {
  const { work, initial } = fixture(t)
  const result = run(work, `--expected-head=${initial}`)
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /Manual preflight only/)
  assert.match(result.output, /does not intercept other deploys/)
  assert.ok(result.output.includes(`HEAD=${initial}`))
  assert.ok(result.output.includes(`origin/main=${initial}`))
  assert.match(result.output, /PASS/)
})

test('fresh fetch rejects stale source even if the local remote-tracking ref looked current', t => {
  const { work, initial, advanceRemote } = fixture(t)
  const latest = advanceRemote()
  assert.equal(git(work, 'rev-parse', 'origin/main'), initial)
  const result = run(work)
  assert.equal(result.status, 1, result.output)
  assert.ok(result.output.includes(`origin/main=${latest}`))
  assert.match(result.output, /does not contain the freshly fetched origin\/main/)
  assert.equal(git(work, 'rev-parse', 'HEAD'), initial, 'guard must not merge or checkout source')
})

test('a clean integration branch including remote main passes regardless of stale local main', t => {
  const { work, initial, advanceRemote } = fixture(t)
  const latest = advanceRemote()
  git(work, 'fetch', 'origin', 'main')
  git(work, 'checkout', '-b', 'codex/integration', latest)
  writeFileSync(join(work, 'local-fix.txt'), 'retained fix\n')
  git(work, 'add', 'local-fix.txt')
  git(work, 'commit', '-m', 'fixture integrated fix')
  assert.equal(git(work, 'rev-parse', 'main'), initial)
  assert.equal(run(work).status, 0)
})

for (const kind of ['unstaged', 'staged', 'untracked'] as const) {
  test(`${kind} source changes fail closed`, t => {
    const { work } = fixture(t)
    writeFileSync(join(work, kind === 'untracked' ? 'extra.txt' : 'source.txt'), 'changed\n')
    if (kind === 'staged') git(work, 'add', 'source.txt')
    const result = run(work)
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /Working tree is not clean/)
  })
}

test('expected HEAD prevents promoting a different clean commit and rejects shorthand', t => {
  const { work, initial } = fixture(t)
  writeFileSync(join(work, 'source.txt'), 'updated\n')
  git(work, 'add', 'source.txt')
  git(work, 'commit', '-m', 'fixture changed artifact')
  const mismatch = run(work, `--expected-head=${initial}`)
  assert.equal(mismatch.status, 1, mismatch.output)
  assert.match(mismatch.output, /HEAD differs from --expected-head/)
  const shortened = run(work, `--expected-head=${initial.slice(0, 7)}`)
  assert.equal(shortened.status, 1)
  assert.match(shortened.output, /full 40- or 64-character Git commit hash/)
})

test('custom fetch mappings cannot leave origin/main stale', t => {
  const { work, advanceRemote } = fixture(t)
  const latest = advanceRemote()
  git(work, 'config', 'remote.origin.fetch', '+refs/heads/main:refs/remotes/custom/main')
  const result = run(work)
  assert.equal(result.status, 1, result.output)
  assert.equal(git(work, 'rev-parse', 'origin/main'), latest)
})

test('fetch failure cannot pass using a cached origin/main and does not echo the remote URL', t => {
  const { work, root } = fixture(t)
  const inaccessible = join(root, 'missing-private-remote.git')
  git(work, 'remote', 'set-url', 'origin', inaccessible)
  const result = run(work)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /git fetch failed/)
  assert.ok(!result.output.includes(inaccessible))
  assert.doesNotMatch(result.output, /PASS/)
})

test('import and help do not run Git, while invalid options and a non-repository fail safely', t => {
  const root = mkdtempSync(join(tmpdir(), 'umsh-production-source-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(script).href)})`], { cwd: root, encoding: 'utf8', windowsHide: true })
  assert.equal(imported.status, 0, imported.stderr)
  assert.equal(imported.stdout, '')
  assert.equal(imported.stderr, '')
  assert.equal(run(root, '--help').status, 0)
  assert.equal(run(root, '--unknown').status, 1)
  assert.equal(run(root, '--expected-head=').status, 1)
  const noRepository = run(root)
  assert.equal(noRepository.status, 1)
  assert.match(noRepository.output, /git fetch failed/)
})
