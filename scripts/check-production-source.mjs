import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const manualNotice = 'Manual preflight only: this command does not intercept other deploys or verify a remote deployment artifact. Run it immediately before deployment and again before promotion.'

function git(cwd, args, allowedStatuses = [0]) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
    windowsHide: true,
  })
  if (result.error || !allowedStatuses.includes(result.status)) {
    // Git's stderr can contain credential-bearing remote URLs. Do not echo it.
    const reason = result.error?.code || (result.signal ? 'interrupted' : `exit ${result.status}`)
    throw new Error(`git ${args[0]} failed (${reason}). No deployment is authorized by this check; verify Git access and retry.`)
  }
  return { status: result.status, stdout: result.stdout.trim() }
}

export function validateProductionSource({ head, main, status, mainIsAncestor, expectedHead }) {
  const problems = []
  if (status) problems.push('Working tree is not clean: commit or remove intended tracked/untracked changes before deployment. Git-ignored files are outside this check.')
  if (!mainIsAncestor) problems.push('HEAD does not contain the freshly fetched origin/main. Integrate the latest remote main before deployment; the local main branch is not used.')
  if (expectedHead && head.toLowerCase() !== expectedHead.toLowerCase()) problems.push('HEAD differs from --expected-head. Do not promote an artifact built from another commit.')
  return { head, main, passed: problems.length === 0, problems }
}

export function checkProductionSource({ cwd = process.cwd(), expectedHead } = {}) {
  if (expectedHead && !/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(expectedHead)) {
    throw new Error('--expected-head must be a full 40- or 64-character Git commit hash, not a branch name or abbreviated hash.')
  }

  // An explicit refspec refreshes origin/main even with a custom remote.fetch
  // configuration. Fetch changes Git refs only; it never merges or checks out files.
  git(cwd, ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'])
  const head = git(cwd, ['rev-parse', '--verify', 'HEAD^{commit}']).stdout
  const main = git(cwd, ['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}']).stdout
  const status = git(cwd, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none']).stdout
  const mainIsAncestor = git(cwd, ['merge-base', '--is-ancestor', main, head], [0, 1]).status === 0
  const checked = validateProductionSource({ head, main, status, mainIsAncestor, expectedHead })

  if (git(cwd, ['rev-parse', '--verify', 'HEAD^{commit}']).stdout !== head ||
      git(cwd, ['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}']).stdout !== main) {
    checked.passed = false
    checked.problems.push('Git refs changed during the check. Stop concurrent Git/deploy work and retry.')
  }
  return checked
}

function main(args) {
  console.log(`[production-source] ${manualNotice}`)
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: npm run check:production-source -- [--expected-head=<full-commit-hash>]')
    console.log('Refreshes origin/main, requires a clean tracked/untracked working tree, and requires origin/main to be an ancestor of HEAD. Does not deploy, merge, or change project configuration.')
    console.log('For promotion, also verify the deployment metadata identifies the same checked HEAD. This check alone does not inspect the deployment artifact or lock out concurrent changes.')
    return
  }
  if (args.length > 1 || (args.length === 1 && !args[0].startsWith('--expected-head='))) {
    throw new Error('Unknown or repeated argument. Use --help for supported options.')
  }
  const expectedHead = args[0]?.slice('--expected-head='.length)
  if (args.length && !expectedHead) throw new Error('--expected-head requires a full commit hash.')
  const result = checkProductionSource({ expectedHead })
  console.log(`[production-source] HEAD=${result.head}`)
  console.log(`[production-source] origin/main=${result.main}`)
  if (expectedHead) console.log(`[production-source] expected-head=${expectedHead.toLowerCase()}`)
  if (!result.passed) {
    for (const problem of result.problems) console.error(`[production-source] BLOCKED: ${problem}`)
    process.exitCode = 1
    return
  }
  console.log('[production-source] PASS: clean source includes the current remote main. Recheck immediately before promotion with this HEAD pinned.')
}

// Importing this module must never fetch or run the command.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(`[production-source] BLOCKED: ${error instanceof Error ? error.message : 'Unexpected Git check failure.'}`)
    process.exitCode = 1
  }
}
