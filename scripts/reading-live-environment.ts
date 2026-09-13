const APPROVED_LIVE_CHECK_ENV = new Set([
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'REPORT_OPENAI_MODEL',
  'OPENAI_REASONING_EFFORT',
])

const CREDENTIAL_OR_INTEGRATION_ENV = /(?:^|_)(?:API_?KEY|KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD|CREDENTIALS?|OPENAI|ANTHROPIC|DATABASE|SUPABASE|INICIS|PAYMENT|VERCEL|PUNGSU|GOOGLE_PLAY|GITHUB|GITLAB|AWS|AZURE)(?:_|$)/i

/** Keep ordinary process/runtime settings, but remove every credential or live
 * integration setting except the one provider and model settings this synthetic
 * harness is explicitly allowed to use. */
export function isolateLiveCheckEnvironment(env: NodeJS.ProcessEnv): void {
  for (const name of Object.keys(env)) {
    if (CREDENTIAL_OR_INTEGRATION_ENV.test(name) && !APPROVED_LIVE_CHECK_ENV.has(name)) delete env[name]
  }
}
