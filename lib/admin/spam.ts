/**
 * Spam detection for Contact Us messages (`contact_messages`).
 *
 * Bots fill the form with random strings: a single-word name like "ohDnnjZicOQEdvJxniz" and a message that is
 * another random string ("lfxxTkOeSRVePuyfi") or a bare 10-digit number. Real people write names with spaces /
 * normal casing ("Priya Sharma", "RAVI KUMAR") and messages with words.
 *
 * Deliberately conservative: a message is spam only when the NAME looks random AND the message is empty, random,
 * or just digits — or when name/message are both single CamelCase-flipping tokens. A real name never gets flagged
 * just because the message is short. Safe on client and server (no Firebase imports).
 */
import { textGibberish } from '@/lib/admin/botDetection'
import { looksLikeGibberish } from '@/lib/spamGuard'

export interface ContactLike {
  name?: string | null
  message?: string | null
  email?: string | null
}

/** One token of 8+ letters that flips upper/lower case 3+ times inside the word ("TVCsDpGkeERSSKmax"). */
const randomCaseToken = (t: string): boolean => {
  const s = t.trim()
  if (!/^[A-Za-z]{8,}$/.test(s)) return false
  const flips = (s.match(/[a-z][A-Z]/g) || []).length
  return flips >= 3
}

/** The text looks machine-generated (random letters). */
export const isRandomText = (t?: string | null): boolean => {
  const s = String(t || '').trim()
  if (!s) return false
  return looksLikeGibberish(s) || randomCaseToken(s) || (!/\s/.test(s) && s.length >= 8 && textGibberish(s))
}

/** Message carries no words at all: only digits / punctuation (bots paste a random phone number). */
const noWords = (t?: string | null): boolean => {
  const s = String(t || '').trim()
  return !s || /^[\d\s+\-().]+$/.test(s)
}

/** Why a message counts as spam ('' when it looks human). */
export function spamReason(m: ContactLike): string {
  const name = String(m.name || '').trim()
  const message = String(m.message || '').trim()
  if (!isRandomText(name)) {
    // Weaker name signal ("RCQEDHRINEgYOFHabo": one long token with a lower→upper flip) only counts when the
    // message is itself clearly random — "McDonald" + a real message stays human.
    const oddName = /^[A-Za-z]{10,}$/.test(name) && /[a-z][A-Z]/.test(name)
    return oddName && isRandomText(message) ? 'random name + random message' : ''
  }
  if (noWords(message)) return message ? 'random name + number-only message' : 'random name, empty message'
  if (isRandomText(message)) return 'random name + random message'
  if (name === message) return 'name repeated as message'
  return ''
}

export const isSpamContact = (m: ContactLike): boolean => spamReason(m) !== ''
