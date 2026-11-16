/**
 * Server-only: uploaded contact lists for broadcasts (whatsapp_contact_lists/{id} + contacts sub-collection),
 * and the daily safety cap for numbers that have never messaged us. Never import from client components.
 */
import { db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { BROADCASTS_COLLECTION } from '@/lib/whatsapp/broadcasts'
import {
  CONTACTS_SUBCOLLECTION,
  CONTACT_LISTS_COLLECTION,
  MAX_NEW_CONTACTS_PER_DAY,
  capDay,
  cleanColumns,
  type SheetColumn,
  type UploadContact,
} from '@/lib/whatsapp/contactLists'

export interface ContactListDoc {
  name: string
  fileName: string
  uploadedBy: { uid: string; email: string }
  createdAt: string
  counts: { rows: number; contacts: number; invalid: number; duplicates: number; messaged: number }
  columns: SheetColumn[]
}

export interface ContactRow extends UploadContact {
  contactId: string
  order: number
  lastBroadcastId?: string | null
  lastBroadcastAt?: string | null
}

export const validListId = (id?: string | null) => !!id && /^[A-Za-z0-9_-]{6,64}$/.test(id)
const listRef = (id: string) => doc(db, CONTACT_LISTS_COLLECTION, id)
const contactsCol = (id: string) => collection(db, CONTACT_LISTS_COLLECTION, id, CONTACTS_SUBCOLLECTION)

/** A saved list with its contacts (in upload order). `notSentOnly` leaves out people already messaged from it. */
export async function loadContactList(id: string, opts: { notSentOnly?: boolean } = {}): Promise<{ list: ContactListDoc; contacts: ContactRow[]; alreadyMessaged: number } | null> {
  if (!validListId(id)) return null
  const snap = await getDoc(listRef(id))
  if (!snap.exists()) return null
  const list = snap.data() as ContactListDoc
  const rows = await getDocs(query(contactsCol(id), orderBy('order')))
  let alreadyMessaged = 0
  const contacts: ContactRow[] = []
  for (const d of rows.docs) {
    const c = d.data() as Omit<ContactRow, 'contactId'>
    if (opts.notSentOnly && c.lastBroadcastId) {
      alreadyMessaged++
      continue
    }
    contacts.push({ ...c, contactId: d.id })
  }
  return { list: { ...list, columns: cleanColumns(list.columns) }, contacts, alreadyMessaged }
}

/** Save an uploaded sheet for reuse. Returns the list id and each contact's id (same order as `contacts`). */
export async function saveContactList(opts: {
  name: string
  fileName: string
  user: { uid: string; email: string }
  contacts: UploadContact[]
  columns: SheetColumn[]
  counts: { rows: number; invalid: number; duplicates: number }
}): Promise<{ id: string; contactIds: string[] }> {
  const data: ContactListDoc & Record<string, any> = {
    name: opts.name,
    fileName: opts.fileName,
    uploadedBy: { uid: opts.user.uid, email: opts.user.email },
    createdAt: new Date().toISOString(),
    createdAtTs: serverTimestamp(),
    counts: { rows: opts.counts.rows, contacts: opts.contacts.length, invalid: opts.counts.invalid, duplicates: opts.counts.duplicates, messaged: 0 },
    columns: opts.columns,
    saving: true,
  }
  const ref = await addDoc(collection(db, CONTACT_LISTS_COLLECTION), data)
  const contactIds: string[] = []
  for (let i = 0; i < opts.contacts.length; i += 400) {
    const batch = writeBatch(db)
    opts.contacts.slice(i, i + 400).forEach((c, j) => {
      const cRef = doc(contactsCol(ref.id))
      contactIds.push(cRef.id)
      batch.set(cRef, {
        order: i + j,
        name: c.name || '',
        phone: c.phone,
        ...(c.destination ? { destination: c.destination } : {}),
        ...(c.travelDate ? { travelDate: c.travelDate } : {}),
        ...(c.extra && Object.keys(c.extra).length ? { extra: c.extra } : {}),
        source: 'upload',
      })
    })
    await batch.commit()
  }
  await updateDoc(ref, { saving: false })
  return { id: ref.id, contactIds }
}

/** Remember who on the list got a broadcast (so "only people not messaged yet" works tomorrow) */
export async function markContactsQueued(listId: string, contactIds: string[], broadcastId: string) {
  const ids = contactIds.filter(Boolean)
  if (!ids.length) return
  const at = new Date().toISOString()
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db)
    ids.slice(i, i + 400).forEach((cid) => batch.update(doc(contactsCol(listId), cid), { lastBroadcastId: broadcastId, lastBroadcastAt: at }))
    await batch.commit()
  }
  await updateDoc(listRef(listId), { 'counts.messaged': increment(ids.length), lastUsedAt: at })
}

