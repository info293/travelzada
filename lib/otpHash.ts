/**
 * Email OTP codes are stored as a keyed hash, never in plain text: the `email_otps` collection is readable with the
 * public web config, so a stored plain code would let anyone pass email verification for any address.
 * Server-only (uses Node crypto + a server secret).
 */
import { createHmac, randomInt, timingSafeEqual } from 'crypto'

/** Server-only secret. Set OTP_HASH_SECRET in the environment; falls back to another server-only key. */
function secret(): string {
  const s = process.env.OTP_HASH_SECRET || process.env.IMAGEKIT_PRIVATE_KEY || process.env.GETGABS_WEBHOOK_SECRET || ''
  if (!s) console.warn('[otp] OTP_HASH_SECRET is not set — set it in the environment')
  return s || 'travelzada-otp-fallback'
}

/** Cryptographically random 6-digit code */
export const generateOtp = () => String(randomInt(100000, 1000000))

export const hashOtp = (email: string, otp: string) =>
  createHmac('sha256', secret()).update(`${email.trim().toLowerCase()}:${otp.trim()}`).digest('hex')

/** Constant-time check of a submitted code against the stored hash */
export function otpMatches(email: string, submitted: string, storedHash: unknown): boolean {
  if (typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/.test(storedHash)) return false
  const a = Buffer.from(hashOtp(email, submitted), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
