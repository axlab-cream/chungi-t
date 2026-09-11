import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(nodeScrypt)
const KEY_LENGTH = 64

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url')
  const key = await scrypt(password, salt, KEY_LENGTH) as Buffer
  return `scrypt$${salt}$${key.toString('base64url')}`
}

export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encodedKey] = stored.split('$')
  if (algorithm !== 'scrypt' || !salt || !encodedKey) return false
  try {
    const expected = Buffer.from(encodedKey, 'base64url')
    if (expected.length !== KEY_LENGTH) return false
    const actual = await scrypt(password, salt, KEY_LENGTH) as Buffer
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
