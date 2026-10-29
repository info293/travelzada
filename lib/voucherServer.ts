/**
 * Server-only: voucher claiming and notifications.
 */
import { addDoc, collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildLeadNotificationEmail, buildVoucherCodeEmail, sendMail } from '@/lib/mailer'
import { findGetGabsTemplate, isGetGabsConfigured, sendGetGabsTemplate } from '@/lib/getgabs'
import { renderVoucherImage, renderVoucherPdf, type VoucherArtworkInput } from '@/lib/voucherArtwork'
import {
  VOUCHER_CARDS_COLLECTION,
  VOUCHER_CLAIMS_COLLECTION,
  SITE_URL,
  addMonths,
  claimViewUrl,
  destinationOptions,
  formatVoucherDate,
  inr,
  normalizeCardCode,
  voucherConfig,
  type VoucherCard,
  type VoucherClaim,
} from '@/lib/vouchers'

// Created in GetGabs; body params: name, code, amount, type, min spend, book-by. URL button param: code.
export const VOUCHER_TEMPLATE = 'tz_voucher_code'
// Same body/button plus an IMAGE header showing the personal voucher
export const VOUCHER_IMAGE_TEMPLATE = 'tz_voucher_image'

export class VoucherError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

// ---------- Codes ----------

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O, 1/I/L
function randomBlock(len: number) {
  const bytes = new Uint8Array(len)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
const newClaimCode = (prefix: string) => `${prefix}-${randomBlock(4)}-${randomBlock(4)}`

// ---------- Public card lookup ----------

export async function getCard(cardCode: string) {
  const snap = await getDoc(doc(db, VOUCHER_CARDS_COLLECTION, cardCode))
  return snap.exists() ? (snap.data() as VoucherCard) : null
}

/** Why a card can't be redeemed right now, or null if it can. */
export function cardUnavailableReason(card: VoucherCard | null) {
  if (!card) return 'We could not find this voucher. Please check the code on your card.'
  if (card.status !== 'active') return 'This voucher is no longer active. Please contact Travelzada.'
  if (new Date(card.validUntil).getTime() < Date.now()) return `This voucher expired on ${formatVoucherDate(card.validUntil)}.`
  if ((card.claimCount || 0) >= (card.maxClaims || 1)) return 'This voucher has already been redeemed.'
  return null
}

// ---------- Claim ----------

export interface ClaimInput {
  cardCode: string
  name: string
  phone: string
  email: string
  destination?: string
  travelMonth?: string
  notes?: string
}

export async function claimVoucher(input: ClaimInput): Promise<{ code: string; alreadyClaimed: boolean; bookBy: string }> {
  const phone = input.phone.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
  if (!/^[6-9]\d{9}$/.test(phone)) throw new VoucherError('Please enter a valid 10-digit Indian mobile number.')
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new VoucherError('Please enter a valid email address.')
  const name = input.name.trim().slice(0, 80)
  if (name.length < 2) throw new VoucherError('Please enter your name.')

  // Same person scanning the same card again → give back their existing code
  const dup = await getDocs(
    query(collection(db, VOUCHER_CLAIMS_COLLECTION), where('cardCode', '==', input.cardCode), where('phone', '==', phone), limit(1))
  )
  if (!dup.empty) return { code: dup.docs[0].id, alreadyClaimed: true, bookBy: (dup.docs[0].data() as VoucherClaim).bookBy }

  const cardRef = doc(db, VOUCHER_CARDS_COLLECTION, input.cardCode)
  const claim = await runTransaction(db, async (tx) => {
    const cardSnap = await tx.get(cardRef)
    const card = cardSnap.exists() ? (cardSnap.data() as VoucherCard) : null
    const reason = cardUnavailableReason(card)
    if (reason || !card) throw new VoucherError(reason || 'Voucher not found.', card ? 409 : 404)

    const cfg = voucherConfig(card.type)
    let code = newClaimCode(cfg.claimPrefix)
    for (let i = 0; i < 5 && (await tx.get(doc(db, VOUCHER_CLAIMS_COLLECTION, code))).exists(); i++) code = newClaimCode(cfg.claimPrefix)

    const now = new Date()
    const claim: VoucherClaim = {
      code,
      cardCode: card.code,
      type: card.type,
      amount: cfg.amount,
      minSpend: cfg.minSpend,
      name,
      phone,
      phoneNorm: `91${phone}`,
      email,
      ...(input.destination?.trim() ? { destination: input.destination.trim().slice(0, 80) } : {}),
      ...(input.travelMonth?.trim() ? { travelMonth: input.travelMonth.trim().slice(0, 40) } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim().slice(0, 500) } : {}),
      status: 'active',
      // Card dates come from the printed "Valid until"; never later than 3/12 months from today
      bookBy: new Date(Math.min(new Date(card.validUntil).getTime(), addMonths(now, cfg.bookWithinMonths).getTime())).toISOString(),
      travelBy: card.travelUntil || cfg.travelBy,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    tx.set(doc(db, VOUCHER_CLAIMS_COLLECTION, code), claim)
    tx.update(cardRef, { claimCount: (card.claimCount || 0) + 1, lastClaimAt: now.toISOString() })
    return claim
  })

  await notifyClaim(claim)
  return { code: claim.code, alreadyClaimed: false, bookBy: claim.bookBy }
}

// ---------- Notifications ----------

/** Emails + WhatsApps the customer their code and alerts the team. Results are stored on the claim. */
export async function notifyClaim(claim: VoucherClaim, opts: { skipTeam?: boolean } = {}) {
  const cfg = voucherConfig(claim.type)
  const firstName = claim.name.split(/\s|&/)[0] || claim.name
  const notifications: Record<string, string> = { ...(claim.notifications || {}) }

  const [emailRes, waRes, teamRes] = await Promise.allSettled([
    (async () => {
      // Voucher artwork: inline image + PDF. If rendering fails, the email still goes out without them.
      const artwork = await Promise.all([renderVoucherImage(claim, 'front'), renderVoucherPdf(claim)]).catch((e) => {
        console.error('[Voucher] artwork failed', e)
        return null
      })
      const mail = buildVoucherCodeEmail({
        name: firstName,
        code: claim.code,
        typeLabel: cfg.label,
        amount: inr(claim.amount),
        minSpend: inr(claim.minSpend),
        bookBy: formatVoucherDate(claim.bookBy),
        travelBy: formatVoucherDate(claim.travelBy),
        destinations: destinationOptions(claim.type).join(', '),
        accent: cfg.theme.panel,
        viewUrl: claimViewUrl(claim.code),
        ...(artwork ? { imageCid: 'voucher-front' } : {}),
      })
      mail.to = claim.email
      if (artwork) {
        mail.attachments = [
          { filename: `Travelzada-Voucher-${claim.code}.png`, content: artwork[0], contentType: 'image/png', cid: 'voucher-front' },
          { filename: `Travelzada-Voucher-${claim.code}.pdf`, content: artwork[1], contentType: 'application/pdf' },
        ]
      }
      const id = await sendMail(mail)
      return id ? `sent${artwork ? ' (with PDF)' : ' (no PDF)'}` : 'skipped (SMTP not configured)'
    })(),
    sendVoucherWhatsApp(claim, firstName),
    opts.skipTeam
      ? Promise.resolve('skipped')
      : (async () => {
          const packageName = `Voucher claim: ${cfg.label} ${inr(claim.amount)} (${claim.code})`
          await addDoc(collection(db, 'leads'), {
            name: claim.name,
            mobile: claim.phone,
            email: claim.email,
            sourceUrl: `${SITE_URL}/voucher/${claim.cardCode}`,
            packageName,
            status: 'new',
            createdAt: serverTimestamp(),
            read: false,
          })
          await sendMail(
            buildLeadNotificationEmail({
              name: claim.name,
              mobile: claim.phone,
              email: claim.email,
              packageName,
              sourceUrl: `${SITE_URL}/admin/vouchers`,
              message: [
                `Card: ${claim.cardCode}`,
                `Personal code: ${claim.code}`,
                claim.destination && `Destination: ${claim.destination}`,
                claim.travelMonth && `When: ${claim.travelMonth}`,
                claim.notes && `Notes: ${claim.notes}`,
                `Book by: ${formatVoucherDate(claim.bookBy)}`,
                'Call within 24 hours.',
              ]
                .filter(Boolean)
                .join('\n'),
            })
          )
          return 'sent'
        })(),
  ])

  const result = (r: PromiseSettledResult<string>) => (r.status === 'fulfilled' ? r.value : `error: ${String(r.reason?.message || r.reason)}`)
  notifications.email = result(emailRes)
  notifications.whatsapp = result(waRes)
  if (!opts.skipTeam) notifications.team = result(teamRes)
  await updateDoc(doc(db, VOUCHER_CLAIMS_COLLECTION, claim.code), { notifications, updatedAt: new Date().toISOString() }).catch(() => {})
  return notifications
}

/**
 * Sent from the GetGabs number (+91 88900 59568); replies land in the GetGabs Team Inbox.
 * Uses `tz_voucher_image` (voucher picture as header) when it exists and the site is public, else `tz_voucher_code`.
 */
async function sendVoucherWhatsApp(claim: VoucherClaim, firstName: string) {
  if (!isGetGabsConfigured()) return 'skipped (GetGabs not configured)'
  const cfg = voucherConfig(claim.type)
  const params = [firstName, claim.code, inr(claim.amount), cfg.label.toLowerCase(), inr(claim.minSpend), formatVoucherDate(claim.bookBy)]
  const body = [
    { type: 'body', parameters: params.map((p) => ({ type: 'text', text: p })) },
    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: claim.code }] },
  ]

  // GetGabs/Meta download the header image from our site, so it must be publicly reachable
  const publicSite = /^https:\/\//.test(SITE_URL) && !/localhost|127\.0\.0\.1/.test(SITE_URL)
  let imageError = ''
  if (publicSite && (await findGetGabsTemplate(VOUCHER_IMAGE_TEMPLATE).catch(() => null))) {
    const link = `${SITE_URL}/api/vouchers/code/${encodeURIComponent(claim.code)}/image`
    try {
      await sendGetGabsTemplate(claim.phoneNorm, VOUCHER_IMAGE_TEMPLATE, [{ type: 'header', parameters: [{ type: 'image', image: { link } }] }, ...body])
      return 'sent (GetGabs, with voucher image)'
    } catch (e: any) {
      imageError = `; image template failed: ${e.message}` // e.g. not approved yet
    }
  }
  await sendGetGabsTemplate(claim.phoneNorm, VOUCHER_TEMPLATE, body)
  return `sent (GetGabs, text only${imageError})`
}

// ---------- Artwork ----------

export async function getClaimArtwork(code: string): Promise<VoucherArtworkInput | null> {
  const snap = await getDoc(doc(db, VOUCHER_CLAIMS_COLLECTION, normalizeCardCode(code)))
  if (!snap.exists()) return null
  const c = snap.data() as VoucherClaim
  return { code: c.code, type: c.type, name: c.name, bookBy: c.bookBy, travelBy: c.travelBy }
}

// ---------- WhatsApp template ----------

export async function getVoucherTemplateStatus() {
  const [text, image] = await Promise.all([findGetGabsTemplate(VOUCHER_TEMPLATE), findGetGabsTemplate(VOUCHER_IMAGE_TEMPLATE)])
  return { text, image }
}