/** A broadcast was cancelled: people it never messaged count as "not messaged yet" on their list again */
export async function unmarkContacts(listId: string, contactIds: string[], broadcastId: string) {
  if (!validListId(listId)) return
  let n = 0
  for (let i = 0; i < contactIds.length; i += 400) {
    const batch = writeBatch(db)
    let any = false
    for (const cid of contactIds.slice(i, i + 400)) {
      const ref = doc(contactsCol(listId), cid)
      const snap = await getDoc(ref)
      if (snap.exists() && (snap.data() as any).lastBroadcastId === broadcastId) {
        batch.update(ref, { lastBroadcastId: null, lastBroadcastAt: null })
        any = true
        n++
      }
    }
    if (any) await batch.commit()
  }
  if (n) await updateDoc(listRef(listId), { 'counts.messaged': increment(-n) })
}

/** Saved lists, newest first (no numbers) */
export async function listContactLists(max = 50) {
  const snap = await getDocs(query(collection(db, CONTACT_LISTS_COLLECTION), orderBy('createdAt', 'desc'), limit(max)))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ContactListDoc & { saving?: boolean; lastUsedAt?: string }) }))
    .filter((l) => !l.saving)
    .map((l) => ({
      id: l.id,
      name: l.name,
      fileName: l.fileName,
      createdAt: l.createdAt,
      uploadedBy: l.uploadedBy?.email || '',
      count: l.counts?.contacts || 0,
      messaged: l.counts?.messaged || 0,
      columns: cleanColumns(l.columns),
      lastUsedAt: l.lastUsedAt || null,
    }))
}

/* ------------------------------------------------------------------------------------------------
 * Daily cap for numbers that have never messaged us
 * ---------------------------------------------------------------------------------------------- */

/** Numbers (normalised, = whatsapp_chats ids) that have a chat with at least one inbound message */
export async function phonesThatMessagedUs(phones: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  const unique = Array.from(new Set(phones.filter(Boolean)))
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30))
  // A few `in` queries at a time (≤ 30 ids each)
  for (let i = 0; i < chunks.length; i += 6) {
    const snaps = await Promise.all(chunks.slice(i, i + 6).map((ids) => getDocs(query(collection(db, 'whatsapp_chats'), where(documentId(), 'in', ids)))))
    for (const s of snaps) for (const d of s.docs) if ((d.data() as any)?.lastInboundAt) out.add(d.id)
  }
  return out
}

/** New (never-messaged-us) contacts already used today by list broadcasts, all staff together */
export async function newContactsUsedToday(day = capDay()): Promise<number> {
  const snap = await getDocs(query(collection(db, BROADCASTS_COLLECTION), where('capDay', '==', day)))
  let used = 0
  for (const d of snap.docs) {
    const b = d.data() as any
    // A broadcast cancelled before anything went out doesn't use up the day's allowance
    if (b.status === 'cancelled' && !(b.counts?.sent > 0) && !(b.counts?.failed > 0)) continue
    used += Number(b.newContacts) || 0
  }
  return used
}

export interface DailyCapInfo {
  cap: number
  usedToday: number
  left: number
  /** In this audience: people who never messaged us */
  newInAudience: number
}

export async function dailyCapInfo(phones: string[]): Promise<DailyCapInfo & { known: Set<string> }> {
  const [known, usedToday] = await Promise.all([phonesThatMessagedUs(phones), newContactsUsedToday()])
  const newInAudience = phones.filter((p) => !known.has(p)).length
  return { cap: MAX_NEW_CONTACTS_PER_DAY, usedToday, left: Math.max(0, MAX_NEW_CONTACTS_PER_DAY - usedToday), newInAudience, known }
}
