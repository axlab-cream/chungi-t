import { config } from 'dotenv'

const isNodeTest = process.env.NODE_ENV === 'test'
  || process.env.npm_lifecycle_event === 'test'
  || process.argv.includes('--test')

if (!isNodeTest) {
  config()
  config({ path: '.env.local', override: true })
}
